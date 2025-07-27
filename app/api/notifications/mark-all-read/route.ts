// ==========================================
// MARK ALL NOTIFICATIONS AS READ API - Facebook-Scale
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NotificationStatus } from '@prisma/client';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Get query parameters for filtering
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');

    // Build where clause
    const where: any = {
      userId,
      isRead: false,
      status: NotificationStatus.SENT
    };

    if (category) where.category = category;
    if (type) where.type = type;

    // Update notifications
    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: now
      }
    });

    // Invalidate cache
    await redis.del(`notif:counts:${userId}`);

    // Emit real-time event
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToUser(userId, 'notification:all_marked_read', {
        count: result.count,
        category,
        type,
        timestamp: now.toISOString()
      });
      
      // Also emit updated count
      await socketEmitter.emitToUser(userId, 'notification:count_updated', {
        unreadCount: 0
      });
    } catch (realtimeError) {
      console.error('Failed to emit mark all read event:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      markedCount: result.count,
      message: `${result.count} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
