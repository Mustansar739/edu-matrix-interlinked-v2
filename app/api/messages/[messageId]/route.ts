// ==========================================
// INDIVIDUAL MESSAGE API - PRODUCTION READY
// ==========================================
// Edit, delete, and manage individual messages with Redis caching and Kafka events

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod'
import { cacheOrFetch, deleteBatchCache, checkRateLimit } from '@/lib/cache'
import { publishEvent } from '@/lib/kafka'

// Validation Schemas
const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
})

// Utility function to publish realtime events via Kafka with fallback
async function publishRealtimeEvent(eventType: string, data: any, metadata: any) {
  try {
    await publishEvent('messages', {
      type: eventType,
      data,
      metadata,
      timestamp: new Date().toISOString()
    })
  } catch (kafkaError) {
    console.error('Kafka event publishing failed:', kafkaError)
    // Fallback to direct HTTP call to Socket.IO server if needed
    // You can implement this if required for your setup
  }
}

// Fetch user data for cross-schema relations
async function fetchUserData(userIds: string[]) {
  if (userIds.length === 0) return []
  
  return await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      profilePictureUrl: true,
      username: true,
    }
  })
}

// GET /api/messages/[messageId] - Get single message with caching
export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;    // Get message with all related data using cache
    const message = await cacheOrFetch(
      `message:${messageId}:detailed`,
      async () => {
        return await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            reactions: true,
            reads: true,
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true,
                messageType: true,
                createdAt: true,
              },
            },
            replies: {
              include: {
                reactions: true,
                reads: true,
              },
            },
          },
        });
      },
      1800 // 30 minutes
    );

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is participant in the conversation (with caching)
    const hasAccess = await cacheOrFetch(
      `conversation:${message.conversationId}:participant:${session.user.id}`,
      async () => {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: message.conversationId,
            userId: session.user.id,
            isHidden: false,
          },
        });
        return !!participant;
      },
      1800 // 30 minutes
    );    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Enhance message with user data
    if (message) {
      const allUserIds = [
        message.senderId,
        message.replyTo?.senderId,
        ...message.reactions.map(r => r.userId),
        ...message.reads.map(r => r.userId),
        ...message.replies.flatMap(reply => [
          reply.senderId,
          ...reply.reactions.map(r => r.userId),
          ...reply.reads.map(r => r.userId)
        ])
      ].filter(Boolean) as string[];

      const uniqueUserIds = [...new Set(allUserIds)];
      const userData = await fetchUserData(uniqueUserIds);
      const userMap = new Map(userData.map(user => [user.id, user]));

      // Enhance message with user data
      const enhancedMessage = {
        ...message,
        sender: userMap.get(message.senderId) || null,
        replyTo: message.replyTo ? {
          ...message.replyTo,
          sender: userMap.get(message.replyTo.senderId) || null
        } : null,
        reactions: message.reactions.map(reaction => ({
          ...reaction,
          user: userMap.get(reaction.userId) || null
        })),
        reads: message.reads.map(read => ({
          ...read,
          user: userMap.get(read.userId) || null
        })),
        replies: message.replies.map(reply => ({
          ...reply,
          sender: userMap.get(reply.senderId) || null,
          reactions: reply.reactions.map(reaction => ({
            ...reaction,
            user: userMap.get(reaction.userId) || null
          })),
          reads: reply.reads.map(read => ({
            ...read,
            user: userMap.get(read.userId) || null
          }))
        }))
      };

      return NextResponse.json({ message: enhancedMessage });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/messages/[messageId] - Edit message with caching and events
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    // Rate limiting for message edits
    const editRateLimit = await checkRateLimit(`edit:${session.user.id}`, 20, 60) // 20/minute
    if (!editRateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many edits',
        resetTime: editRateLimit.resetTime
      }, { status: 429 })
    }

    const { content } = editMessageSchema.parse(await request.json());

    // Get message and verify ownership
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        isDeleted: false,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Store original content before edit (only if not already edited)
    const originalContent = message.originalContent || message.content    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        originalContent,
        isEdited: true,
        editedAt: new Date(),
      }
    });

    // Get sender data
    const senderData = await fetchUserData([session.user.id]);
    const messageWithSender = {
      ...updatedMessage,
      sender: senderData[0] || null
    };

    // **PERFORMANCE FIX**: Batch cache invalidation  
    await deleteBatchCache([
      `message:${messageId}`,
      `message:${messageId}:detailed`,
      `conversation:${message.conversationId}:messages:recent`
    ]);    // Publish message edited event via Kafka
    await publishRealtimeEvent('MESSAGE_EDITED', messageWithSender, {
      userId: session.user.id,
      conversationId: message.conversationId,
      rooms: [`conversation:${message.conversationId}`]
    })

    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error('Message PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/[messageId] - Delete message with caching and events
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    // Rate limiting for message deletions
    const deleteRateLimit = await checkRateLimit(`delete:${session.user.id}`, 10, 60) // 10/minute
    if (!deleteRateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many deletions',
        resetTime: deleteRateLimit.resetTime
      }, { status: 429 })
    }

    // Get message and verify ownership
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        isDeleted: false,
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Soft delete message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
        content: null, // Clear content for privacy
      }    });

    // **PERFORMANCE FIX**: Batch cache invalidation
    await deleteBatchCache([
      `message:${messageId}`,
      `message:${messageId}:detailed`,
      `conversation:${message.conversationId}:messages:recent`
    ]);

    // Publish message deleted event via Kafka
    await publishRealtimeEvent('MESSAGE_DELETED', {
      messageId,
      conversationId: message.conversationId,
      deletedBy: session.user.id
    }, {
      userId: session.user.id,
      conversationId: message.conversationId,
      rooms: [`conversation:${message.conversationId}`]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
