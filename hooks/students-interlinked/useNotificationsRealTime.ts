'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSocket } from '@/lib/socket/socket-context-clean'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'post' | 'story' | 'system'
  title: string
  message: string
  actor?: {
    id: string
    name: string
    image?: string
  }
  entityType?: string
  entityId?: string
  actionUrl?: string
  isRead: boolean
  createdAt: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

interface UseNotificationsRealTimeOptions {
  userId?: string
  onNotificationReceived?: (notification: Notification) => void
  onNotificationRead?: (notificationId: string) => void
  enabled?: boolean
}

export function useNotificationsRealTime({
  userId,
  onNotificationReceived,
  onNotificationRead,
  enabled = true
}: UseNotificationsRealTimeOptions = {}) {
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Join user notification room
  useEffect(() => {
    if (!socket || !isConnected || !enabled || !userId) return

    socket.emit('join:notifications', { userId })

    return () => {
      socket.emit('leave:notifications', { userId })
    }
  }, [socket, isConnected, enabled, userId])

  // Handle real-time notification events
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNewNotification = (data: {
      notification: Notification
      sender?: { id: string; name: string }
    }) => {
      const notification = data.notification

      // Add to notifications list
      setNotifications(prev => [notification, ...prev])
      
      // Update unread count
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1)
      }      // Show toast for high priority notifications
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        toast({
          title: notification.title,
          description: notification.message
        })
      }

      // Trigger callback
      onNotificationReceived?.(notification)

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    }

    const handleNotificationRead = (data: {
      notificationId: string
      readAt: string
    }) => {
      // Update notification as read
      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notificationId
            ? { ...n, isRead: true }
            : n
        )
      )

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Trigger callback
      onNotificationRead?.(data.notificationId)

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    }

    const handleNotificationError = (error: { message: string }) => {
      toast({
        title: "Notification Error",
        description: error.message,
        variant: "destructive"
      })
    }

    // Listen for Socket.IO events
    socket.on('notification:new', handleNewNotification)
    socket.on('notification:read', handleNotificationRead)
    socket.on('notification:error', handleNotificationError)

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('notification:read', handleNotificationRead)
      socket.off('notification:error', handleNotificationError)
    }
  }, [socket, isConnected, userId, onNotificationReceived, onNotificationRead, toast, queryClient])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!socket || !isConnected || !userId) return

    setIsLoading(true)

    try {
      // Emit to Socket.IO server
      socket.emit('notification:mark_read', {
        notificationId,
        userId,
        timestamp: new Date().toISOString()
      })

      // Also make API call for persistence
      const response = await fetch(`/api/students-interlinked/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, isRead: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [socket, isConnected, userId, toast])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!socket || !isConnected || !userId) return

    setIsLoading(true)

    try {
      // Emit to Socket.IO server
      socket.emit('notification:mark_all_read', {
        userId,
        timestamp: new Date().toISOString()
      })

      // Also make API call for persistence
      const response = await fetch(`/api/students-interlinked/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Optimistically update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)

    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [socket, isConnected, userId, toast])

  // Send notification to another user
  const sendNotification = useCallback(async (
    targetUserId: string,
    type: string,
    title: string,
    message: string,
    options: {
      entityType?: string
      entityId?: string
      actionUrl?: string
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      data?: any
    } = {}
  ) => {
    if (!socket || !isConnected || !userId) return

    try {
      // Emit to Socket.IO server
      socket.emit('notification:send', {
        targetUserId,
        type,
        title,
        message,
        priority: options.priority || 'normal',
        category: 'social',
        data: {
          entityType: options.entityType,
          entityId: options.entityId,
          actionUrl: options.actionUrl,
          ...options.data
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error sending notification:', error)
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive"
      })
    }
  }, [socket, isConnected, userId, toast])

  // Load initial notifications
  const loadNotifications = useCallback(async (limit = 20, offset = 0) => {
    if (!userId) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/students-interlinked/notifications?limit=${limit}&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error('Failed to load notifications')
      }

      const data = await response.json()
      
      if (offset === 0) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
      }

    } catch (error) {
      console.error('Error loading notifications:', error)
      toast({
        title: "Error",
        description: "Failed to load notifications. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, toast])

  // Load notifications on mount
  useEffect(() => {
    if (userId && enabled) {
      loadNotifications()
    }
  }, [userId, enabled, loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    sendNotification,
    loadNotifications,
    setNotifications,
    setUnreadCount
  }
}
