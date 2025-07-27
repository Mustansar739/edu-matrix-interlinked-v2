/**
 * PUSH NOTIFICATION MANAGER COMPONENT
 * Handles browser push notification subscription UI
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TestTube
} from 'lucide-react';
import { pushNotificationService } from '@/lib/services/push-notifications';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userAgent, setUserAgent] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    checkSupport();
    getUserAgent();
  }, []);  const checkSupport = async () => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      await pushNotificationService.initialize();
      setPermission(pushNotificationService.getPermissionStatus());
      // Check if user has an active subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(subscription !== null);
    }
  };

  const getUserAgent = () => {
    if (typeof window !== 'undefined') {
      setUserAgent(navigator.userAgent);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const subscription = await pushNotificationService.subscribe();
      
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        toast({
          title: '✅ Push Notifications Enabled',
          description: 'You will now receive browser notifications',
        });
      } else {
        toast({
          title: '❌ Subscription Failed',
          description: 'Could not enable push notifications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribe();
      
      if (success) {
        setIsSubscribed(false);
        toast({
          title: '🔕 Push Notifications Disabled',
          description: 'You will no longer receive browser notifications',
        });
      } else {
        toast({
          title: '❌ Error',
          description: 'Failed to disable push notifications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.testNotification({
        title: '🔔 Test Notification',
        message: 'Push notifications are working correctly!',
        actionUrl: '/notifications'
      });
      
      toast({
        title: '📱 Test Sent',
        description: 'Check for the test notification',
      });
    } catch (error) {
      toast({
        title: '❌ Test Failed',
        description: 'Could not send test notification',
        variant: 'destructive',
      });
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { icon: CheckCircle, text: 'Granted', color: 'text-green-600' };
      case 'denied':
        return { icon: XCircle, text: 'Denied', color: 'text-red-600' };
      default:
        return { icon: AlertTriangle, text: 'Not Requested', color: 'text-yellow-600' };
    }
  };

  const getDeviceType = () => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return { icon: Smartphone, text: 'Mobile Device' };
    }
    return { icon: Monitor, text: 'Desktop/Laptop' };
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser does not support push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To receive browser notifications, please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getPermissionStatus();
  const deviceInfo = getDeviceType();
  const StatusIcon = statusInfo.icon;
  const DeviceIcon = deviceInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Browser Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified even when the website is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Permission Status</p>
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
              <span className="text-sm">{statusInfo.text}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Device Type</p>
            <div className="flex items-center gap-2">
              <DeviceIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm">{deviceInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Enable Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive notifications on this device
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Subscription Badge */}
        {isSubscribed && (
          <Badge variant="secondary" className="w-fit">
            ✅ Subscribed to push notifications
          </Badge>
        )}

        {permission === 'denied' && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Notifications Blocked</p>
            </div>
            <p className="text-sm text-red-600 mt-1">
              To enable notifications, click the 🔒 icon in your browser&apos;s address bar and allow notifications.
            </p>
          </div>
        )}

        {/* Test Button */}
        {isSubscribed && (
          <Button
            variant="outline"
            onClick={handleTestNotification}
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
        )}

        {/* Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Notifications will appear even when the website is closed</p>
          <p>• Works on desktop and mobile browsers</p>
          <p>• You can disable this anytime in your browser settings</p>
        </div>
      </CardContent>
    </Card>
  );
}
