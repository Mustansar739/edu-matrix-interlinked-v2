'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, ChevronUp, Bell } from 'lucide-react'
import { useSocket } from '@/lib/socket/socket-context-clean'
import { useToast } from '@/components/ui/use-toast'

interface LiveFeedUpdatesProps {
  onNewPostsAvailable?: (count: number) => void
  onRefreshFeed?: () => void
  userId: string
  className?: string
}

interface NewPostNotification {
  id: string
  authorName: string
  authorImage?: string
  content: string
  timestamp: string
}

export default function LiveFeedUpdates({ 
  onNewPostsAvailable, 
  onRefreshFeed,
  userId,
  className = ''
}: LiveFeedUpdatesProps) {
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()
  
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [newPosts, setNewPosts] = useState<NewPostNotification[]>([])
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Listen for new posts in real-time
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNewPost = (data: {
      post: {
        id: string
        content: string
        author: {
          id: string
          name: string
          image?: string
        }
        createdAt: string
      }
    }) => {
      // Don't show updates for own posts
      if (data.post.author.id === userId) return

      const newPost: NewPostNotification = {
        id: data.post.id,
        authorName: data.post.author.name,
        authorImage: data.post.author.image,
        content: data.post.content.substring(0, 100) + (data.post.content.length > 100 ? '...' : ''),
        timestamp: data.post.createdAt
      }

      setNewPosts(prev => [newPost, ...prev.slice(0, 4)]) // Keep last 5 posts
      setNewPostsCount(prev => prev + 1)
      setShowUpdateBanner(true)

      // Notify parent component
      onNewPostsAvailable?.(newPostsCount + 1)      // Show toast notification
      toast({
        title: "New Post",
        description: `${data.post.author.name} shared something new`,
      })
    }

    const handleLiveEngagement = (data: {
      type: 'like' | 'comment' | 'share'
      postId: string
      userId: string
      userName: string
      count: number
    }) => {
      // Show real-time engagement notifications
      if (data.userId !== userId) {
        const icons = {
          like: '👍',
          comment: '💬',
          share: '🔄'
        }
          toast({
          title: "Live Activity",
          description: `${data.userName} ${data.type}d a post`,
        })
      }
    }

    // Listen for new posts and engagement
    socket.on('students-interlinked:new-post', handleNewPost)
    socket.on('students-interlinked:live-engagement', handleLiveEngagement)
    socket.on('post:created', handleNewPost)

    return () => {
      socket.off('students-interlinked:new-post', handleNewPost)
      socket.off('students-interlinked:live-engagement', handleLiveEngagement)
      socket.off('post:created', handleNewPost)
    }
  }, [socket, isConnected, userId, newPostsCount, onNewPostsAvailable, toast])

  // Auto-hide banner after 30 seconds
  useEffect(() => {
    if (showUpdateBanner && newPostsCount > 0) {
      const timer = setTimeout(() => {
        setShowUpdateBanner(false)
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [showUpdateBanner, newPostsCount])

  const handleRefreshClick = useCallback(() => {
    setNewPostsCount(0)
    setNewPosts([])
    setShowUpdateBanner(false)
    setLastRefresh(Date.now())
    onRefreshFeed?.()
    
    toast({
      title: "Feed Updated",
      description: "Your feed has been refreshed with the latest posts",
    })
  }, [onRefreshFeed, toast])

  // Auto-refresh every 2 minutes if there are new posts
  useEffect(() => {
    if (newPostsCount > 0) {
      const autoRefreshTimer = setTimeout(() => {
        handleRefreshClick()
      }, 120000) // 2 minutes
      
      return () => clearTimeout(autoRefreshTimer)
    }
  }, [newPostsCount, handleRefreshClick])

  return (
    <div className={className}>
      {/* New posts banner */}
      <AnimatePresence>
        {showUpdateBanner && newPostsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">New Posts Available</span>
                  <Badge variant="secondary" className="text-xs">
                    {newPostsCount}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpdateBanner(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Preview of new posts */}
              <div className="space-y-1 mb-3">
                {newPosts.slice(0, 2).map((post) => (
                  <div key={post.id} className="text-xs text-gray-600 truncate">
                    <span className="font-medium">{post.authorName}:</span> {post.content}
                  </div>
                ))}
                {newPosts.length > 2 && (
                  <div className="text-xs text-gray-500">
                    and {newPosts.length - 2} more...
                  </div>
                )}
              </div>

              <Button
                onClick={handleRefreshClick}
                size="sm"
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Load New Posts
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating refresh button */}
      <AnimatePresence>
        {newPostsCount > 0 && !showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={handleRefreshClick}
              className="rounded-full h-12 w-12 shadow-lg relative"
              size="icon"
            >
              <ChevronUp className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 text-xs p-0 flex items-center justify-center"
              >
                {newPostsCount > 99 ? '99+' : newPostsCount}
              </Badge>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status indicator */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-4 right-4 z-50"
        >
          <Badge variant="destructive" className="text-xs">
            Disconnected - Some features may not work
          </Badge>
        </motion.div>
      )}
    </div>
  )
}

// Hook for live feed updates
export function useLiveFeedUpdates(userId: string) {
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const handleNewPostsAvailable = useCallback((count: number) => {
    setNewPostsCount(count)
    setLastUpdate(new Date())
  }, [])

  const clearNewPosts = useCallback(() => {
    setNewPostsCount(0)
  }, [])

  return {
    newPostsCount,
    lastUpdate,
    handleNewPostsAvailable,
    clearNewPosts
  }
}
