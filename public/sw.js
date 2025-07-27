/**
 * SERVICE WORKER FOR PUSH NOTIFICATIONS
 * Handles browser push notifications when app is closed
 */

const CACHE_NAME = 'edu-matrix-notifications-v1';
const NOTIFICATION_TAG = 'edu-matrix-notification';

// Install event
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installed for push notifications');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker activated for push notifications');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);

  if (!event.data) {
    console.log('📱 No push data received');
    return;
  }

  const data = event.data.json();
  console.log('📱 Push data:', data);

  const options = {
    title: data.title || 'New Notification',
    body: data.message || data.body || 'You have a new notification',
    icon: '/icons/notification-icon.png',
    badge: '/icons/notification-badge.png',
    image: data.imageUrl || data.image,
    tag: NOTIFICATION_TAG,
    renotify: true,
    requireInteraction: data.priority === 'HIGH' || data.priority === 'URGENT',
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      notificationId: data.notificationId,
      actionUrl: data.actionUrl,
      userId: data.userId,
      timestamp: Date.now(),
      ...data.data
    },
    actions: [
      {
        action: 'view',
        title: '👀 View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'mark-read',
        title: '✅ Mark as Read',
        icon: '/icons/check-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Notification', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event);

  const { notification, action } = event;
  const data = notification.data;

  event.notification.close();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });

    // Handle different actions
    if (action === 'mark-read') {
      // Mark notification as read via API
      try {
        await fetch(`/api/notifications/${data.notificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        });
        console.log('📱 Notification marked as read');
      } catch (error) {
        console.error('📱 Failed to mark notification as read:', error);
      }
      return;
    }

    // Default action or 'view' action
    const urlToOpen = data.actionUrl || '/notifications';

    // Check if app is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          data: {
            notificationId: data.notificationId,
            actionUrl: urlToOpen
          }
        });
        return;
      }
    }

    // Open new window if app is not open
    await self.clients.openWindow(urlToOpen);
  })());
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('📱 Notification closed:', event);
  
  // Track notification dismissal (optional)
  const data = event.notification.data;
  if (data.notificationId) {
    // Could send analytics event here
    console.log('📱 Notification dismissed:', data.notificationId);
  }
});

// Handle background sync (for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync pending notifications when back online
      syncNotifications()
    );
  }
});

async function syncNotifications() {
  try {
    // Fetch any pending notifications when back online
    const response = await fetch('/api/notifications/sync');
    if (response.ok) {
      const notifications = await response.json();
      console.log('📱 Synced notifications:', notifications.length);
    }
  } catch (error) {
    console.error('📱 Failed to sync notifications:', error);
  }
}
