import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
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
      const nextNotifications = Array.isArray(data) ? data : []
      setNotifications(nextNotifications)

      try {
        const countRes = await getUnreadCountApi()
        setUnreadCount(Number(countRes?.data ?? countRes ?? 0))
      } catch (countError) {
        const status = countError?.response?.status
        if (status !== 401 && status !== 502 && status !== 504 && countError?.code !== 'ECONNABORTED') {
          console.warn('Failed to load unread notification count:', countError?.message)
        }
        setUnreadCount(nextNotifications.filter(notification => !notification.isRead).length)
      }
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
    try {
      await markAsReadApi(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await markAllAsReadApi()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
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
