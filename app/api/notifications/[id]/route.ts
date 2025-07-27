// ==========================================
// INDIVIDUAL NOTIFICATION API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateNotificationRequest } from '@/lib/types/notifications';

// GET /api/notifications/[id] - Get single notification
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id
      },
      include: {
        deliveries: true,
        interactions: true
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] - Update notification
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;
    const body: UpdateNotificationRequest = await request.json();

    // Verify notification belongs to user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update notification
    const updateData: any = {};
    
    if (body.isRead !== undefined) {
      updateData.isRead = body.isRead;
      if (body.isRead) {
        updateData.readAt = new Date();
      }
    }

    if (body.dismissedAt !== undefined) {
      updateData.dismissedAt = body.dismissedAt ? new Date(body.dismissedAt) : null;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
      include: {
        deliveries: true
      }
    });

    // Emit real-time event
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      if (body.isRead) {
        await socketEmitter.emitToUser(session.user.id, 'notification:read', { 
          notificationId,
          readAt: updatedNotification.readAt 
        });
      }
      
      await socketEmitter.emitToUser(session.user.id, 'notification:updated', { 
        notification: updatedNotification 
      });
    } catch (realtimeError) {
      console.error('Failed to emit notification update event:', realtimeError);
    }

    return NextResponse.json({ notification: updatedNotification });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;

    // Verify notification belongs to user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete notification (this will cascade delete deliveries and interactions)
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    // Emit real-time event
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToUser(session.user.id, 'notification:deleted', { 
        id: notificationId 
      });
    } catch (realtimeError) {
      console.error('Failed to emit notification delete event:', realtimeError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
