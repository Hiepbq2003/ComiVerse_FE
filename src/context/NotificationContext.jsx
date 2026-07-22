import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  getMyNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi
} from '../services/api/NotificationApi'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

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
        console.error('Failed to load unread notification count:', countError)
        setUnreadCount(nextNotifications.filter(notification => !notification.isRead).length)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
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
      const pollInterval = window.setInterval(loadNotifications, 10000)
      const handleRefresh = () => loadNotifications()
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') loadNotifications()
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
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
    return undefined
  }, [isLoggedIn, loadNotifications])

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
