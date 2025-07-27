/**
 * NOTIFICATIONS PAGE - FACEBOOK-STYLE CLEAN INTERFACE
 * Simple, clean notification feed like Facebook
 */

'use client';

import { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Button } from '@/components/ui/button';
import { CheckCheck, Settings } from 'lucide-react';
import { NotificationFilters } from '@/lib/types/notifications';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    isLoading,
    error,
    hasMore,
    counts
  } = useNotifications({
    enableRealtime: true,
    enableSound: true,
    pageSize: 20
  });

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return !notification.isRead;
      if (activeTab === 'social') return notification.category === 'SOCIAL';
      if (activeTab === 'educational') return notification.category === 'EDUCATIONAL';
      if (activeTab === 'system') return notification.category === 'ADMINISTRATIVE';
      return true;
    });
  }, [notifications, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Facebook-style header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 px-2 sm:px-3"
              >
                <CheckCheck className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 p-2">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Facebook-style responsive tabs navbar */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-700">
            <div className="flex min-w-full sm:min-w-0">
              {[
                { id: 'all', label: 'All', count: counts?.total },
                { id: 'unread', label: 'Unread', count: unreadCount },
                { id: 'social', label: 'Social', count: counts?.byCategory?.SOCIAL },
                { id: 'educational', label: 'Educational', count: counts?.byCategory?.EDUCATIONAL },
                { id: 'system', label: 'System', count: counts?.byCategory?.ADMINISTRATIVE }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {(tab.count ?? 0) > 0 && (
                    <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Simple notification feed */}
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800">
        <NotificationCenter
          notifications={filteredNotifications}
          isLoading={isLoading}
          error={error}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
          onLoadMore={hasMore ? loadMore : undefined}
          showLoadMore={hasMore}
          maxHeight="none"
        />
      </div>
    </div>
  );
}