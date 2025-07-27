// ==========================================
// BATCH DELETE NOTIFICATIONS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/batch-delete - Delete multiple notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Notification IDs are required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Verify all notifications belong to the user
    const notificationCount = await prisma.notification.count({
      where: {
        id: { in: ids },
        userId
      }
    });

    if (notificationCount !== ids.length) {
      return NextResponse.json({ error: 'Some notifications not found or access denied' }, { status: 403 });
    }

    // Delete notifications
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId
      }
    });

    // Emit real-time events for each deleted notification
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      for (const id of ids) {
        await socketEmitter.emitToUser(userId, 'notification:deleted', { id });
      }
    } catch (realtimeError) {
      console.error('Failed to emit notification delete events:', realtimeError);
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: deleteResult.count 
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
