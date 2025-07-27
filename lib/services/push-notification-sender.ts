/**
 * SERVER-SIDE PUSH NOTIFICATION SENDER
 * Sends browser push notifications using web-push library
 */

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

interface PushNotificationPayload {
  title: string;
  message: string;
  notificationId?: string;
  actionUrl?: string;
  imageUrl?: string;
  icon?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationSender {
  private static instance: PushNotificationSender | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.configure();
  }

  static getInstance(): PushNotificationSender {
    if (!PushNotificationSender.instance) {
      PushNotificationSender.instance = new PushNotificationSender();
    }
    return PushNotificationSender.instance;
  }

  /**
   * Configure VAPID keys for web-push
   */
  private configure(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:notifications@edumatrix.com';

    if (!publicKey || !privateKey) {
      console.warn('🚫 VAPID keys not configured. Generate them using: npx web-push generate-vapid-keys');
      return;
    }

    webpush.setVapidDetails(email, publicKey, privateKey);
    this.isConfigured = true;
    console.log('✅ Push notification service configured');
  }

  /**
   * Generate VAPID keys (utility function)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(
    userId: string, 
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured) {
      console.error('🚫 Push notification service not configured');
      return { success: 0, failed: 0 };
    }

    try {
      // Get all active push subscriptions for user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true
        }
      });

      if (subscriptions.length === 0) {
        console.log(`📱 No push subscriptions found for user ${userId}`);
        return { success: 0, failed: 0 };
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendToSubscription(sub, payload))
      );

      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`📱 Push notifications sent to user ${userId}: ${success} success, ${failed} failed`);

      return { success, failed };
    } catch (error) {
      console.error('📱 Failed to send push notifications to user:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[], 
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    const totals = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          acc.success += result.value.success;
          acc.failed += result.value.failed;
        } else {
          acc.failed += 1;
        }
        return acc;
      },
      { success: 0, failed: 0 }
    );

    console.log(`📱 Batch push notifications sent: ${totals.success} success, ${totals.failed} failed`);
    return totals;
  }

  /**
   * Send to specific subscription
   */
  private async sendToSubscription(
    subscription: any,
    payload: PushNotificationPayload
  ): Promise<void> {
    const pushSubscription: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey
      }
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.message, // Alias for compatibility
      icon: payload.icon || '/icons/notification-icon.png',
      badge: '/icons/notification-badge.png',
      image: payload.imageUrl,
      tag: 'edu-matrix-notification',
      renotify: true,
      requireInteraction: payload.priority === 'HIGH' || payload.priority === 'URGENT',
      vibrate: [200, 100, 200],
      data: {
        notificationId: payload.notificationId,
        actionUrl: payload.actionUrl || '/notifications',
        priority: payload.priority,
        timestamp: new Date().toISOString(),
        ...payload.data
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'mark-read',
          title: 'Mark as Read',
          icon: '/icons/check-icon.png'
        }
      ]
    });

    try {
      const result = await webpush.sendNotification(pushSubscription, notificationPayload);
      console.log('📱 Push notification sent successfully:', result.statusCode);
    } catch (error: any) {
      console.error('📱 Failed to send push notification:', error);
      
      // Handle expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('📱 Subscription expired, marking as inactive');
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false }
        });
      }
      
      throw error;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    const payload: PushNotificationPayload = {
      title: '🔔 Test Notification',
      message: 'Push notifications are working correctly!',
      actionUrl: '/notifications',
      priority: 'NORMAL',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    const result = await this.sendToUser(userId, payload);
    return result.success > 0;
  }

  /**
   * Clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const expiredSubs = await prisma.pushSubscription.findMany({
        where: {
          isActive: true,
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
          }
        }
      });

      let cleanedCount = 0;

      for (const sub of expiredSubs) {
        try {
          // Test if subscription is still valid
          await this.sendToSubscription(sub, {
            title: 'Test',
            message: 'Test'
          });
        } catch (error) {
          // Mark as inactive if failed
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false }
          });
          cleanedCount++;
        }
      }

      console.log(`📱 Cleaned up ${cleanedCount} expired push subscriptions`);
      return cleanedCount;
    } catch (error) {
      console.error('📱 Failed to cleanup expired subscriptions:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const pushNotificationSender = PushNotificationSender.getInstance();
export default PushNotificationSender;
