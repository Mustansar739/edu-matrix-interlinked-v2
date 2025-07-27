/**
 * =============================================================================
 * NOTIFICATION SYSTEM INTEGRATION - PRODUCTION-READY COMPONENT
 * =============================================================================
 * 
 * 🎯 PURPOSE:
 * Complete notification system integration with real-time updates for likes,
 * comments, follows, and other Facebook-style interactions.
 * 
 * 🔧 FEATURES:
 * ✅ Real-time notification display
 * ✅ Facebook-style notification dropdown
 * ✅ Like, comment, and follow notifications
 * ✅ Notification counts with badge
 * ✅ Mark as read functionality
 * ✅ Socket.IO integration for real-time updates
 * ✅ Responsive design
 * ✅ Production-ready error handling
 * 
 * 🎨 DESIGN:
 * - Facebook-style notification bell icon
 * - Dropdown with notification list
 * - Real-time count updates
 * - Notification categories
 * - Time-based sorting
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * VERSION: 1.0.0 (Production Ready)
 * =============================================================================
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'
import { Bell, Heart, MessageCircle, Users, User, X, Settings, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface NotificationData {
  id: string
  userId: string
  title: string
  message: string
  type: string
  category: string
  priority: string
  isRead: boolean
  readAt?: string
  entityType?: string
  entityId?: string
  actionUrl?: string
  imageUrl?: string
  data?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface NotificationSystemProps {
  className?: string
  variant?: 'dropdown' | 'sidebar' | 'modal'
  maxNotifications?: number
  enableSound?: boolean
  enableRealtime?: boolean
}

// ==========================================
// NOTIFICATION SYSTEM COMPONENT
// ==========================================

export function NotificationSystem({
  className,
  variant = 'dropdown',
  maxNotifications = 50,
  enableSound = true,
  enableRealtime = true
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // ==========================================
  // NOTIFICATION FETCHING
  // ==========================================

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/notifications?limit=' + maxNotifications)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications'
      setError(errorMessage)
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [maxNotifications])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead: true })
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
      
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
      
      toast({
        title: "All notifications marked as read",
        description: "Your notifications have been cleared"
      })
      
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      })
      console.error('Error marking all notifications as read:', err)
    }
  }, [toast])

  // ==========================================
  // REAL-TIME INTEGRATION
  // ==========================================

  /**
   * Setup real-time Socket.IO listeners
   */
  useEffect(() => {
    if (!enableRealtime) return

    // Import Socket.IO client dynamically
    const setupRealtime = async () => {
      try {
        const { io } = await import('socket.io-client')
        
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
          transports: ['websocket'],
          autoConnect: true
        })

        socket.on('connect', () => {
          console.log('📡 Connected to notification socket')
        })

        // Listen for new notifications
        socket.on('notification:new', (data: NotificationData) => {
          console.log('🔔 New notification received:', data)
          
          setNotifications(prev => [data, ...prev].slice(0, maxNotifications))
          setUnreadCount(prev => prev + 1)
          
          // Show toast notification
          toast({
            title: data.title,
            description: data.message,
            action: data.actionUrl ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = data.actionUrl!}
              >
                View
              </Button>
            ) : undefined
          })
          
          // Play notification sound (disabled in production to avoid file conflicts)
          if (enableSound && 'Audio' in window && process.env.NODE_ENV === 'development') {
            try {
              const audio = new Audio('/sounds/notification.mp3')
              audio.volume = 0.5
              audio.play().catch(e => console.log('Could not play notification sound:', e))
            } catch (e) {
              console.log('Audio not supported:', e)
            }
          }
        })

        // Listen for notification updates
        socket.on('notification:read', (data: { notificationId: string }) => {
          markAsRead(data.notificationId)
        })

        // Listen for unread count updates
        socket.on('notification:count_updated', (data: { unreadCount: number }) => {
          setUnreadCount(data.unreadCount)
        })

        return () => {
          socket.disconnect()
        }
      } catch (err) {
        console.error('Failed to setup real-time notifications:', err)
      }
    }

    setupRealtime()
  }, [enableRealtime, enableSound, maxNotifications, toast, markAsRead])

  // ==========================================
  // COMPONENT LIFECYCLE
  // ==========================================

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'POST_LIKED':
      case 'COMMENT_LIKED':
      case 'PROFILE_LIKED':
      case 'STORY_LIKED':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'POST_COMMENTED':
      case 'COMMENT_REPLIED':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'USER_FOLLOWED':
        return <Users className="h-4 w-4 text-green-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  /**
   * Render individual notification item
   */
  const NotificationItem = ({ notification }: { notification: NotificationData }) => (
    <div
      className={cn(
        'p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors',
        !notification.isRead && 'bg-blue-50 border-l-4 border-l-blue-500'
      )}
      onClick={() => {
        if (!notification.isRead) {
          markAsRead(notification.id)
        }
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl
        }
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {notification.title}
          </p>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  )

  /**
   * Render notification dropdown content
   */
  const NotificationDropdown = () => (
    <PopoverContent className="w-80 p-0" align="end">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <ScrollArea className="h-96">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              You'll see notifications here when people interact with your content
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => {
            setIsOpen(false)
            window.location.href = '/notifications'
          }}
        >
          View all notifications
        </Button>
      </div>
    </PopoverContent>
  )

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-gray-100 rounded-full"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <NotificationDropdown />
      </Popover>
    </div>
  )
}

export default NotificationSystem
