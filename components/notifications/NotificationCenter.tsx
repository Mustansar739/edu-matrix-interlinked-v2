/**
 * NOTIFICATION CENTER COMPONENT
 * Main notification list with Facebook-style UI
 */

'use client';

import { useState, useCallback } from 'react';
import { NotificationData } from '@/lib/types/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Bell, AlertCircle } from 'lucide-react';

interface NotificationCenterProps {
  notifications: NotificationData[];
  isLoading: boolean;
  error: string | null;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  showLoadMore?: boolean;
  maxHeight?: string;
}

export function NotificationCenter({
  notifications,
  isLoading,
  error,
  onMarkAsRead,
  onDelete,
  onLoadMore,
  showLoadMore = false,
  maxHeight = '600px'
}: NotificationCenterProps) {  const [loadingMore, setLoadingMore] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore) return;
    
    setLoadingMore(true);
    setInternalError(null);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Failed to load more notifications:', error);
      setInternalError('Failed to load more notifications. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [onLoadMore, loadingMore]);

  const safeMarkAsRead = useCallback(async (id: string) => {
    try {
      await onMarkAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setInternalError('Failed to mark notification as read.');
    }
  }, [onMarkAsRead]);

  const safeDelete = useCallback(async (id: string) => {
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setInternalError('Failed to delete notification.');
    }
  }, [onDelete]);
  // Handle primary error or internal errors
  if (error || internalError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          Failed to load notifications
        </p>
        <Button 
          onClick={() => {
            setInternalError(null);
            window.location.reload();
          }} 
          variant="outline" 
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No notifications yet
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          We'll notify you when something happens
        </p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={safeMarkAsRead}
          onDelete={safeDelete}
        />
      ))}
      
      {showLoadMore && onLoadMore && (
        <div className="p-4 text-center bg-gray-50 dark:bg-gray-800">
          <Button
            variant="ghost"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-700"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'See more notifications'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
