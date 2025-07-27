// ==========================================
// CONVERSATION MESSAGES API
// ==========================================
// Facebook-style conversation message management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/messages/conversations/[id]/messages - Get messages for conversation
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

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

    const skip = (page - 1) * limit;

    // Get messages with reactions, reads, and reply data
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Get conversation details
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    const totalCount = await prisma.message.count({
      where: {
        conversationId,
        isDeleted: false,
      },
    });

    // Reverse messages to show oldest first
    const reversedMessages = messages.reverse();

    return NextResponse.json({
      messages: reversedMessages,
      conversation,
      totalCount,
      hasMore: skip + limit < totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/conversations/[id]/messages - Send new message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, messageType = 'TEXT', mediaUrls = [], replyToId, mentions = [] } = body;

    // Validate input
    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json({ error: 'Message content or media is required' }, { status: 400 });
    }

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

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content,
        messageType,
        mediaUrls,
        replyToId,
        mentions,
        status: 'SENT',
      },
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
      },
    });

    // Update conversation last activity
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create read receipt for sender
    await prisma.messageRead.create({
      data: {
        messageId: message.id,
        conversationId,
        userId: session.user.id,
        readAt: new Date(),
        deliveredAt: new Date(),
      },
    });    // Emit real-time event using server-side emitter
    try {
      const { SocketIOEmitter } = await import('../../../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      // Emit to conversation room
      await socketEmitter.emitToRoom(`conversation:${conversationId}`, 'message:new', message);
        // Also emit to each participant for notification purposes
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId }
      });
      
      for (const participant of participants) {
        if (participant.userId !== session.user.id) {
          await socketEmitter.emitToUser(participant.userId, 'message:notification', {
            conversationId,
            message,
            sender: {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }
          });
        }
      }
    } catch (realtimeError) {
      console.error('Failed to emit new message event:', realtimeError);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
