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
      
      const auth = JSON.parse(localStorage.getItem('auth') || 'null')
      const fullName = auth?.user?.fullName || ''
      const username = auth?.user?.username || ''
      const userId = auth?.user?.id || auth?.user?.userId || ''
      const email = auth?.user?.email || ''

      const isUserMatch = (recipient) => {
        if (!recipient) return false
        const recLower = String(recipient).trim().toLowerCase()
        return (
          (fullName && recLower === fullName.trim().toLowerCase()) ||
          (username && recLower === username.trim().toLowerCase()) ||
          (userId && String(recipient).trim() === String(userId).trim()) ||
          (email && recLower === email.trim().toLowerCase())
        )
      }

      const allForumNotifs = JSON.parse(localStorage.getItem('comiverse_forum_notifications') || '[]')
      const forumNotifs = allForumNotifs.filter(n => isUserMatch(n.recipient))

      const merged = [...forumNotifs, ...data]
      setNotifications(merged)

      const localUnread = forumNotifs.filter(n => !n.isRead).length
      const countRes = await getUnreadCountApi()
      const apiUnread = countRes?.data ?? countRes ?? 0
      setUnreadCount(apiUnread + localUnread)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  const markAsRead = async (id) => {
    try {
      if (String(id).startsWith('forum-')) {
        const forumNotifs = JSON.parse(localStorage.getItem('comiverse_forum_notifications') || '[]')
        const updated = forumNotifs.map(n => n.id === id ? { ...n, isRead: true } : n)
        localStorage.setItem('comiverse_forum_notifications', JSON.stringify(updated))
        
        const notif = forumNotifs.find(n => n.id === id)
        if (notif?.targetUrl) {
          window.location.href = notif.targetUrl
        }
        
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        await markAsReadApi(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || 'null')
      const fullName = auth?.user?.fullName || ''
      const username = auth?.user?.username || ''
      const userId = auth?.user?.id || auth?.user?.userId || ''
      const email = auth?.user?.email || ''

      const isUserMatch = (recipient) => {
        if (!recipient) return false
        const recLower = String(recipient).trim().toLowerCase()
        return (
          (fullName && recLower === fullName.trim().toLowerCase()) ||
          (username && recLower === username.trim().toLowerCase()) ||
          (userId && String(recipient).trim() === String(userId).trim()) ||
          (email && recLower === email.trim().toLowerCase())
        )
      }

      const forumNotifs = JSON.parse(localStorage.getItem('comiverse_forum_notifications') || '[]')
      const updated = forumNotifs.map(n => isUserMatch(n.recipient) ? { ...n, isRead: true } : n)
      localStorage.setItem('comiverse_forum_notifications', JSON.stringify(updated))

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
      
      const handleUpdate = () => {
        loadNotifications()
      }

      const pollInterval = setInterval(() => {
        loadNotifications()
      }, 4000)

      window.addEventListener('forum_notification_update', handleUpdate)
      window.addEventListener('storage', handleUpdate)
      return () => {
        clearInterval(pollInterval)
        window.removeEventListener('forum_notification_update', handleUpdate)
        window.removeEventListener('storage', handleUpdate)
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
