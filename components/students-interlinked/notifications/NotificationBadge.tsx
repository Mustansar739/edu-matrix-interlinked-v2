'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Settings, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

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

interface NotificationBadgeProps {
  userId: string
  onNotificationClick?: (notification: Notification) => void
  className?: string
}

export default function NotificationBadge({ 
  userId, 
  onNotificationClick,
  className 
}: NotificationBadgeProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Mock data - replace with real API call
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'like',
        title: 'New Like',
        message: 'Sarah Chen liked your post about calculus integration',
        actor: {
          id: '2',
          name: 'Sarah Chen',
          image: '/api/placeholder/32/32'
        },
        entityType: 'post',
        entityId: 'post_123',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        priority: 'normal'
      },
      {
        id: '2',
        type: 'comment',
        title: 'New Comment',
        message: 'Alex Rodriguez commented on your study guide',
        actor: {
          id: '3',
          name: 'Alex Rodriguez',
          image: '/api/placeholder/32/32'
        },
        entityType: 'post',
        entityId: 'post_124',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        priority: 'normal'
      },
      {
        id: '3',
        type: 'follow',
        title: 'New Follower',
        message: 'Maria Garcia started following you',
        actor: {
          id: '4',
          name: 'Maria Garcia',
          image: '/api/placeholder/32/32'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        priority: 'low'
      }
    ]
    
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.isRead).length)
  }, [])

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    )
    
    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    // Call external handler
    onNotificationClick?.(notification)
    
    // Close popover
    setIsOpen(false)
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'follow':
        return '👤'
      case 'mention':
        return '@'
      case 'post':
        return '📝'
      case 'story':
        return '📸'
      default:
        return '🔔'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'normal':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative p-2", className)}
        >
          <Bell className="w-5 h-5" />
          
          {/* Unread Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="py-2">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 transition-all",
                      !notification.isRead 
                        ? "bg-blue-50 border-l-blue-500" 
                        : "border-l-transparent"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex space-x-3">
                      {/* Actor Avatar or Icon */}
                      <div className="flex-shrink-0">
                        {notification.actor ? (
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={notification.actor.image} />
                            <AvatarFallback>
                              {notification.actor.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          
                          {/* Priority Indicator & Action */}
                          <div className="flex items-center space-x-1 ml-2">
                            {notification.priority !== 'low' && (
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                getPriorityColor(notification.priority)
                              )} />
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-200">
          <Button variant="ghost" className="w-full justify-center text-sm">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
