import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getAuth } from '../utils/Auth'
import {
  getMyNotificationsApi,
  markAsReadApi,
  markAllAsReadApi
} from '../services/api/NotificationApi'
import StompService from '../services/websocket/StompService'
import { toast } from 'react-toastify'

const NotificationContext = createContext()

// Helper functions for persistent read notification tracking
const getLocalReadSet = () => {
  try {
    const currentUser = getAuth()?.user
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch (e) {
    return new Set()
  }
}

const addLocalReadId = (id) => {
  if (id === undefined || id === null) return

  try {
    const currentUser = getAuth()?.user
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`
    const set = getLocalReadSet()
    set.add(String(id))
    localStorage.setItem(key, JSON.stringify(Array.from(set)))
  } catch (e) {
    // Local persistence is best-effort only.
  }
}

const addAllLocalReadIds = (ids = []) => {
  try {
    const currentUser = getAuth()?.user
    const key = `comiverse_read_notif_ids_${currentUser?.id || currentUser?.username || 'all'}`
    const set = getLocalReadSet()

    ids.forEach((id) => {
      if (id !== undefined && id !== null) {
        set.add(String(id))
      }
    })

    localStorage.setItem(key, JSON.stringify(Array.from(set)))
  } catch (e) {
    // Local persistence is best-effort only.
  }
}

export function NotificationProvider({ children }) {
  const { isLoggedIn, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Keep the latest user without making callbacks/effects depend on the whole user object.
  const userRef = useRef(user)
  const notificationsRef = useRef([])
  const notificationIdsRef = useRef(new Set())
  const recentNotiKeysRef = useRef(new Set())
  const recentNotiTimeoutsRef = useRef(new Map())

  const storedUser = getAuth()?.user
  const currentUserId = user?.id || user?.userId || storedUser?.id || storedUser?.userId || null

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    notificationsRef.current = notifications
    notificationIdsRef.current = new Set(
      notifications
        .filter((noti) => noti?.id !== undefined && noti?.id !== null)
        .map((noti) => String(noti.id))
    )
  }, [notifications])

  const isForCurrentUser = useCallback((noti) => {
    if (!noti) return false

    const currentUser = getAuth()?.user || userRef.current
    if (!currentUser) return false

    const curId = String(currentUser.id || currentUser.userId || '').toLowerCase().trim()
    const curUsername = String(currentUser.username || '').toLowerCase().trim()
    const curFullName = String(currentUser.fullName || '').toLowerCase().trim()
    const curEmail = String(currentUser.email || '').toLowerCase().trim()

    const targetId = String(noti.targetUserId || noti.userId || noti.recipientId || '').toLowerCase().trim()
    const targetUsername = String(noti.targetUsername || noti.username || '').toLowerCase().trim()
    const targetName = String(noti.targetName || noti.fullName || noti.name || '').toLowerCase().trim()
    const targetEmail = String(noti.targetEmail || noti.email || noti.userEmail || '').toLowerCase().trim()

    // When a target is present, it must match the current account.
    if (targetId || targetUsername || targetName || targetEmail) {
      return Boolean(
        (targetId && (targetId === curId || targetId === curUsername)) ||
        (targetUsername && (targetUsername === curUsername || targetUsername === curId)) ||
        (targetName && (targetName === curFullName || targetName === curUsername)) ||
        (targetEmail && targetEmail === curEmail)
      )
    }

    // Notifications without a target are treated as broadcast notifications.
    return true
  }, [])

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return

    setLoading(true)

    try {
      const res = await getMyNotificationsApi()
      const data = res?.data || res || []
      const serverNotifications = Array.isArray(data) ? data : []

      // Load user-specific local notifications only.
      const currentUser = getAuth()?.user || userRef.current
      const curId = currentUser?.id
      const curUsername = currentUser?.username
      const curFullName = currentUser?.fullName

      const localNotifs = []
      const userKeys = [
        curId ? `comiverse_user_notifications_${curId}` : null,
        curUsername ? `comiverse_user_notifications_${curUsername}` : null,
        curFullName ? `comiverse_user_notifications_${curFullName}` : null
      ].filter(Boolean)

      userKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) return

          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            localNotifs.push(...parsed)
          }
        } catch (e) {
          // Ignore a malformed local cache entry and continue with server data.
        }
      })

      const readSet = getLocalReadSet()
      const notifMap = new Map()
      const combinedNotifications = [...localNotifs, ...serverNotifications]

      combinedNotifications.forEach((noti) => {
        if (!noti || noti.id === undefined || noti.id === null) return
        if (!isForCurrentUser(noti)) return

        const idKey = String(noti.id)
        if (notifMap.has(idKey)) return

        notifMap.set(idKey, {
          ...noti,
          isRead: Boolean(noti.isRead || readSet.has(idKey))
        })
      })

      const nextNotifications = Array.from(notifMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.time || 0)
        const dateB = new Date(b.createdAt || b.time || 0)
        return dateB - dateA
      })

      notificationsRef.current = nextNotifications
      notificationIdsRef.current = new Set(nextNotifications.map((noti) => String(noti.id)))
      setNotifications(nextNotifications)
      setUnreadCount(nextNotifications.filter((noti) => !noti.isRead).length)
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to load notifications:', err?.message)
      }
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, isForCurrentUser])

  const handleWsMessage = useCallback((msg) => {
    if (!msg) return

    const newNoti = typeof msg === 'object'
      ? msg
      : { message: String(msg) }

    if (!isForCurrentUser(newNoti)) return

    const notiKey = String(
      newNoti.id ||
      `${newNoti.title || ''}_${newNoti.message || ''}_${newNoti.createdAt || ''}`
    )

    // The backend may send the same notification to more than one compatible topic.
    // Ignore duplicates received in a short time window.
    if (recentNotiKeysRef.current.has(notiKey)) return

    recentNotiKeysRef.current.add(notiKey)

    const previousTimeout = recentNotiTimeoutsRef.current.get(notiKey)
    if (previousTimeout) {
      window.clearTimeout(previousTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      recentNotiKeysRef.current.delete(notiKey)
      recentNotiTimeoutsRef.current.delete(notiKey)
    }, 5000)

    recentNotiTimeoutsRef.current.set(notiKey, timeoutId)

    if (newNoti.id !== undefined && newNoti.id !== null) {
      const idKey = String(newNoti.id)
      if (notificationIdsRef.current.has(idKey)) return
      notificationIdsRef.current.add(idKey)
    }

    notificationsRef.current = [newNoti, ...notificationsRef.current]
    setNotifications((previous) => [newNoti, ...previous])

    if (!newNoti.isRead) {
      setUnreadCount((previous) => previous + 1)
    }

    const toastText = newNoti.title
      ? `${newNoti.title}: ${newNoti.message || ''}`
      : (newNoti.message || 'You have a new notification!')

    toast.info(toastText, {
      toastId: `noti-${notiKey}`,
      position: 'top-right',
      autoClose: 4000
    })
  }, [isForCurrentUser])

  const markAsRead = useCallback(async (id) => {
    if (id === undefined || id === null) return

    addLocalReadId(id)

    try {
      const currentUser = getAuth()?.user || userRef.current
      const userKey = `comiverse_user_notifications_${currentUser?.id || currentUser?.username || 'all'}`
      const rawUser = localStorage.getItem(userKey)

      if (rawUser) {
        const userArr = JSON.parse(rawUser)
        const updated = userArr.map((noti) =>
          String(noti.id) === String(id)
            ? { ...noti, isRead: true }
            : noti
        )
        localStorage.setItem(userKey, JSON.stringify(updated))
      }
    } catch (e) {
      // Keep optimistic React state even if local cache cannot be updated.
    }

    const existingNotification = notificationsRef.current.find(
      (noti) => String(noti.id) === String(id)
    )
    const changedFromUnread = Boolean(existingNotification && !existingNotification.isRead)

    notificationsRef.current = notificationsRef.current.map((noti) =>
      String(noti.id) === String(id)
        ? { ...noti, isRead: true }
        : noti
    )

    setNotifications((previous) => previous.map((noti) =>
      String(noti.id) === String(id)
        ? { ...noti, isRead: true }
        : noti
    ))

    if (changedFromUnread) {
      setUnreadCount((previous) => Math.max(0, previous - 1))
    }

    try {
      await markAsReadApi(id)
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark notification as read on server (preserved local read status):', err?.message)
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const allIds = notificationsRef.current.map((noti) => noti.id)
    addAllLocalReadIds(allIds)

    try {
      const currentUser = getAuth()?.user || userRef.current
      const userKey = `comiverse_user_notifications_${currentUser?.id || currentUser?.username || 'all'}`
      const rawUser = localStorage.getItem(userKey)

      if (rawUser) {
        const userArr = JSON.parse(rawUser)
        const updated = userArr.map((noti) => ({ ...noti, isRead: true }))
        localStorage.setItem(userKey, JSON.stringify(updated))
      }
    } catch (e) {
      // Keep optimistic React state even if local cache cannot be updated.
    }

    notificationsRef.current = notificationsRef.current.map((noti) => ({ ...noti, isRead: true }))
    setNotifications((previous) => previous.map((noti) => ({ ...noti, isRead: true })))
    setUnreadCount(0)

    try {
      await markAllAsReadApi()
    } catch (err) {
      const status = err?.response?.status
      if (status !== 401 && status !== 502 && status !== 504 && err?.code !== 'ECONNABORTED') {
        console.warn('Failed to mark all notifications as read on server (preserved local read status):', err?.message)
      }
    }
  }, [])

  // Initial load, polling and browser refresh events.
  // Kept separate from WebSocket setup so a data refresh never recreates STOMP subscriptions.
  useEffect(() => {
    if (!isLoggedIn) return undefined

    loadNotifications()

    const pollInterval = window.setInterval(loadNotifications, 30000)
    const handleRefresh = () => loadNotifications()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications()
      }
    }

    window.addEventListener('focus', handleRefresh)
    window.addEventListener('notification:refresh', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(pollInterval)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('notification:refresh', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoggedIn, loadNotifications])

  // WebSocket lifecycle. Dependencies are primitives/stable callbacks only.
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([])
      setUnreadCount(0)
      notificationsRef.current = []
      notificationIdsRef.current.clear()
      recentNotiKeysRef.current.clear()

      recentNotiTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      recentNotiTimeoutsRef.current.clear()

      StompService.disconnect()
      return undefined
    }

    const topicsToSubscribe = [
      '/topic/notifications',
      '/user/queue/notifications'
    ]

    // Keep backward compatibility while the backend may still publish to this destination.
    if (currentUserId) {
      topicsToSubscribe.push(`/topic/notifications/${currentUserId}`)
    }

    StompService.connect()
    topicsToSubscribe.forEach((topic) => {
      StompService.subscribe(topic, handleWsMessage)
    })

    return () => {
      topicsToSubscribe.forEach((topic) => {
        StompService.unsubscribe(topic)
      })
    }
  }, [isLoggedIn, currentUserId, handleWsMessage])

  // Clear pending deduplication timers only when the provider itself unmounts.
  useEffect(() => () => {
    recentNotiTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId)
    })
    recentNotiTimeoutsRef.current.clear()
    recentNotiKeysRef.current.clear()
  }, [])

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
