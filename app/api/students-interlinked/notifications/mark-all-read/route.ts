import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    const userId = session.user.id

    // Get all unread notifications
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      select: { id: true }
    })

    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    // Update delivery status
    await prisma.notificationDelivery.updateMany({
      where: {
        notification: {
          userId
        },
        opened: false
      },
      data: {
        opened: true,
        openedAt: new Date()
      }
    })

    // Real-time integration for each notification marked as read
    for (const notification of unreadNotifications) {
      await StudentsInterlinkedService.onNotificationRead(notification.id, userId)
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
