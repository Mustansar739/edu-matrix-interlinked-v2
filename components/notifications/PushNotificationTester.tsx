/**
 * PUSH NOTIFICATION TEST SUITE
 * Test browser push notifications functionality
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Send,
  Bell,
  Monitor,
  Smartphone
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  message: string;
}

export function PushNotificationTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateResult = (name: string, status: 'pass' | 'fail', message: string) => {
    setResults(prev => 
      prev.map(result => 
        result.name === name ? { ...result, status, message } : result
      )
    );
  };

  const addResult = (name: string, status: 'pending' | 'pass' | 'fail', message: string) => {
    setResults(prev => [...prev, { name, status, message }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Browser Support
    addResult('Browser Support', 'pending', 'Checking...');
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    if (hasServiceWorker && hasPushManager && hasNotification) {
      updateResult('Browser Support', 'pass', 'All required APIs available');
    } else {
      updateResult('Browser Support', 'fail', 
        `Missing: ${!hasServiceWorker ? 'ServiceWorker ' : ''}${!hasPushManager ? 'PushManager ' : ''}${!hasNotification ? 'Notification' : ''}`
      );
    }

    // Test 2: Service Worker Registration
    addResult('Service Worker', 'pending', 'Registering...');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      updateResult('Service Worker', 'pass', `Registered: ${registration.scope}`);
    } catch (error) {
      updateResult('Service Worker', 'fail', `Registration failed: ${(error as Error).message}`);
    }

    // Test 3: Notification Permission
    addResult('Permission', 'pending', 'Checking...');
    const permission = Notification.permission;
    if (permission === 'granted') {
      updateResult('Permission', 'pass', 'Permission granted');
    } else if (permission === 'denied') {
      updateResult('Permission', 'fail', 'Permission denied - please enable in browser');
    } else {
      try {
        const newPermission = await Notification.requestPermission();
        if (newPermission === 'granted') {
          updateResult('Permission', 'pass', 'Permission granted after request');
        } else {
          updateResult('Permission', 'fail', 'Permission request denied');
        }
      } catch (error) {
        updateResult('Permission', 'fail', `Permission request failed: ${(error as Error).message}`);
      }
    }

    // Test 4: Push Subscription
    addResult('Push Subscription', 'pending', 'Creating...');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        updateResult('Push Subscription', 'pass', 'Existing subscription found');
      } else {
        // Try to subscribe
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
          'BPbfvNObp2dQ7U8EMawarasgV_gFa6yPqL13sFll4uVnJ_rfhyq6rQOuqXWLNhthBebqb3d9xvTenU6CQO7B6P8';
        
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
        
        updateResult('Push Subscription', 'pass', 'New subscription created');
      }
    } catch (error) {
      updateResult('Push Subscription', 'fail', `Subscription failed: ${(error as Error).message}`);
    }

    // Test 5: Local Notification
    addResult('Local Notification', 'pending', 'Testing...');
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification('🧪 Test Notification', {
          body: 'Local notification test successful!',
          icon: '/icons/notification-icon.png',
          tag: 'test-local'
        });
        
        setTimeout(() => notification.close(), 3000);
        updateResult('Local Notification', 'pass', 'Local notification displayed');
      } catch (error) {
        updateResult('Local Notification', 'fail', `Local notification failed: ${(error as Error).message}`);
      }
    } else {
      updateResult('Local Notification', 'fail', 'Permission not granted');
    }

    // Test 6: API Subscription Endpoint
    addResult('API Subscription', 'pending', 'Testing...');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const response = await fetch('/api/notifications/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });
        
        if (response.ok) {
          updateResult('API Subscription', 'pass', 'API subscription endpoint working');
        } else {
          updateResult('API Subscription', 'fail', `API error: ${response.status} ${response.statusText}`);
        }
      } else {
        updateResult('API Subscription', 'fail', 'No subscription available');
      }
    } catch (error) {
      updateResult('API Subscription', 'fail', `API request failed: ${(error as Error).message}`);
    }

    // Test 7: Push Send API
    addResult('Push Send API', 'pending', 'Testing...');
    try {
      const response = await fetch('/api/notifications/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🧪 API Test',
          message: 'Push send API test successful!',
          test: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        updateResult('Push Send API', 'pass', `API test sent: ${result.message}`);
      } else {
        updateResult('Push Send API', 'fail', `API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      updateResult('Push Send API', 'fail', `API request failed: ${(error as Error).message}`);
    }

    setIsRunning(false);
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const totalCount = results.length;
    
    toast({
      title: '🧪 Tests Complete',
      description: `${passCount}/${totalCount} tests passed`,
      variant: passCount === totalCount ? 'default' : 'destructive'
    });
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
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
  };

  const getStatusIcon = (status: 'pending' | 'pass' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Push Notification Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Button */}
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {passCount} Passed
            </Badge>
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {failCount} Failed
            </Badge>
          </div>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{result.name}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Device Info */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-2">Device Information</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              {navigator.userAgent.includes('Mobile') ? 
                <Smartphone className="h-4 w-4" /> : 
                <Monitor className="h-4 w-4" />
              }
              <span>{navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Device'}</span>
            </div>
            <p>Browser: {navigator.userAgent.split(' ')[0]}</p>
            <p>Platform: {navigator.platform}</p>
            <p>Online: {navigator.onLine ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
