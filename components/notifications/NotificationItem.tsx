/**
 * NOTIFICATION ITEM COMPONENT
 * Individual notification with Facebook-style design
 */

'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { NotificationData } from '@/lib/types/notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  MessageCircle, 
  Heart, 
  UserPlus, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  Trophy,
  DollarSign,
  Settings,
  MoreHorizontal,
  Eye,
  Trash2,
  ExternalLink,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
}

const getNotificationIcon = (type: string) => {
  const iconClass = "h-5 w-5";
  
  switch (type) {
    case 'MESSAGE_RECEIVED':
      return <MessageCircle className={cn(iconClass, "text-blue-500")} />;
    case 'POST_LIKED':
    case 'COMMENT_ADDED':
      return <Heart className={cn(iconClass, "text-red-500")} />;
    case 'FRIEND_REQUEST':
    case 'FOLLOW_REQUEST':
      return <UserPlus className={cn(iconClass, "text-green-500")} />;
    case 'EVENT_REMINDER':
      return <Calendar className={cn(iconClass, "text-purple-500")} />;
    case 'COURSE_UPDATE':
    case 'ASSIGNMENT_DUE':
      return <BookOpen className={cn(iconClass, "text-orange-500")} />;
    case 'ACHIEVEMENT_UNLOCKED':
      return <Trophy className={cn(iconClass, "text-yellow-500")} />;
    case 'PAYMENT_RECEIVED':
      return <DollarSign className={cn(iconClass, "text-green-600")} />;
    case 'SYSTEM_UPDATE':
      return <Settings className={cn(iconClass, "text-gray-500")} />;
    default:
      return <Bell className={cn(iconClass, "text-blue-500")} />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'CRITICAL':
      return 'destructive';
    case 'URGENT':
      return 'destructive';
    case 'HIGH':
      return 'destructive';
    case 'NORMAL':
      return 'secondary';
    case 'LOW':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  compact = false 
}: NotificationItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (notification.isRead || isMarkingRead) return;
    
    setIsMarkingRead(true);
    try {
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setIsDeleting(false);
    }
  };

  const handleClick = async () => {
    try {
      // Mark as read when clicked
      if (!notification.isRead) {
        await handleMarkAsRead({ preventDefault: () => {} } as React.MouseEvent);
      }
      
      // Facebook-style click handling - Always navigate to specific content
      if (notification.actionUrl && notification.actionUrl !== '/notifications') {
        console.log('🔗 Navigating to actionUrl:', notification.actionUrl);
        router.push(notification.actionUrl);
        return;
      }
      
      // Fallback URL generation for notifications without proper actionUrl
      console.log('⚠️ No actionUrl, generating fallback for:', notification);
      const fallbackUrl = generateFallbackUrl(notification);
      
      if (fallbackUrl && fallbackUrl !== pathname && fallbackUrl !== '/notifications') {
        console.log('🔄 Using fallback URL:', fallbackUrl);
        router.push(fallbackUrl);
        return;
      }
      
      // Last resort: Don't navigate to avoid page reloads, just show feedback
      console.log('ℹ️ No navigation target available for notification:', notification.id);
      toast({
        title: "Notification viewed",
        description: notification.actionUrl 
          ? "This notification link is not available." 
          : "This notification doesn't have a specific link to navigate to.",
      });
      
    } catch (error) {
      console.error('❌ Notification click error:', error);
      toast({
        title: "Navigation Error",
        description: "Unable to navigate to notification content.",
        variant: "destructive",
      });
    }
  };

  /**
   * Generate fallback URLs for notifications without actionUrl
   * Production-ready URL generation based on notification type and data
   */
  const generateFallbackUrl = (notification: NotificationData): string | null => {
    const { type, entityType, entityId, data } = notification;
    
    try {
      // Convert type to uppercase for consistent comparison
      const notificationType = type.toUpperCase();
      
      switch (notificationType) {
        // Post-related notifications
        case 'POST_LIKED':
        case 'POST_COMMENTED':
        case 'POST_SHARED':
          if (entityType === 'POST' && entityId) {
            return `/students-interlinked/posts/${entityId}`;
          }
          if (data?.postId) {
            return `/students-interlinked/posts/${data.postId}`;
          }
          return '/students-interlinked';

        // Comment notifications
        case 'COMMENT_LIKED':
        case 'COMMENT_REPLIED':
          if (data?.postId) {
            return `/students-interlinked/posts/${data.postId}${entityId ? `?comment=${entityId}` : ''}`;
          }
          return '/students-interlinked';

        // Follow/Social notifications
        case 'USER_FOLLOWED':
        case 'FOLLOW_REQUEST':
        case 'FRIEND_REQUEST':
          if (data?.followerId || data?.userId || data?.senderId) {
            const userId = data.followerId || data.userId || data.senderId;
            return `/profile/${userId}`;
          }
          return '/students-interlinked';

        // Message notifications
        case 'MESSAGE_RECEIVED':
        case 'MESSAGE_READ':
          if (data?.conversationId) {
            return `/messages?conversation=${data.conversationId}`;
          }
          if (data?.senderId) {
            return `/messages?user=${data.senderId}`;
          }
          return '/messages';

        // Course notifications
        case 'COURSE_UPDATE':
        case 'ASSIGNMENT_DUE':
        case 'GRADE_POSTED':
          if (data?.courseId) {
            return `/courses/${data.courseId}`;
          }
          return '/courses';

        // Job notifications
        case 'JOB_APPLICATION':
        case 'FREELANCE_PROPOSAL':
          if (data?.jobId) {
            return `/jobs/${data.jobId}`;
          }
          return '/jobs';

        // Profile notifications
        case 'PROFILE_LIKED':
        case 'PROFILE_SHARED':
          if (data?.profileId || data?.userId) {
            return `/profile/${data.profileId || data.userId}`;
          }
          return '/profile';

        // Default fallbacks by category
        default:
          console.log('🔄 Using category-based fallback for type:', notificationType);
          
          // Social-related fallback
          if (notificationType.includes('POST') || notificationType.includes('COMMENT') || notificationType.includes('STORY')) {
            return '/students-interlinked';
          }
          
          // Message-related fallback
          if (notificationType.includes('MESSAGE') || notificationType.includes('CHAT')) {
            return '/messages';
          }
          
          // Course-related fallback
          if (notificationType.includes('COURSE') || notificationType.includes('ASSIGNMENT') || notificationType.includes('GRADE')) {
            return '/courses';
          }
          
          // Job-related fallback
          if (notificationType.includes('JOB') || notificationType.includes('FREELANCE')) {
            return '/jobs';
          }
          
          return null;
      }
    } catch (error) {
      console.error('❌ Error generating fallback URL:', error);
      return null;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  // Enhanced time formatting for better readability
  const getFormattedTime = (createdAt: Date) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    return formatDistanceToNow(notificationTime, { addSuffix: true });
  };

  const formattedTime = getFormattedTime(notification.createdAt);

  return (
    <div
      className={cn(
        "group relative flex items-start space-x-3 px-3 sm:px-4 py-3 transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0",
        {
          "bg-blue-50/30 dark:bg-blue-950/20": !notification.isRead,
          "bg-white dark:bg-transparent": notification.isRead
        }
      )}
      onClick={handleClick}
    >
      {/* Avatar/Icon - Facebook Style */}
      <div className="flex-shrink-0">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          {
            "bg-blue-100 dark:bg-blue-900": !notification.isRead,
            "bg-gray-100 dark:bg-gray-700": notification.isRead
          }
        )}>
          {notification.imageUrl ? (
            <img 
              src={notification.imageUrl} 
              alt="" 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            getNotificationIcon(notification.type)
          )}
        </div>
      </div>

      {/* Content - Simple Facebook Style */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-1 sm:pr-2">
            {/* Main notification text */}
            <p className={cn(
              "text-sm leading-5 break-words",
              {
                "font-medium text-gray-900 dark:text-white": !notification.isRead,
                "text-gray-600 dark:text-gray-400": notification.isRead
              }
            )}>
              <span className="font-semibold">{notification.title}</span>
              {notification.message && (
                <span className="ml-1">{notification.message}</span>
              )}
            </p>
            
            {/* Time and priority */}
            <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {formattedTime}
              </span>
              {notification.priority !== 'NORMAL' && (
                <Badge variant={getPriorityColor(notification.priority)} className="text-xs px-1.5 py-0">
                  {notification.priority}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Unread indicator and actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
            )}
            
            {/* Quick action dropdown - visible on mobile tap/desktop hover */}
            <div className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {!notification.isRead && (
                    <DropdownMenuItem onClick={handleMarkAsRead} disabled={isMarkingRead}>
                      <Eye className="h-3 w-3 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  {notification.actionUrl && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      if (notification.actionUrl) {
                        console.log('🔗 Opening notification source:', notification.actionUrl);
                        router.push(notification.actionUrl);
                      }
                    }}>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Open
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
