// ==========================================
// INDIVIDUAL SCHEDULED MESSAGE API - FACEBOOK MESSENGER STYLE
// ==========================================
// Manage individual scheduled messages (view, update, cancel)
// This API endpoint handles operations on specific scheduled messages identified by ID

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/cache';

// Schema for updating a scheduled message
const updateScheduledMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  scheduledFor: z.string().datetime().optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
});

// GET /api/messages/schedule/[id] - Get specific scheduled message details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate message ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Find scheduled message owned by current user
    const scheduledMessage = await prisma.message.findFirst({
      where: {
        id,
        senderId: session.user.id,
        isScheduled: true,
        scheduledFor: { gte: new Date() }, // Only future messages
      },
      select: {
        id: true,
        conversationId: true,
        content: true,
        messageType: true,
        mediaUrls: true,
        mentions: true,
        scheduledFor: true,
        createdAt: true,
        updatedAt: true,
        conversation: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    if (!scheduledMessage) {
      return NextResponse.json({ 
        error: 'Scheduled message not found or already sent' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      scheduledMessage,
    });

  } catch (error) {
    console.error('Get scheduled message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/messages/schedule/[id] - Update a scheduled message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for updates
    const rateLimit = await checkRateLimit(`update_schedule:${session.user.id}`, 10, 3600); // 10/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many scheduled message updates',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { id } = await params;
    const data = updateScheduledMessageSchema.parse(await request.json());

    // Validate message ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Validate scheduled time is in the future if provided
    if (data.scheduledFor) {
      const scheduledTime = new Date(data.scheduledFor);
      const now = new Date();
      if (scheduledTime <= now) {
        return NextResponse.json({ 
          error: 'Scheduled time must be in the future' 
        }, { status: 400 });
      }
    }

    // Check if message exists and belongs to user
    const existingMessage = await prisma.message.findFirst({
      where: {
        id,
        senderId: session.user.id,
        isScheduled: true,
        scheduledFor: { gte: new Date() }, // Only future messages
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ 
        error: 'Scheduled message not found or already sent' 
      }, { status: 404 });
    }

    // Update the scheduled message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        ...(data.content && { content: data.content }),
        ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        ...(data.messageType && { messageType: data.messageType }),
        ...(data.mediaUrls && { mediaUrls: data.mediaUrls }),
        ...(data.mentions && { mentions: data.mentions }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        conversationId: true,
        content: true,
        messageType: true,
        scheduledFor: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled message updated successfully',
      scheduledMessage: updatedMessage,
    });

  } catch (error) {
    console.error('Update scheduled message error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/schedule/[id] - Cancel a scheduled message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for deletions
    const rateLimit = await checkRateLimit(`delete_schedule:${session.user.id}`, 20, 3600); // 20/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many cancellation requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { id } = await params;

    // Validate message ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Check if message exists and belongs to user
    const existingMessage = await prisma.message.findFirst({
      where: {
        id,
        senderId: session.user.id,
        isScheduled: true,
        scheduledFor: { gte: new Date() }, // Only future messages
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ 
        error: 'Scheduled message not found or already sent' 
      }, { status: 404 });
    }

    // Delete the scheduled message
    await prisma.message.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled message cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel scheduled message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
