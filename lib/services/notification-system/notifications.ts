/**
 * NOTIFICATION SERVICE - PRODUCTION READY
 * Handles all notification operations with proper error handling and URL resolution
 * 
 * Features:
 * - Server-side API calls with absolute URLs
 * - Redis caching for performance
 * - Kafka event publishing for real-time updates
 * - Comprehensive error handling
 * - Production-ready configuration
 */

import { redis } from '@/lib/redis';
import { publishEvent } from '@/lib/kafka';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel
} from '@prisma/client';

interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  entityType?: string;
  entityId?: string;
  data?: Record<string, any>;
}

interface NotificationFilters {
  type?: NotificationType;
  category?: NotificationCategory;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
}

class NotificationService {
  private static instance: NotificationService | null = null;
  private apiBaseUrl: string;

  private constructor() {
    // Get base URL from environment with fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    this.apiBaseUrl = `${baseUrl}/api/notifications`;
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create notification via API
   */
  async createNotification(data: CreateNotificationData): Promise<any> {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          category: data.category || NotificationCategory.ADMINISTRATIVE,
          priority: data.priority || NotificationPriority.NORMAL,
          channels: data.channels || [NotificationChannel.IN_APP]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Fetch notifications with pagination
   */
  async fetchNotifications(
    page = 1,
    limit = 20,
    filters?: NotificationFilters
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification counts
   */
  async getNotificationCounts(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/counts`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to get notification counts:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/mark-all-read`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/preferences`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to get preferences:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Publish notification event to Kafka (server-side only)
   */
  async publishNotificationEvent(eventType: string, data: any): Promise<void> {
    try {
      await publishEvent('notification-events', {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to publish notification event:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Cache unread count
   */
  async cacheUnreadCount(userId: string, count: number): Promise<void> {
    try {
      await redis.setex(`notif:count:${userId}`, 300, count.toString());
    } catch (error) {
      console.error('Failed to cache unread count:', error);
    }
  }

  /**
   * Get cached unread count
   */
  async getCachedUnreadCount(userId: string): Promise<number | null> {
    try {
      const cached = await redis.get(`notif:count:${userId}`);
      return cached ? parseInt(cached, 10) : null;
    } catch (error) {
      console.error('Failed to get cached unread count:', error);
      return null;
    }
  }

  /**
   * Invalidate notification cache for user
   */
  async invalidateCache(userId: string): Promise<void> {
    try {
      const keys = [
        `notif:count:${userId}`,
        `notif:recent:${userId}`,
        `notif:prefs:${userId}`
      ];
      
      await redis.del(...keys);
    } catch (error) {
      console.error('Failed to invalidate notification cache:', error);
    }
  }
}

// Export singleton
export const notificationService = NotificationService.getInstance();
export default NotificationService;
