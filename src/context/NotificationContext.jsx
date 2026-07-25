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

export function NotificationProvider({ children }) {
  const { isLoggedIn, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const recentNotiKeysRef = useRef(new Set())

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return
    setLoading(true)
    try {
      const res = await getMyNotificationsApi()
      const data = res?.data || res || []
      const serverNotifications = Array.isArray(data) ? data : []

      // Load local notifications (e.g. Project Leader assignments)
      const currentUser = getAuth()?.user;
      const userKey = `comiverse_user_notifications_${currentUser?.id || currentUser?.username || 'all'}`;
      let localNotifs = [];
      try {
        const rawUser = localStorage.getItem(userKey);
        const rawAll = localStorage.getItem('comiverse_user_notifications_all');
        const userArr = rawUser ? JSON.parse(rawUser) : [];
        const allArr = rawAll ? JSON.parse(rawAll) : [];
        localNotifs = [...userArr, ...allArr];
      } catch (e) {}

      // Deduplicate by ID
      const notifMap = new Map();
      [...localNotifs, ...serverNotifications].forEach(n => {
        if (n && n.id && !notifMap.has(n.id)) notifMap.set(n.id, n);
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
  }, [isLoggedIn])

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await markAsReadApi(id)
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark notification as read on server:', err?.message)
      }
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await markAllAsReadApi()
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark all notifications as read on server:', err?.message)
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
