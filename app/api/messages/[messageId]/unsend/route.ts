// ==========================================
// MESSAGE UNSEND API - FACEBOOK MESSENGER STYLE
// ==========================================
// Unsend messages (removes for everyone, different from delete)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, deleteCache } from '@/lib/cache';
import { publishEvent } from '@/lib/kafka';

// POST /api/messages/[messageId]/unsend - Unsend a message for everyone
export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`unsend:${session.user.id}`, 20, 3600); // 20/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many unsend attempts',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { messageId } = await params;

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

    // Check if message is too old to unsend (Facebook allows 10 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const unsendTimeLimit = 10 * 60 * 1000; // 10 minutes
    
    if (messageAge > unsendTimeLimit) {
      return NextResponse.json({ 
        error: 'Message is too old to unsend (limit: 10 minutes)' 
      }, { status: 400 });
    }

    // Update message to unsent state (different from deleted)
    const unssentMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: null, // Clear content
        mediaUrls: [], // Clear media
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
        // Keep metadata for audit trail
        originalContent: message.content,
      },
    });

    // Delete related reactions and reads
    await prisma.messageReaction.deleteMany({
      where: { messageId },
    });

    await prisma.messageRead.deleteMany({
      where: { messageId },
    });

    // Invalidate caches
    await deleteCache(`message:${messageId}`);
    await deleteCache(`conversation:${message.conversationId}:messages:recent`);

    // Publish unsend event
    try {
      await publishEvent('messages', {
        type: 'MESSAGE_UNSENT',
        data: {
          messageId,
          conversationId: message.conversationId,
          unsendBy: session.user.id,
          originalContent: message.content?.substring(0, 50) || '',
        },
        metadata: {
          userId: session.user.id,
          conversationId: message.conversationId,
          rooms: [`conversation:${message.conversationId}`],
        },
      });
    } catch (error) {
      console.warn('Failed to publish unsend event:', error);
    }

    return NextResponse.json({
      success: true,
      messageId,
      unsendAt: unssentMessage.deletedAt,
      conversationId: message.conversationId,
    });

  } catch (error) {
    console.error('Unsend message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
