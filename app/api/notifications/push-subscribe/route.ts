/**
 * PUSH SUBSCRIPTION API
 * Manages browser push notification subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/push-subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }

    const userId = session.user.id;    // Store or update push subscription
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: subscription.endpoint // Using endpoint as deviceId for now
        }
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        userAgent: request.headers.get('user-agent') || '',
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        deviceId: subscription.endpoint, // Using endpoint as deviceId for now
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        userAgent: request.headers.get('user-agent') || '',
        isActive: true,
        lastUsedAt: new Date()
      }    });

    // Update notification preferences to enable push notifications
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushEnabled: true, updatedAt: new Date() },
      create: {
        userId,
        pushEnabled: true,
        globalEnabled: true,
        emailEnabled: true,
        smsEnabled: false
      }
    });

    console.log(`📱 Push subscription created for user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      subscriptionId: pushSubscription.id 
    });

  } catch (error) {
    console.error('Error creating push subscription:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
