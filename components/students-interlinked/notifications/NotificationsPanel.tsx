'use client';

import React, { useState } from 'react';
import { Bell, Heart, MessageCircle, Share, Users, Trophy, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { NotificationData, NotificationCategory } from '@/lib/types/notifications';

interface NotificationsPanelProps {
  className?: string;
}

export default function NotificationsPanel({
  className
}: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  // Use the real notification system
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
    error
  } = useNotifications({
    enableRealtime: true,
    enableSound: true
  });
  // Filter notifications by tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.isRead;
    return notification.category === activeTab;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'COMMENT':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'SHARE':
        return <Share className="h-4 w-4 text-green-500" />;
      case 'FOLLOW':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'STUDY_GROUP':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'ACHIEVEMENT':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return `${Math.floor(diffInDays / 7)}w`;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-lg font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="destructive" className="h-5 px-2 rounded-full text-xs">
                    {unreadCount} new
                  </Badge>
                </div>
              )}
            </div>
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="h-4 w-4 mr-2" />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 pb-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="mentions">Mentions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 rounded-r-lg",
                        notification.isRead 
                          ? "border-l-transparent bg-white dark:bg-gray-900" 
                          : "border-l-blue-500 bg-blue-50/80 dark:bg-blue-950/30"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {notification.data?.actorName ? (
                            <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-700">
                              <AvatarImage src={notification.imageUrl} />
                              <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {notification.data.actorName.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium leading-relaxed",
                                notification.isRead 
                                  ? "text-gray-600 dark:text-gray-300" 
                                  : "text-gray-900 dark:text-white"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                  <span className="font-medium">
                                    {formatTimeAgo(notification.createdAt.toString())}
                                  </span>
                                  <div className="flex items-center">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {!notification.isRead && (
                                  <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteNotification(notification.id)}
                                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-6 mb-4 mx-auto w-fit">
                    <Bell className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    {activeTab === 'unread' ? "You're all caught up!" : "No notifications yet"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                    {activeTab === 'unread' 
                      ? "All your notifications have been read. New ones will appear here." 
                      : "When you get notifications about likes, comments, and follows, they'll show up here."
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
