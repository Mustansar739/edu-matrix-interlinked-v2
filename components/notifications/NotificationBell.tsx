/**
 * NOTIFICATION BELL COMPONENT - FACEBOOK STYLE
 * Complete notification dropdown with real-time updates
 */

'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationBell({ 
  className,
  size = 'md' 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    isLoading,
    error,
    hasMore
  } = useNotifications({
    enableRealtime: true,
    enableSound: true,
    pageSize: 10
  });

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative rounded-full",
            buttonSizes[size],
            className
          )}
        >
          <Bell className={sizeClasses[size]} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 shadow-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        sideOffset={8}
      >
        {/* Simple Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 px-3 py-1 h-auto"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Simple Notification List */}
        <div className="max-h-96 bg-white dark:bg-gray-800">
          <NotificationCenter
            notifications={notifications}
            isLoading={isLoading}
            error={error}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
            onLoadMore={hasMore ? loadMore : undefined}
            showLoadMore={hasMore}
            maxHeight="384px"
          />
        </div>

        {/* Simple Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <Button
              variant="ghost"
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 py-2"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/notifications';
              }}
            >
              See all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
