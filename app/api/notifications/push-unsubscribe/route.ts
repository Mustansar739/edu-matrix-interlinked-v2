/**
 * PUSH UNSUBSCRIBE API
 * Removes browser push notification subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/push-unsubscribe - Unsubscribe from push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Deactivate all push subscriptions for user
    await prisma.pushSubscription.updateMany({
      where: { 
        userId,
        isActive: true 
      },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }    });

    // Update notification preferences to disable push notifications
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushEnabled: false, updatedAt: new Date() },
      create: {
        userId,
        pushEnabled: false,
        globalEnabled: true,
        emailEnabled: true,
        smsEnabled: false
      }
    });

    console.log(`📱 Push subscriptions deactivated for user ${userId}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
