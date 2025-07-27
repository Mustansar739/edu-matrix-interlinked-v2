// ==========================================
// NOTIFICATIONS COUNTS API - Facebook-Scale
// ==========================================
// Enhanced notification counts with caching and detailed breakdowns

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { 
  NotificationType, 
  NotificationCategory, 
  NotificationStatus 
} from '@prisma/client';

// GET /api/notifications/counts - Get notification counts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const useCache = url.searchParams.get('cache') !== 'false';

    // Try to get from cache first
    if (useCache) {
      const cacheKey = `notif:counts:${userId}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }

    // Get counts from database
    const [
      totalCount,
      unreadCount,
      socialUnread,
      educationalUnread,
      systemUnread,
      highPriorityUnread,
      todayCount,
      weekCount
    ] = await Promise.all([
      // Total notifications
      prisma.notification.count({
        where: {
          userId,
          status: { not: NotificationStatus.FAILED }
        }
      }),

      // Unread notifications
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT
        }
      }),

      // Social notifications unread
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT,
          category: NotificationCategory.SOCIAL
        }
      }),

      // Educational notifications unread
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT,
          category: NotificationCategory.EDUCATIONAL
        }
      }),

      // System notifications unread
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT,
          category: NotificationCategory.ADMINISTRATIVE
        }
      }),

      // High priority unread
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT,
          priority: 'HIGH'
        }
      }),

      // Today's notifications
      prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.SENT,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // This week's notifications
      prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.SENT,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Get counts by type
    const typeCountsRaw = await prisma.notification.groupBy({
      by: ['type'],
      where: {
        userId,
        isRead: false,
        status: NotificationStatus.SENT
      },
      _count: {
        id: true
      }
    });

    const typeCounts: Record<string, number> = {};
    typeCountsRaw.forEach(item => {
      typeCounts[item.type] = item._count.id;
    });

    // Construct response
    const counts = {
      total: totalCount,
      unread: unreadCount,
      categories: {
        social: socialUnread,
        educational: educationalUnread,
        system: systemUnread
      },
      priority: {
        high: highPriorityUnread
      },
      timeframes: {
        today: todayCount,
        week: weekCount
      },
      byType: typeCounts,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result for 2 minutes
    if (useCache) {
      const cacheKey = `notif:counts:${userId}`;
      await redis.setex(cacheKey, 120, JSON.stringify(counts));
    }

    return NextResponse.json(counts);

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications/counts/invalidate - Invalidate counts cache
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = `notif:counts:${userId}`;
    
    await redis.del(cacheKey);
    
    return NextResponse.json({ success: true, message: 'Cache invalidated' });

  } catch (error) {
    console.error('Error invalidating counts cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
