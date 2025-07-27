'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/lib/socket/socket-context-clean'

interface RealtimeNotification {
  id: string
  type: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  userId: string
}

interface UseRealtimeNotificationsOptions {
  userId?: string
  autoMarkAsRead?: boolean
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { socket, isConnected } = useSocket()
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Add notification
  const addNotification = useCallback((notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    setUnreadCount(0)
  }, [])

  // Clear notification
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(notif => notif.id !== notificationId)
      const removedNotif = prev.find(notif => notif.id === notificationId)
      if (removedNotif && !removedNotif.read) {
        setUnreadCount(current => Math.max(0, current - 1))
      }
      return filtered
    })
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Listen for realtime notifications
  useEffect(() => {
    if (!socket || !isConnected || !options.userId) return

    const handleNewNotification = (data: any) => {
      addNotification({
        type: data.type || 'general',
        title: data.title || 'New Notification',
        message: data.message || data.content || '',
        userId: data.userId || options.userId || ''
      })
    }

    // Listen for various notification events
    socket.on('notification:new', handleNewNotification)
    socket.on('notification:system', handleNewNotification)
    socket.on('notification:social', handleNewNotification)
    socket.on('notification:academic', handleNewNotification)

    // Join user's notification room
    socket.emit('join-notifications', { userId: options.userId })

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('notification:system', handleNewNotification)
      socket.off('notification:social', handleNewNotification)
      socket.off('notification:academic', handleNewNotification)
    }
  }, [socket, isConnected, options.userId, addNotification])

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    isConnected
  }
}
