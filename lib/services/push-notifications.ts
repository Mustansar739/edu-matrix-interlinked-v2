/**
 * BROWSER PUSH NOTIFICATION SERVICE
 * Handles browser push notifications for mobile and desktop
 */

'use client';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  message: string;
  notificationId?: string;
  actionUrl?: string;
  imageUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
}

class BrowserPushNotificationService {
  private static instance: BrowserPushNotificationService | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  static getInstance(): BrowserPushNotificationService {
    if (!BrowserPushNotificationService.instance) {
      BrowserPushNotificationService.instance = new BrowserPushNotificationService();
    }
    return BrowserPushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): void {
    this.isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('📱 Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('📱 Service Worker registered successfully');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription);
      }

      return true;
    } catch (error) {
      console.error('📱 Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('📱 Notification permission:', permission);

    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration || !this.isSupported) {
      console.error('📱 Service Worker not registered');
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('📱 Notification permission denied');
      return null;
    }

    try {
      // VAPID public key - you need to generate this
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI8kJVRoWPzq-8xMZlU8rOjhPp2VxY6iHhPr2zy9_-fh2Ot8Q9QlAn0j4U';

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('📱 Push subscription created:', this.subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('📱 Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      console.log('📱 Push subscription removed');

      // Remove from server
      await this.removeSubscriptionFromServer();

      this.subscription = null;
      return true;
    } catch (error) {
      console.error('📱 Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Test notification (for testing purposes)
   */
  async testNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      console.warn('📱 Cannot show test notification - permission denied');
      return;
    }    const notification = new Notification(payload.title, {
      body: payload.message,
      icon: '/icons/notification-icon.png',
      tag: 'test-notification',
      data: payload.data
    });

    notification.onclick = () => {
      if (payload.actionUrl) {
        window.open(payload.actionUrl, '_blank');
      }
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('📱 Push subscription sent to server');
    } catch (error) {
      console.error('📱 Failed to send subscription to server:', error);
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/push-unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('📱 Push subscription removed from server');
    } catch (error) {
      console.error('📱 Failed to remove subscription from server:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const pushNotificationService = BrowserPushNotificationService.getInstance();
export default BrowserPushNotificationService;
