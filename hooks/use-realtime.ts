'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useCallback, useEffect } from 'react'
import type { RootState, AppDispatch } from '@/lib/store'
import {
  selectNotifications,
  selectUnreadCount,
  selectIsConnected,
  selectCurrentUser,
  selectOnlineUsers,
  setConnectionStatus,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearNotifications,
  setCurrentUser
} from '@/lib/store/realtime-slice'
import { useNotificationsSocket } from './use-socket-features'

/**
 * Hook for managing notifications with Redux integration
 */
export function useNotifications() {
  const dispatch = useDispatch<AppDispatch>()
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const isConnected = useSelector(selectIsConnected)
  
  // Socket integration
  const socketHook = useNotificationsSocket()

  // Sync socket state with Redux
  useEffect(() => {
    if (socketHook.notifications.length > 0) {
      socketHook.notifications.forEach(notification => {
        dispatch(addNotification({
          id: notification.id,
          type: notification.type || 'general',
          title: notification.title || 'Notification',
          message: notification.message || '',
          isRead: notification.read || false,
          createdAt: notification.timestamp || new Date().toISOString()
        }))
      })
    }
  }, [socketHook.notifications, dispatch])

  const markAsRead = useCallback((notificationId: string) => {
    dispatch(markNotificationAsRead(notificationId))
    socketHook.markAsRead([notificationId])
  }, [dispatch, socketHook])

  const markAllAsRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead())
    socketHook.markAllAsRead()
  }, [dispatch, socketHook])

  const clearAll = useCallback(() => {
    dispatch(clearNotifications())
  }, [dispatch])

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAll,
    joinNotifications: socketHook.joinNotifications,
    sendNotification: socketHook.sendNotification
  }
}

/**
 * Hook for managing user presence and online status
 */
export function usePresence() {
  const dispatch = useDispatch<AppDispatch>()
  const onlineUsers = useSelector(selectOnlineUsers)
  const currentUser = useSelector(selectCurrentUser)
  const isConnected = useSelector(selectIsConnected)

  const updateConnectionStatus = useCallback((status: boolean) => {
    dispatch(setConnectionStatus(status))
  }, [dispatch])

  const updateOnlineUsers = useCallback((users: any[]) => {
    const formattedUsers = users.map(user => ({
      id: user.userId || user.id,
      name: user.name || user.username || 'Unknown',
      avatar: user.profilePictureUrl || user.image,
      lastSeen: user.lastSeen || new Date().toISOString()
    }))
    dispatch(setOnlineUsers(formattedUsers))
  }, [dispatch])

  const addUser = useCallback((user: any) => {
    dispatch(addOnlineUser({
      id: user.userId || user.id,
      name: user.name || user.username || 'Unknown',
      avatar: user.profilePictureUrl || user.image,
      lastSeen: new Date().toISOString()
    }))
  }, [dispatch])

  const removeUser = useCallback((userId: string) => {
    dispatch(removeOnlineUser(userId))
  }, [dispatch])

  const setUser = useCallback((user: any) => {
    dispatch(setCurrentUser(user))
  }, [dispatch])

  return {
    onlineUsers,
    currentUser,
    isConnected,
    updateConnectionStatus,
    updateOnlineUsers,
    addUser,
    removeUser,
    setUser
  }
}

// Define chat message and room types
interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: Date
  read: boolean
  type?: 'text' | 'image' | 'file'
  delivered?: boolean
  attachments?: { id: string; type: string; url: string; name: string }[]
}

interface ChatParticipant {
  id: string
  name: string
  avatar?: string
}

interface ChatRoom {
  id: string
  name: string
  type: 'private' | 'group' | 'course'
  messages: ChatMessage[]
  unreadCount: number
  lastActivity: Date
  participants: ChatParticipant[]
  isTyping?: Record<string, boolean>
}

/**
 * Hook for real-time chat functionality with Redux integration
 */
export function useChat(roomId?: string) {
  const dispatch = useDispatch<AppDispatch>()
  const currentUser = useSelector(selectCurrentUser)
  const isConnected = useSelector(selectIsConnected)
  // Mock data for now - in real implementation this would come from Redux store
  const activeRoom: ChatRoom | null = roomId ? {
    id: roomId,
    name: 'Chat Room',
    type: 'private',
    messages: [],
    unreadCount: 0,
    lastActivity: new Date(),
    participants: [],
    isTyping: {}
  } : null

  const sendMessage = (content: string, attachments?: File[]) => {
    // Implementation would dispatch to Redux store
    console.log('Sending message:', content, attachments)
  }

  const markAsRead = (messageIds: string[]) => {
    // Implementation would dispatch to Redux store
    console.log('Marking as read:', messageIds)
  }

  const handleTyping = (isTyping: boolean) => {
    // Implementation would dispatch to Redux store
    console.log('Typing status:', isTyping)
  }

  return {
    currentUser,
    isConnected,
    activeRoom,
    sendMessage,
    markAsRead,
    handleTyping
  }
}

/**
 * Main realtime hook that combines all functionality
 */
export function useRealtime() {
  const notifications = useNotifications()
  const presence = usePresence()
  const chat = useChat()

  return {
    notifications,
    presence,
    chat
  }
}
