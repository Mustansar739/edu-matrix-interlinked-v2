'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

interface RealTimePost {
  id: string
  content: string
  authorId: string
  author: {
    id: string
    name: string
    image: string
  }
  createdAt: string
  _count: {
    likes: number
    comments: number
    shares: number
  }
}

interface RealTimeComment {
  id: string
  content: string
  postId: string
  authorId: string
  author: {
    id: string
    name: string
    image: string
  }
  createdAt: string
}

interface RealTimeLike {
  id: string
  postId: string
  userId: string
  user: {
    id: string
    name: string
    image: string
  }
  type: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'
  createdAt: string
}

interface RealTimeStory {
  id: string
  content?: string
  imageUrl?: string
  videoUrl?: string
  authorId: string
  author: {
    id: string
    name: string
    username?: string
    image: string
  }
  createdAt: string
  expiresAt: string
  views?: any[]
  reactions?: any[]
}

interface RealTimeNotification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  data?: any
}

interface UseStudentsInterlinkedRealTimeOptions {
  userId?: string
  onNewPost?: (post: RealTimePost) => void
  onNewComment?: (comment: RealTimeComment) => void
  onNewLike?: (like: RealTimeLike) => void
  onNewStory?: (story: RealTimeStory) => void
  onNewNotification?: (notification: RealTimeNotification) => void
  onPostUpdate?: (postId: string, update: Partial<RealTimePost>) => void
  enabled?: boolean
}

export function useStudentsInterlinkedRealTime({
  userId,
  onNewPost,
  onNewComment,
  onNewLike,
  onNewStory,
  onNewNotification,
  onPostUpdate,
  enabled = true
}: UseStudentsInterlinkedRealTimeOptions = {}) {
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [lastActivity, setLastActivity] = useState<Date>(new Date())

  // Join Students Interlinked room when connected
  useEffect(() => {
    if (!socket || !isConnected || !enabled || !userId) return

    // Join the main Students Interlinked room
    socket.emit('join-students-interlinked', { userId })

    // Join user-specific room for personalized updates
    socket.emit('join-user-room', { userId })

    return () => {
      socket.emit('leave-students-interlinked', { userId })
      socket.emit('leave-user-room', { userId })
    }
  }, [socket, isConnected, enabled, userId])

  // Handle new posts in real-time
  const handleNewPost = useCallback((data: RealTimePost) => {
    setLastActivity(new Date())
    
    // Update React Query cache
    queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
      // Show toast notification for posts from connections
    if (data.authorId !== userId) {
      const authorName = data.author?.name || 'Someone'
      toast({
        title: "New Post",
        description: `${authorName} shared something new`,
      })
    }
    
    onNewPost?.(data)
  }, [queryClient, toast, userId, onNewPost])

  // Handle new comments in real-time
  const handleNewComment = useCallback((data: RealTimeComment) => {
    setLastActivity(new Date())
    
    // Update React Query cache for specific post
    queryClient.invalidateQueries({ 
      queryKey: ['students-interlinked', 'posts', data.postId, 'comments'] 
    })
      // Show notification if it's a comment on user's post
    if (data.authorId !== userId) {
      const authorName = data.author?.name || 'Someone'
      toast({
        title: "New Comment",
        description: `${authorName} commented on a post`,
      })
    }
    
    onNewComment?.(data)
  }, [queryClient, toast, userId, onNewComment])

  // Handle new likes in real-time
  const handleNewLike = useCallback((data: RealTimeLike) => {
    setLastActivity(new Date())
    
    // Update React Query cache
    queryClient.invalidateQueries({ 
      queryKey: ['students-interlinked', 'posts', data.postId] 
    })
    
    // Show notification for likes on user's content
    if (data.userId !== userId) {
      const reactionEmojis = {
        LIKE: '👍',
        LOVE: '❤️',
        LAUGH: '😂',
        WOW: '😮',
        SAD: '😢',
        ANGRY: '😠'
      }
      const userName = data.user?.name || 'Someone'
        toast({
        title: "New Reaction",
        description: `${userName} reacted ${reactionEmojis[data.type]} to your post`,
      })
    }
    
    onNewLike?.(data)
  }, [queryClient, toast, userId, onNewLike])

  // Handle post updates (edits, deletions)
  const handlePostUpdate = useCallback((data: { postId: string, update: Partial<RealTimePost> }) => {
    setLastActivity(new Date())
    
    // Update React Query cache
    queryClient.invalidateQueries({ 
      queryKey: ['students-interlinked', 'posts', data.postId] 
    })
    
    onPostUpdate?.(data.postId, data.update)
  }, [queryClient, onPostUpdate])
  // Handle user presence updates
  const handleUserPresence = useCallback((data: { userId: string, status: 'online' | 'offline', lastSeen?: string }) => {
    // Update user presence in cache
    queryClient.setQueryData(['user-presence', data.userId], data)
  }, [queryClient])

  // Handle new stories in real-time
  const handleNewStory = useCallback((data: RealTimeStory) => {
    setLastActivity(new Date())
    
    // Update React Query cache
    queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'stories'] })
    
    // Show toast notification for stories from connections
    if (data.authorId !== userId) {
      const authorName = data.author?.name || data.author?.username || 'Someone'
      toast({
        title: "New Story",
        description: `${authorName} shared a new story`,
      })
    }
    
    onNewStory?.(data)
  }, [queryClient, toast, userId, onNewStory])

  // Handle new notifications in real-time
  const handleNewNotification = useCallback((data: RealTimeNotification) => {
    setLastActivity(new Date())
    
    // Update React Query cache
    queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'notifications'] })
    
    // Show toast notification
    toast({
      title: data.title,
      description: data.message,
    })
    
    onNewNotification?.(data)
  }, [queryClient, toast, onNewNotification])

  // Setup event listeners
  useEffect(() => {
    if (!socket || !isConnected) return    // Students Interlinked specific events
    socket.on('students-interlinked:new-post', handleNewPost)
    socket.on('students-interlinked:new-comment', handleNewComment)
    socket.on('students-interlinked:new-like', handleNewLike)
    socket.on('students-interlinked:post-updated', handlePostUpdate)
    socket.on('students-interlinked:user-presence', handleUserPresence)
    socket.on('students-interlinked:new-story', handleNewStory)
    socket.on('students-interlinked:notification', handleNewNotification)

    // Additional real-time events for complete coverage
    socket.on('students-interlinked:story-liked', (data) => {
      setLastActivity(new Date())
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'stories'] })
    })

    socket.on('students-interlinked:story-viewed', (data) => {
      setLastActivity(new Date())
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'stories'] })
    })

    socket.on('students-interlinked:comment-liked', (data) => {
      setLastActivity(new Date())
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts', 'comments'] })
    })

    socket.on('students-interlinked:notification-read', (data) => {
      setLastActivity(new Date())
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'notifications'] })
    })

    // Typing indicators for comments
    socket.on('students-interlinked:user-typing', (data: { postId: string, userId: string, userName: string }) => {
      // Handle typing indicators
      queryClient.setQueryData(['typing-users', data.postId], (prev: any) => {
        const current = prev || []
        return [...current.filter((u: any) => u.userId !== data.userId), data]
      })
    })

    socket.on('students-interlinked:user-stopped-typing', (data: { postId: string, userId: string }) => {
      queryClient.setQueryData(['typing-users', data.postId], (prev: any) => {
        const current = prev || []
        return current.filter((u: any) => u.userId !== data.userId)
      })
    })

    return () => {
      socket.off('students-interlinked:new-post', handleNewPost)
      socket.off('students-interlinked:new-comment', handleNewComment)
      socket.off('students-interlinked:new-like', handleNewLike)
      socket.off('students-interlinked:post-updated', handlePostUpdate)
      socket.off('students-interlinked:user-presence', handleUserPresence)
      socket.off('students-interlinked:new-story', handleNewStory)
      socket.off('students-interlinked:notification', handleNewNotification)
      socket.off('students-interlinked:story-liked')
      socket.off('students-interlinked:story-viewed')
      socket.off('students-interlinked:comment-liked')
      socket.off('students-interlinked:notification-read')
      socket.off('students-interlinked:user-typing')
      socket.off('students-interlinked:user-stopped-typing')
    }
  }, [socket, isConnected, handleNewPost, handleNewComment, handleNewLike, handlePostUpdate, handleUserPresence, handleNewStory, handleNewNotification])

  // Emit typing status for comments
  const emitTyping = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('students-interlinked:typing', { postId, userId })
    }
  }, [socket, isConnected, userId])

  const emitStoppedTyping = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('students-interlinked:stopped-typing', { postId, userId })
    }
  }, [socket, isConnected, userId])

  // Send presence heartbeat
  useEffect(() => {
    if (!socket || !isConnected || !userId) return

    const heartbeat = setInterval(() => {
      socket.emit('students-interlinked:heartbeat', { userId })
    }, 30000) // Every 30 seconds

    return () => clearInterval(heartbeat)
  }, [socket, isConnected, userId])

  return {
    isConnected,
    lastActivity,
    emitTyping,
    emitStoppedTyping,
    // Real-time status
    status: isConnected ? 'connected' : 'disconnected',
  }
}
