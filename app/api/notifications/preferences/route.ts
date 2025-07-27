// ==========================================
// NOTIFICATION PREFERENCES API
// ==========================================
// Facebook-scale notification preferences management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { DigestFrequency } from '@prisma/client';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Try to get from cache first
    const cacheKey = `notif:prefs:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Get preferences from database
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          globalEnabled: true,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          socialNotifications: true,
          educationalNotifications: true,
          technicalNotifications: true,
          financialNotifications: true,
          marketingNotifications: false,
          digestFrequency: DigestFrequency.DAILY,
          timezone: 'UTC',
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00'
        }
      });
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(preferences));

    return NextResponse.json(preferences);

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      globalEnabled,
      emailEnabled,
      pushEnabled,
      smsEnabled,
      socialNotifications,
      educationalNotifications,
      technicalNotifications,
      financialNotifications,
      marketingNotifications,
      digestFrequency,
      timezone,
      quietHoursStart,
      quietHoursEnd,
      notificationSound,
      vibrationEnabled,
      emailDigestEnabled,
      mobileNotificationsEnabled,
      desktopNotificationsEnabled
    } = body;

    // Update preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        globalEnabled: globalEnabled ?? undefined,
        emailEnabled: emailEnabled ?? undefined,
        pushEnabled: pushEnabled ?? undefined,
        smsEnabled: smsEnabled ?? undefined,
        socialNotifications: socialNotifications ?? undefined,
        educationalNotifications: educationalNotifications ?? undefined,
        technicalNotifications: technicalNotifications ?? undefined,
        financialNotifications: financialNotifications ?? undefined,
        marketingNotifications: marketingNotifications ?? undefined,
        digestFrequency: digestFrequency ?? undefined,
        timezone: timezone ?? undefined,        quietHoursStart: quietHoursStart ?? undefined,
        quietHoursEnd: quietHoursEnd ?? undefined,
        notificationSound: notificationSound ?? undefined,
        vibrationEnabled: vibrationEnabled ?? undefined,
        emailDigestEnabled: emailDigestEnabled ?? undefined,
        mobileNotificationsEnabled: mobileNotificationsEnabled ?? undefined,
        desktopNotificationsEnabled: desktopNotificationsEnabled ?? undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        globalEnabled: globalEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
        socialNotifications: socialNotifications ?? true,
        educationalNotifications: educationalNotifications ?? true,
        technicalNotifications: technicalNotifications ?? true,
        financialNotifications: financialNotifications ?? true,
        marketingNotifications: marketingNotifications ?? false,
        digestFrequency: digestFrequency ?? DigestFrequency.DAILY,        timezone: timezone ?? 'UTC',
        quietHoursStart: quietHoursStart ?? '22:00',
        quietHoursEnd: quietHoursEnd ?? '08:00',
        notificationSound: notificationSound ?? true,
        vibrationEnabled: vibrationEnabled ?? true,
        emailDigestEnabled: emailDigestEnabled ?? true,
        mobileNotificationsEnabled: mobileNotificationsEnabled ?? true,
        desktopNotificationsEnabled: desktopNotificationsEnabled ?? true
      }
    });

    // Invalidate cache
    const cacheKey = `notif:prefs:${userId}`;
    await redis.del(cacheKey);

    // Emit real-time event for preference changes
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToUser(userId, 'notification:preferences_updated', {
        preferences,
        timestamp: new Date().toISOString()
      });
    } catch (realtimeError) {
      console.error('Failed to emit preferences update event:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications/preferences/reset - Reset preferences to defaults
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Reset to default preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        globalEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        socialNotifications: true,
        educationalNotifications: true,
        systemNotifications: true,
        financialNotifications: true,
        marketingNotifications: false,
        digestFrequency: DigestFrequency.DAILY,
        timezone: 'UTC',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationSound: true,
        vibrationEnabled: true,
        emailDigestEnabled: true,
        mobileNotificationsEnabled: true,
        desktopNotificationsEnabled: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        globalEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        socialNotifications: true,
        educationalNotifications: true,
        systemNotifications: true,
        financialNotifications: true,
        marketingNotifications: false,
        digestFrequency: DigestFrequency.DAILY,
        timezone: 'UTC',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationSound: true,
        vibrationEnabled: true,
        emailDigestEnabled: true,
        mobileNotificationsEnabled: true,
        desktopNotificationsEnabled: true
      }
    });

    // Invalidate cache
    const cacheKey = `notif:prefs:${userId}`;
    await redis.del(cacheKey);

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences reset to defaults'
    });

  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
