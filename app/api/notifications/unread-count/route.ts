/**
 * =============================================================================
 * NOTIFICATIONS UNREAD COUNT API ENDPOINT - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Provides real-time unread notification count for navbar and other components
 * Handles notification counting with proper filtering and performance optimization
 * 
 * FEATURES:
 * ✅ Fast unread count calculation
 * ✅ Category-based filtering
 * ✅ Priority-based counting
 * ✅ Performance optimized queries
 * ✅ Authentication and security
 * 
 * ENDPOINTS:
 * GET /api/notifications/unread-count
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ==========================================
// UNREAD COUNT ENDPOINT
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    // Build where clause for notifications
    const whereClause: any = {
      userId,
      isRead: false,
      status: 'DELIVERED', // Only count delivered notifications
    };

    // Add category filter if specified
    if (category) {
      whereClause.category = category;
    }

    // Add priority filter if specified
    if (priority) {
      whereClause.priority = priority;
    }

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: whereClause,
    });

    // Get category breakdown for additional context
    const categoryBreakdown = await prisma.notification.groupBy({
      by: ['category'],
      where: {
        userId,
        isRead: false,
        status: 'DELIVERED', // Only count delivered notifications
      },
      _count: {
        id: true,
      },
    });

    // Get priority breakdown
    const priorityBreakdown = await prisma.notification.groupBy({
      by: ['priority'],
      where: {
        userId,
        isRead: false,
        status: 'DELIVERED', // Only count delivered notifications
      },
      _count: {
        id: true,
      },
    });

    // Format breakdown data
    const categoryMap = categoryBreakdown.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const priorityMap = priorityBreakdown.reduce((acc, item) => {
      acc[item.priority] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      unreadCount,
      categoryBreakdown: categoryMap,
      priorityBreakdown: priorityMap,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching notification unread count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// MARK NOTIFICATIONS AS READ
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    if (markAll) {
      // Mark all notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
          status: 'DELIVERED', // Only update delivered notifications
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        markedCount: result.count,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Mark specific notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        isRead: false,
        status: 'DELIVERED', // Only update delivered notifications
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedCount: result.count,
      message: `${result.count} notifications marked as read`,
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
