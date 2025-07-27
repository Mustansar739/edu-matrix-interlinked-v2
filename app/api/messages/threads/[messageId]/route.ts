import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { publishEvent } from '@/lib/kafka';

// Fetch user data for cross-schema relations
async function fetchUserData(userIds: string[]) {
  if (userIds.length === 0) return []
  
  return await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      username: true,
    }
  })
}

const threadReplySchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).default('TEXT'),
  mediaUrls: z.array(z.string()).optional(),
  mediaMetadata: z.any().optional(),
});

// GET /api/messages/threads/[messageId] - Get thread replies
export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get the parent message first
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: {
                userId: session.user.id,
                isHidden: false,
              },
            },
          },
        },
      },
    });

    if (!parentMessage || parentMessage.conversation.participants.length === 0) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }    // Get thread replies
    const replies = await prisma.message.findMany({
      where: {
        replyToId: messageId,
        isDeleted: false,
      },
      include: {
        reactions: true,
        reads: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    // Fetch user data for reactions and reads
    const allUserIds = new Set<string>();
    replies.forEach(reply => {
      allUserIds.add(reply.senderId);
      reply.reactions.forEach(reaction => allUserIds.add(reaction.userId));
      reply.reads.forEach(read => allUserIds.add(read.userId));
    });

    const users = await fetchUserData(Array.from(allUserIds));
    const userMap = new Map(users.map(user => [user.id, user]));

    // Enhance replies with user data
    const enhancedReplies = replies.map(reply => ({
      ...reply,
      sender: userMap.get(reply.senderId) || null,
      reactions: reply.reactions.map(reaction => ({
        ...reaction,
        user: userMap.get(reaction.userId) || null,
      })),
      reads: reply.reads.map(read => ({
        ...read,
        user: userMap.get(read.userId) || null,
      })),
    }));

    const totalReplies = await prisma.message.count({
      where: {
        replyToId: messageId,
        isDeleted: false,
      },
    });    return NextResponse.json({
      parentMessage,
      replies: enhancedReplies,
      totalReplies,
      hasMore: skip + limit < totalReplies,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/threads/[messageId] - Reply to thread
export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const body = await request.json();
    const { content, messageType, mediaUrls, mediaMetadata } = threadReplySchema.parse(body);

    // Get the parent message and verify access
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: {
                userId: session.user.id,
                isHidden: false,
              },
            },
          },
        },
      },
    });

    if (!parentMessage || parentMessage.conversation.participants.length === 0) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }    // Create thread reply
    const reply = await prisma.message.create({
      data: {
        conversationId: parentMessage.conversationId,
        senderId: session.user.id,
        content: content.trim(),
        messageType,
        mediaUrls: mediaUrls || [],
        mediaMetadata: mediaMetadata || {},
        replyToId: messageId,
        threadId: parentMessage.threadId || messageId, // Use existing threadId or make this the root
      },
      include: {
        reactions: true,
        reads: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    // Fetch sender data
    const [senderData] = await fetchUserData([reply.senderId]);
    const enhancedReply = {
      ...reply,
      sender: senderData || null,
    };

    // Update conversation last activity
    await prisma.conversation.update({
      where: { id: parentMessage.conversationId },
      data: { lastActivity: new Date() },
    });

    // Publish real-time event
    try {      await publishEvent('messages', {
        type: 'THREAD_REPLY',
        data: {
          reply: enhancedReply,
          parentMessageId: messageId,
          conversationId: parentMessage.conversationId,
        },
        metadata: {
          userId: session.user.id,
          conversationId: parentMessage.conversationId,
          rooms: [`conversation:${parentMessage.conversationId}`]
        },
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.error('Kafka event publishing failed:', kafkaError);
    }

    return NextResponse.json({ reply: enhancedReply });
  } catch (error) {
    console.error('Error creating thread reply:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
