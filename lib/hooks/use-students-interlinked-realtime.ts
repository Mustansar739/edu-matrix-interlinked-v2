/**
 * ==========================================
 * STUDENTS INTERLINKED - REAL-TIME REACT HOOK
 * ==========================================
 * Facebook-like real-time functionality for React components
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { SOCKET_EVENTS } from '@/lib/services/student-interlinked/students-interlinked-realtime'

interface UseStudentsInterlinkedRealtimeProps {
  enabled?: boolean
}

interface RealtimeState {
  socket: Socket | null
  isConnected: boolean
  error: string | null
}

interface RealtimeCallbacks {
  onPostCreated?: (post: any) => void
  onPostLiked?: (data: any) => void
  onPostCommented?: (comment: any) => void
  onCommentUpdated?: (comment: any) => void
  onCommentDeleted?: (data: any) => void
  onStoryCreated?: (story: any) => void
  onStoryViewed?: (data: any) => void
  onStoryLiked?: (data: any) => void
  onUserOnline?: (data: any) => void
  onUserOffline?: (data: any) => void
  onNotification?: (notification: any) => void
}

export function useStudentsInterlinkedRealtime(
  props: UseStudentsInterlinkedRealtimeProps = { enabled: true },
  callbacks: RealtimeCallbacks = {}
) {
  const { data: session } = useSession()
  const [state, setState] = useState<RealtimeState>({
    socket: null,
    isConnected: false,
    error: null,
  })  // Connect to Socket.IO
  const connect = useCallback(() => {
    if (!session?.user?.id || !props.enabled) return

    try {
      // Connect to standalone Socket.IO server
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        auth: {
          userId: session.user.id,
          userEmail: session.user.email,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })

      newSocket.on('connect', () => {
        setState(prev => ({ ...prev, socket: newSocket, isConnected: true, error: null }))
        console.log('✅ Connected to Students Interlinked real-time')
        
        // Join main feed for updates
        newSocket.emit('join:feed')
          // Set user online
        newSocket.emit('user:online')
      })

      newSocket.on('disconnect', () => {
        setState(prev => ({ ...prev, isConnected: false }))
        console.log('❌ Disconnected from Students Interlinked real-time')
      })

      newSocket.on('connect_error', (error) => {
        setState(prev => ({ ...prev, error: error.message }))
        console.error('❌ Socket connection error:', error)
      })

      // ==========================================
      // POST EVENTS
      // ==========================================
      
      newSocket.on(SOCKET_EVENTS.POST_CREATED, (post) => {
        callbacks.onPostCreated?.(post)
      })

      newSocket.on(SOCKET_EVENTS.POST_LIKED, (data) => {
        callbacks.onPostLiked?.(data)
      })

      newSocket.on(SOCKET_EVENTS.POST_COMMENTED, (comment) => {
        callbacks.onPostCommented?.(comment)
      })

      // ==========================================
      // COMMENT EVENTS
      // ==========================================
      
      newSocket.on(SOCKET_EVENTS.COMMENT_UPDATED, (comment) => {
        callbacks.onCommentUpdated?.(comment)
      })

      newSocket.on(SOCKET_EVENTS.COMMENT_DELETED, (data) => {
        callbacks.onCommentDeleted?.(data)
      })

      // ==========================================
      // STORY EVENTS
      // ==========================================
        newSocket.on(SOCKET_EVENTS.STORY_CREATED, (story) => {
        callbacks.onStoryCreated?.(story)
      })

      newSocket.on(SOCKET_EVENTS.STORY_VIEWED, (data) => {
        callbacks.onStoryViewed?.(data)
      })

      newSocket.on(SOCKET_EVENTS.STORY_LIKED, (data) => {
        callbacks.onStoryLiked?.(data)
      })

      // ==========================================
      // USER PRESENCE
      // ==========================================
      
      newSocket.on(SOCKET_EVENTS.USER_ONLINE, (data) => {
        callbacks.onUserOnline?.(data)
      })

      newSocket.on(SOCKET_EVENTS.USER_OFFLINE, (data) => {
        callbacks.onUserOffline?.(data)
      })

      // ==========================================
      // NOTIFICATIONS
      // ==========================================
      
      newSocket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (notification) => {
        callbacks.onNotification?.(notification)
      })

      setState(prev => ({ ...prev, socket: newSocket }))

    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }))
    }
  }, [session, props.enabled, callbacks])

  // Disconnect
  const disconnect = useCallback(() => {
    if (state.socket) {
      state.socket.disconnect()
      setState(prev => ({ ...prev, socket: null, isConnected: false }))
    }
  }, [state.socket])

  // Post-specific functions
  const joinPost = useCallback((postId: string) => {
    if (state.socket && state.isConnected) {
      state.socket.emit('join:post', postId)
    }
  }, [state.socket, state.isConnected])

  const leavePost = useCallback((postId: string) => {
    if (state.socket && state.isConnected) {
      state.socket.emit('leave:post', postId)
    }
  }, [state.socket, state.isConnected])

  const emitTyping = useCallback((postId: string, isTyping: boolean) => {
    if (state.socket && state.isConnected) {
      state.socket.emit('typing:comment', { postId, isTyping })
    }
  }, [state.socket, state.isConnected])

  // Story-specific functions
  const joinStory = useCallback((storyId: string) => {
    if (state.socket && state.isConnected) {
      state.socket.emit('join:story', storyId)
    }
  }, [state.socket, state.isConnected])

  const leaveStory = useCallback((storyId: string) => {
    if (state.socket && state.isConnected) {
      state.socket.emit('leave:story', storyId)
    }
  }, [state.socket, state.isConnected])

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.user?.id && props.enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [session, props.enabled, connect, disconnect])

  return {
    // State
    socket: state.socket,
    isConnected: state.isConnected,
    error: state.error,
    
    // Actions
    connect,
    disconnect,
    
    // Post functions
    joinPost,
    leavePost,
    emitTyping,
    
    // Story functions
    joinStory,
    leaveStory,
  }
}

// ==========================================
// SPECIALIZED HOOKS
// ==========================================

/**
 * Hook for real-time post interactions
 */
export function usePostRealtime(postId: string) {
  const [likes, setLikes] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [typing, setTyping] = useState<string[]>([])

  const realtime = useStudentsInterlinkedRealtime({ enabled: true }, {
    onPostLiked: (data) => {
      if (data.postId === postId) {
        // Update likes in real-time
        console.log('Real-time like update:', data)
      }
    },
    onPostCommented: (comment) => {
      if (comment.postId === postId) {
        setComments(prev => [comment, ...prev])
      }
    },
  })

  useEffect(() => {
    if (realtime.isConnected) {
      realtime.joinPost(postId)
    }

    return () => {
      if (realtime.isConnected) {
        realtime.leavePost(postId)
      }
    }
  }, [postId, realtime])

  return {
    ...realtime,
    likes,
    comments,
    typing,
    emitTyping: realtime.emitTyping,
  }
}

/**
 * Hook for real-time story interactions
 */
export function useStoryRealtime(storyId: string) {
  const [views, setViews] = useState<any[]>([])
  const [reactions, setReactions] = useState<any[]>([])

  const realtime = useStudentsInterlinkedRealtime({ enabled: true }, {
    onStoryViewed: (data) => {
      if (data.storyId === storyId) {
        setViews(prev => [...prev, data])
      }
    },
    onStoryLiked: (data) => {
      if (data.storyId === storyId) {
        setReactions(prev => [...prev, data])
      }
    },
  })

  useEffect(() => {
    if (realtime.isConnected) {
      realtime.joinStory(storyId)
    }

    return () => {
      if (realtime.isConnected) {
        realtime.leaveStory(storyId)
      }
    }
  }, [storyId, realtime])

  return {
    ...realtime,
    views,
    reactions,
  }
}

/**
 * Hook for global notifications
 */
export function useNotificationsRealtime() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const realtime = useStudentsInterlinkedRealtime({ enabled: true }, {
    onNotification: (notification) => {
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.message, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        })
      }
    },
  })

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return {
    ...realtime,
    notifications,
    unreadCount,
    markAsRead,
  }
}
