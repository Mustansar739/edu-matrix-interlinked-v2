/**
 * SEND PUSH NOTIFICATION API
 * POST /api/notifications/push-send
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pushNotificationSender } from '@/lib/services/push-notification-sender';

interface SendPushNotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
  test?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendPushNotificationRequest = await request.json();
    const {
      userId,
      userIds,
      title,
      message,
      actionUrl,
      imageUrl,
      priority = 'NORMAL',
      data,
      test = false
    } = body;

    if (!title || !message) {
      return NextResponse.json({ 
        error: 'Title and message are required' 
      }, { status: 400 });
    }

    const payload = {
      title,
      message,
      actionUrl: actionUrl || '/notifications',
      imageUrl,
      priority,
      data: {
        ...data,
        test,
        sentBy: session.user.id,
        timestamp: new Date().toISOString()
      }
    };

    let result;

    if (test) {
      // Send test notification to current user
      result = await pushNotificationSender.sendTestNotification(session.user.id);
      return NextResponse.json({ 
        success: result,
        message: result ? 'Test notification sent' : 'Failed to send test notification'
      });
    } else if (userId) {
      // Send to specific user
      result = await pushNotificationSender.sendToUser(userId, payload);
    } else if (userIds && userIds.length > 0) {
      // Send to multiple users
      result = await pushNotificationSender.sendToUsers(userIds, payload);
    } else {
      return NextResponse.json({ 
        error: 'userId or userIds required' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      sent: result.success,
      failed: result.failed,
      message: `Push notification sent: ${result.success} success, ${result.failed} failed`
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
