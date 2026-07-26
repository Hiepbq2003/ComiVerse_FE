import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getAuth } from '../utils/Auth'
import {
  getMyNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi
} from '../services/api/NotificationApi'
import StompService from '../services/websocket/StompService'
import { toast } from 'react-toastify'

const NotificationContext = createContext()

// Helper functions for persistent read notification tracking
const getLocalReadSet = () => {
  try {
    const currentUser = getAuth()?.user;
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`;
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch (e) {
    return new Set();
  }
};

const addLocalReadId = (id) => {
  if (id === undefined || id === null) return;
  try {
    const currentUser = getAuth()?.user;
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`;
    const set = getLocalReadSet();
    set.add(String(id));
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

const addAllLocalReadIds = (ids = []) => {
  try {
    const currentUser = getAuth()?.user;
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`;
    const set = getLocalReadSet();
    ids.forEach(id => { if (id !== undefined && id !== null) set.add(String(id)); });
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

export function NotificationProvider({ children }) {
  const { isLoggedIn, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const recentNotiKeysRef = useRef(new Set())

  const isForCurrentUser = useCallback((noti) => {
    if (!noti) return false;
    const currentUser = getAuth()?.user || user;
    if (!currentUser) return false;

    const curId = String(currentUser.id || currentUser.userId || '').toLowerCase().trim();
    const curUsername = String(currentUser.username || '').toLowerCase().trim();
    const curFullName = String(currentUser.fullName || '').toLowerCase().trim();
    const curEmail = String(currentUser.email || '').toLowerCase().trim();

    const targetId = String(noti.targetUserId || noti.userId || noti.recipientId || '').toLowerCase().trim();
    const targetUsername = String(noti.targetUsername || noti.username || '').toLowerCase().trim();
    const targetName = String(noti.targetName || noti.fullName || noti.name || '').toLowerCase().trim();
    const targetEmail = String(noti.targetEmail || noti.email || noti.userEmail || '').toLowerCase().trim();

    // If the notification explicitly specifies a target user, ensure it matches current user!
    if (targetId || targetUsername || targetName || targetEmail) {
      const isMatch =
        (targetId && (targetId === curId || targetId === curUsername)) ||
        (targetUsername && (targetUsername === curUsername || targetUsername === curId)) ||
        (targetName && (targetName === curFullName || targetName === curUsername)) ||
        (targetEmail && targetEmail === curEmail);

      return isMatch;
    }

    return true;
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return
    setLoading(true)
    try {
      const res = await getMyNotificationsApi()
      const data = res?.data || res || []
      const serverNotifications = Array.isArray(data) ? data : []

      // Load user-specific local notifications ONLY
      const currentUser = getAuth()?.user || user;
      const curId = currentUser?.id;
      const curUsername = currentUser?.username;
      const curFullName = currentUser?.fullName;
      
      let localNotifs = [];
      const userKeys = [
        curId ? `comiverse_user_notifications_${curId}` : null,
        curUsername ? `comiverse_user_notifications_${curUsername}` : null,
        curFullName ? `comiverse_user_notifications_${curFullName}` : null,
      ].filter(Boolean);

      userKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localNotifs.push(...parsed);
          }
        } catch (e) {}
      });

      // Retrieve persistent set of read notification IDs
      const readSet = getLocalReadSet();

      // Deduplicate by ID and apply local read status override & strict account isolation
      const notifMap = new Map();
      [...localNotifs, ...serverNotifications].forEach(n => {
        if (n && n.id !== undefined && n.id !== null && isForCurrentUser(n) && !notifMap.has(n.id)) {
          const isReadLocally = readSet.has(String(n.id));
          notifMap.set(n.id, {
            ...n,
            isRead: Boolean(n.isRead || isReadLocally)
          });
        }
      });

      const nextNotifications = Array.from(notifMap.values()).sort((a, b) => {
        const da = new Date(a.createdAt || a.time || 0);
        const db = new Date(b.createdAt || b.time || 0);
        return db - da;
      });

      setNotifications(nextNotifications)
      setUnreadCount(nextNotifications.filter(n => !n.isRead).length)
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to load notifications:', err?.message)
      }
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, user, isForCurrentUser])

  const markAsRead = async (id) => {
    if (id === undefined || id === null) return;

    // 1. Immediately persist read ID to LocalStorage so polling / re-fetches never revert it
    addLocalReadId(id);

    // 2. Also update local notifications in LocalStorage if it exists there
    try {
      const currentUser = getAuth()?.user;
      const userKey = `comiverse_user_notifications_${currentUser?.id || currentUser?.username || 'all'}`;
      const rawUser = localStorage.getItem(userKey);
      if (rawUser) {
        const userArr = JSON.parse(rawUser);
        const updated = userArr.map(n => String(n.id) === String(id) ? { ...n, isRead: true } : n);
        localStorage.setItem(userKey, JSON.stringify(updated));
      }
    } catch (e) {}

    // 3. Update React state optimistically
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // 4. Try updating server API
    try {
      await markAsReadApi(id);
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark notification as read on server (preserved local read status):', err?.message)
      }
    }
  }

  const markAllAsRead = async () => {
    const allIds = notifications.map(n => n.id);
    addAllLocalReadIds(allIds);

    try {
      const currentUser = getAuth()?.user;
      const userKey = `comiverse_user_notifications_${currentUser?.id || currentUser?.username || 'all'}`;
      const rawUser = localStorage.getItem(userKey);
      if (rawUser) {
        const userArr = JSON.parse(rawUser);
        const updated = userArr.map(n => ({ ...n, isRead: true }));
        localStorage.setItem(userKey, JSON.stringify(updated));
      }
    } catch (e) {}

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      await markAllAsReadApi()
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark all notifications as read on server (preserved local read status):', err?.message)
      }
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications()
      const pollInterval = window.setInterval(loadNotifications, 30000)
      const handleRefresh = () => loadNotifications()
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') loadNotifications()
      }

      window.addEventListener('focus', handleRefresh)
      window.addEventListener('notification:refresh', handleRefresh)
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Setup WebSocket STOMP for Real-time Notifications
      const userId = user?.id || user?.userId
      const topicsToSubscribe = ['/topic/notifications', '/user/queue/notifications']
      if (userId) {
        topicsToSubscribe.push(`/topic/notifications/${userId}`)
      }

      const handleWsMessage = (msg) => {
        if (!msg) return
        const newNoti = typeof msg === 'object' ? msg : { message: String(msg) }

        // Strict check: Only process if notification is intended for current logged in user
        if (!isForCurrentUser(newNoti)) return;

        const notiKey = newNoti.id || `${newNoti.title || ''}_${newNoti.message || ''}_${newNoti.createdAt || ''}`

        if (recentNotiKeysRef.current.has(notiKey)) {
          return
        }
        recentNotiKeysRef.current.add(notiKey)
        setTimeout(() => {
          recentNotiKeysRef.current.delete(notiKey)
        }, 5000)

        setNotifications(prev => {
          if (newNoti.id && prev.some(item => item.id === newNoti.id)) {
            return prev
          }
          return [newNoti, ...prev]
        })
        setUnreadCount(prev => prev + 1)
        const toastText = newNoti.title
          ? `${newNoti.title}: ${newNoti.message || ''}`
          : (newNoti.message || 'You have a new notification!')
        toast.info(toastText, {
          toastId: `noti-${notiKey}`,
          position: 'top-right',
          autoClose: 4000
        })
      }

      StompService.connect()
      topicsToSubscribe.forEach(topic => {
        StompService.subscribe(topic, handleWsMessage)
      })

      return () => {
        window.clearInterval(pollInterval)
        window.removeEventListener('focus', handleRefresh)
        window.removeEventListener('notification:refresh', handleRefresh)
        document.removeEventListener('visibilitychange', handleVisibilityChange)

        topicsToSubscribe.forEach(topic => {
          StompService.unsubscribe(topic)
        })
      }
    } else {
      setNotifications([])
      setUnreadCount(0)
      StompService.disconnect()
    }
    return undefined
  }, [isLoggedIn, user?.id, loadNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      loadNotifications,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
