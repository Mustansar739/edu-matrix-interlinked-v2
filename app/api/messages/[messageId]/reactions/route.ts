// ==========================================
// MESSAGE REACTIONS API
// ==========================================
// Add/remove reactions to messages (Facebook-style)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/messages/[messageId]/reactions - Add or remove reaction
export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const body = await request.json();
    const { emoji, reaction } = body;

    if (!emoji || !reaction) {
      return NextResponse.json({ error: 'Emoji and reaction are required' }, { status: 400 });
    }

    // Find message and verify access
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.isDeleted) {
      return NextResponse.json({ error: 'Cannot react to deleted message' }, { status: 400 });
    }

    // Check if user is participant in the conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: message.conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId: session.user.id,
        emoji,
      },
    });

    if (existingReaction) {
      // Remove existing reaction
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id },
      });      // Emit real-time event for reaction removal
      try {
        const { SocketIOEmitter } = await import('../../../../../lib/socket/socket-emitter');
        const socketEmitter = SocketIOEmitter.getInstance();
        
        await socketEmitter.emitToRoom(`conversation:${message.conversationId}`, 'message:reaction:remove', {
          messageId,
          userId: session.user.id,
          emoji,
          reaction,
        });
      } catch (realtimeError) {
        console.error('Failed to emit reaction removal event:', realtimeError);
      }

      return NextResponse.json({ 
        removed: true, 
        messageId, 
        emoji, 
        reaction,
      });
    } else {
      // Add new reaction
      const newReaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
          reaction,
        },
      });      // Emit real-time event for new reaction
      try {
        const { SocketIOEmitter } = await import('../../../../../lib/socket/socket-emitter');
        const socketEmitter = SocketIOEmitter.getInstance();
        
        await socketEmitter.emitToRoom(`conversation:${message.conversationId}`, 'message:reaction:add', newReaction);
      } catch (realtimeError) {
        console.error('Failed to emit new reaction event:', realtimeError);
      }

      return NextResponse.json({ 
        added: true, 
        reaction: newReaction,
      });
    }
  } catch (error) {
    console.error('Error handling message reaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/messages/[messageId]/reactions - Get all reactions for message
export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    // Find message and verify access
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is participant in the conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: message.conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all reactions for the message
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc: any, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          reaction: reaction.reaction,
          count: 0,
          users: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        userId: reaction.userId,
        createdAt: reaction.createdAt,
      });
      return acc;
    }, {});

    return NextResponse.json({
      reactions: Object.values(groupedReactions),
      totalReactions: reactions.length,
    });
  } catch (error) {
    console.error('Error fetching message reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
