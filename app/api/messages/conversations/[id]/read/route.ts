// ==========================================
// CONVERSATION READ STATUS API
// ==========================================
// Mark messages as read in conversation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/messages/conversations/[id]/read - Mark messages as read
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;
    const body = await request.json();
    const { messageIds = [] } = body;

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If no specific message IDs provided, mark all unread messages as read
    let messagesToMark = messageIds;
    
    if (messagesToMark.length === 0) {
      const unreadMessages = await prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
          reads: {
            none: {
              userId: session.user.id,
            },
          },
        },
        select: { id: true },
      });
      
      messagesToMark = unreadMessages.map(msg => msg.id);
    }

    if (messagesToMark.length === 0) {
      return NextResponse.json({ success: true, markedCount: 0 });
    }

    // Create read receipts for all messages
    const readPromises = messagesToMark.map((messageId: string) =>
      prisma.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId: session.user.id,
          },
        },
        create: {
          messageId,
          conversationId,
          userId: session.user.id,
          readAt: new Date(),
          deliveredAt: new Date(),
        },
        update: {
          readAt: new Date(),
        },
      })
    );

    const readReceipts = await Promise.all(readPromises);

    // Update participant last seen
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
      data: {
        lastSeenAt: new Date(),
      },
    });    // Emit real-time events for each read receipt
    try {
      const { SocketIOEmitter } = await import('../../../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      for (const readReceipt of readReceipts) {
        await socketEmitter.emitToRoom(`conversation:${conversationId}`, 'message:read', readReceipt);
      }
    } catch (realtimeError) {
      console.error('Failed to emit read receipts:', realtimeError);
    }

    return NextResponse.json({ 
      success: true, 
      markedCount: readReceipts.length,
      readReceipts,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
