// ==========================================
// NOTIFICATIONS API
// ==========================================
// Facebook-style notifications CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  NotificationType, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationChannel, 
  NotificationStatus 
} from '@prisma/client';
import { CreateNotificationRequest } from '@/lib/types/notifications';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const type = url.searchParams.get('type') as NotificationType;
    const category = url.searchParams.get('category') as NotificationCategory;
    const priority = url.searchParams.get('priority') as NotificationPriority;
    const isRead = url.searchParams.get('isRead');
    const status = url.searchParams.get('status') as NotificationStatus;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (type) where.type = type;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (isRead !== null) where.isRead = isRead === 'true';
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get notifications with pagination
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
        include: {
          deliveries: {
            select: {
              channel: true,
              status: true,
              sentAt: true,
              deliveredAt: true,
            }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        status: { not: 'FAILED' }
      }
    });

    return NextResponse.json({
      notifications,
      totalCount,
      unreadCount,
      hasMore: skip + limit < totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create new notification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateNotificationRequest = await request.json();
    const {
      userId,
      institutionId,
      title,
      message,
      shortMessage,
      type,
      category,
      priority = NotificationPriority.NORMAL,
      entityType,
      entityId,
      actionUrl,
      actionLabel,
      imageUrl,
      iconUrl,
      data,
      channels,
      scheduledFor,
      expiresAt,
      groupId,
      templateId
    } = body;

    // Validate required fields
    if (!userId || !title || !message || !type || !category || !channels?.length) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, title, message, type, category, channels' 
      }, { status: 400 });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        institutionId,
        title,
        message,
        shortMessage,
        type,
        category,
        priority,
        entityType,
        entityId,
        actionUrl,
        actionLabel,
        imageUrl,
        iconUrl,
        data: data || undefined,
        channels,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        groupId,
        templateId,
        status: NotificationStatus.PENDING,
        isRead: false,
        sourceSystem: 'api',
      },
      include: {
        deliveries: true
      }
    });    // Emit real-time event using enhanced Kafka for better scalability
    try {
      // Method 1: Use enhanced Kafka notification publishing
      const { publishNotificationEvent, publishNotificationAnalytics } = await import('../../../lib/kafka');
      
      // Publish notification creation event to Kafka
      await publishNotificationEvent({
        type: 'NOTIFICATION_CREATED',
        userId,
        notification,
        channels,
        priority,
        metadata: {
          rooms: [`user:${userId}`, `notifications:${userId}`],
          requiresRealtime: true,
          requiresPush: channels.includes('PUSH'),
          requiresEmail: channels.includes('EMAIL'),
          requiresSMS: channels.includes('SMS'),
          notificationId: notification.id,
          institutionId
        }
      });

      // Track notification delivery analytics
      await publishNotificationAnalytics({
        notificationId: notification.id,
        userId,
        action: 'delivered',
        channel: 'IN_APP'
      });

      console.log(`📡 Published enhanced notification event to Kafka for user ${userId}`);

      // Fallback: Direct Socket.IO emission if Kafka fails
    } catch (kafkaError) {
      console.warn('⚠️ Kafka notification publish failed, using fallback:', kafkaError);
      
      try {
        const { SocketIOEmitter } = await import('../../../lib/socket/socket-emitter');
        const socketEmitter = SocketIOEmitter.getInstance();
        
        await socketEmitter.emitToUser(userId, 'notification:new', { notification });
      } catch (realtimeError) {
        console.error('❌ Both Kafka and direct Socket.IO emission failed:', realtimeError);
      }
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
