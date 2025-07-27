// ==========================================
// CONVERSATION PINNED MESSAGES API - FACEBOOK-LEVEL FEATURE
// ==========================================
// Get pinned messages for a conversation with Redis caching and Kafka events

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cacheOrFetch, deleteCache, checkRateLimit } from '@/lib/cache';
import { publishEvent } from '@/lib/kafka';

// GET /api/messages/conversations/[id]/pinned - Get pinned messages for conversation
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for pinned messages access
    const rateLimit = await checkRateLimit(`pinned:${session.user.id}`, 100, 60); // 100/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { id } = await params;
    const conversationId = id;

    // Check if user is participant (with caching)
    const participant = await cacheOrFetch(
      `conversation:${conversationId}:participant:${session.user.id}`,
      async () => {
        return await prisma.conversationParticipant.findFirst({
          where: {
            conversationId,
            userId: session.user.id,
            isHidden: false,
          },
        });
      },
      1800 // 30 minutes
    );

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }    // Get pinned messages with caching
    const pinnedMessagesData = await cacheOrFetch(
      `conversation:${conversationId}:pinned-messages`,
      async () => {
        const pinnedMessages = await prisma.pinnedMessage.findMany({
          where: {
            conversationId,
          },
          include: {
            message: {
              select: {
                id: true,
                content: true,
                messageType: true,
                senderId: true,
                mediaUrls: true,
                createdAt: true,
                isDeleted: true,
              }
            }
          },
          orderBy: {
            pinnedOrder: 'asc'
          }
        });

        // Filter out deleted messages
        const activePinnedMessages = pinnedMessages
          .filter(pin => !pin.message.isDeleted)
          .map(pin => ({
            id: pin.id,
            messageId: pin.messageId,
            pinnedBy: pin.pinnedBy,
            pinnedAt: pin.pinnedAt,
            pinnedOrder: pin.pinnedOrder,
            message: {
              id: pin.message.id,
              content: pin.message.content,
              messageType: pin.message.messageType,
              senderId: pin.message.senderId,
              mediaUrls: pin.message.mediaUrls,
              createdAt: pin.message.createdAt,
            }
          }));
        
        return {
          pinnedMessages: activePinnedMessages,
          totalCount: activePinnedMessages.length,
        };
      },
      600 // 10 minutes
    );

    return NextResponse.json({
      ...pinnedMessagesData,
      conversationId,
    });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/conversations/[id]/pinned - Unpin all messages in conversation (admin only)
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for bulk unpin operations
    const rateLimit = await checkRateLimit(`bulk-unpin:${session.user.id}`, 5, 60); // 5/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many bulk unpin requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { id } = await params;
    const conversationId = id;

    // Check if user is admin/moderator (with caching)
    const participant = await cacheOrFetch(
      `conversation:${conversationId}:participant:${session.user.id}`,
      async () => {
        return await prisma.conversationParticipant.findFirst({
          where: {
            conversationId,
            userId: session.user.id,
            isHidden: false,
          },
        });
      },
      1800 // 30 minutes
    );

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!participant.isAdmin && !participant.isModerator) {
      return NextResponse.json({ error: 'Admin/Moderator privileges required' }, { status: 403 });
    }    // Unpin all messages in conversation
    const currentPinned = await prisma.pinnedMessage.findMany({
      where: {
        conversationId,
      },
      select: {
        messageId: true
      }
    });

    const unpinnedCount = await prisma.pinnedMessage.deleteMany({
      where: {
        conversationId,
      }
    });

    // Invalidate cache
    await deleteCache(`conversation:${conversationId}:pinned-messages`);

    // Publish Kafka event for bulk unpin
    await publishEvent('messages', {
      type: 'MESSAGES_BULK_UNPINNED',
      data: {        conversationId,
        unpinnedMessageIds: currentPinned.map(p => p.messageId),
        unpinnedCount: unpinnedCount.count,
        unpinnedBy: session.user.id,
      },
      metadata: {
        userId: session.user.id,
        conversationId,
        timestamp: new Date().toISOString(),
        rooms: [`conversation:${conversationId}`],
      },
    });

    return NextResponse.json({ 
      success: true, 
      unpinnedCount: unpinnedCount.count,
      conversationId,
    });
  } catch (error) {
    console.error('Error unpinning all messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
