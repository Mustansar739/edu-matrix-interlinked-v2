import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unread') === 'true'

    const userId = session.user.id

    // Build where clause
    const where: any = {
      userId
    }

    if (type) {
      where.type = type
    }

    if (unreadOnly) {
      where.isRead = false
    }

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        deliveries: {
          where: {
            channel: 'IN_APP'
          },
          select: {
            status: true,
            deliveredAt: true,
            opened: true,
            openedAt: true
          }
        }
      }
    })

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    // Transform notifications for frontend
    const transformedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type.toLowerCase(),
      title: notification.title,
      message: notification.message,
      actor: notification.data && typeof notification.data === 'object' && notification.data !== null && 'actor' in notification.data
        ? notification.data.actor as any
        : undefined,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      priority: notification.priority.toLowerCase(),
      delivery: notification.deliveries[0] || null
    }))

    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
      unreadCount,
      hasMore: notifications.length === limit
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      targetUserId,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      priority = 'NORMAL',
      category = 'SOCIAL',
      data = {}
    } = await request.json()

    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: type.toUpperCase(),
        category: category.toUpperCase(),
        priority: priority.toUpperCase(),
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        data: {
          ...data,
          senderId: userId
        },
        channels: ['IN_APP']
      }
    })    // Create delivery record
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'IN_APP',
        recipientAddress: targetUserId,
        status: 'PENDING'
      }
    })

    // Real-time integration - Facebook-like notifications
    await StudentsInterlinkedService.onNotificationCreated({
      id: notification.id,
      type: notification.type.toLowerCase(),
      title: notification.title,
      message: notification.message,
      priority: notification.priority.toLowerCase(),
      createdAt: notification.createdAt.toISOString(),
      data: notification.data,
      recipientId: targetUserId
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type.toLowerCase(),
        title: notification.title,
        message: notification.message,
        priority: notification.priority.toLowerCase(),
        createdAt: notification.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
