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
      setNotifications(data)

      const countRes = await getUnreadCountApi()
      setUnreadCount(countRes?.data ?? countRes ?? 0)
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
      const interval = window.setInterval(loadNotifications, 30000)
      return () => window.clearInterval(interval)
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
