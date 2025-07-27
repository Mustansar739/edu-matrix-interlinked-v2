// ==========================================
// MESSAGE PINNING API - FACEBOOK-LEVEL FEATURE
// ==========================================
// Pin/unpin messages in conversations with Redis caching and Kafka events

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cacheOrFetch, deleteBatchCache, checkRateLimit } from '@/lib/cache';
import { publishEvent } from '@/lib/kafka';

const pinMessageSchema = z.object({
  isPinned: z.boolean(),
});

// POST /api/messages/[messageId]/pin - Pin/unpin message
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for pinning
    const rateLimit = await checkRateLimit(`pin:${session.user.id}`, 20, 60); // 20/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many pin requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { messageId } = await params; // Await the params promise
    const body = await request.json();
    const { isPinned } = pinMessageSchema.parse(body);

    // Get message and verify access
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        isDeleted: false,
        conversation: {
          participants: {
            some: {
              userId: session.user.id,
              isHidden: false,
            },
          },
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            type: true,
            participants: {
              where: {
                userId: session.user.id,
              },
              select: {
                isAdmin: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Check if user is admin for group conversations
    const isAdmin = message.conversation.participants[0]?.isAdmin;
    if (message.conversation.type === 'GROUP' && !isAdmin) {
      return NextResponse.json({ error: 'Only group admins can pin messages' }, { status: 403 });
    }

    if (isPinned) {
      // Check pinned messages limit (max 5 per conversation)
      const pinnedCount = await prisma.pinnedMessage.count({
        where: {
          conversationId: message.conversationId,
        },
      });

      if (pinnedCount >= 5) {
        return NextResponse.json({ error: 'Maximum 5 messages can be pinned per conversation' }, { status: 400 });
      }

      // Check if already pinned
      const existingPin = await prisma.pinnedMessage.findUnique({
        where: {
          conversationId_messageId: {
            conversationId: message.conversationId,
            messageId,
          },
        },
      });

      if (existingPin) {
        return NextResponse.json({ error: 'Message already pinned' }, { status: 400 });
      }

      // Create pin record
      await prisma.pinnedMessage.create({
        data: {
          conversationId: message.conversationId,
          messageId,
          pinnedBy: session.user.id,
          pinnedAt: new Date(),
        },
      });
    } else {
      // Remove pin
      await prisma.pinnedMessage.delete({
        where: {
          conversationId_messageId: {
            conversationId: message.conversationId,
            messageId,
          },
        },
      });
    }    // **PERFORMANCE FIX**: Batch cache invalidation
    await deleteBatchCache([
      `conversation:${message.conversationId}:pinned`,
      `conversation:${message.conversationId}:details`
    ]);

    // Publish Kafka event
    await publishEvent('messages', {
      type: isPinned ? 'MESSAGE_PINNED' : 'MESSAGE_UNPINNED',
      data: {
        messageId,
        conversationId: message.conversationId,
        isPinned,
      },
      metadata: {
        userId: session.user.id,
        messageId,
        conversationId: message.conversationId,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      messageId,
      isPinned,
    });

  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/messages/[messageId]/pin - Get pin status
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params; // Await the params promise

    // Get message and verify access
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        isDeleted: false,
        conversation: {
          participants: {
            some: {
              userId: session.user.id,
              isHidden: false,
            },
          },
        },
      },
      select: {
        id: true,
        conversationId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }    // Check if pinned
    const pinRecord = await prisma.pinnedMessage.findUnique({
      where: {
        conversationId_messageId: {
          conversationId: message.conversationId,
          messageId,
        },
      },
    });    return NextResponse.json({
      isPinned: !!pinRecord,
      pinInfo: pinRecord ? {
        pinnedBy: pinRecord.pinnedBy,
        pinnedAt: pinRecord.pinnedAt,
        pinnedOrder: pinRecord.pinnedOrder
      } : null,
    });

  } catch (error) {
    console.error('Error getting pin status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
