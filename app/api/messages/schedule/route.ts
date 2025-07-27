/**
 * @fileoverview Message Scheduling API - Facebook Messenger Style
 * @module MessageScheduleAPI
 * @category API
 * 
 * @description
 * Handle scheduled message functionality with Facebook Messenger-style features
 * - Official Next.js 15 App Router patterns with async params
 * - NextAuth.js 5.0 for authentication
 * - Message scheduling with timezone support
 * - Rate limiting and caching for production performance
 */

// ==========================================
// MESSAGE SCHEDULING API - FACEBOOK MESSENGER STYLE
// ==========================================
// Schedule messages for future delivery

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cacheOrFetch, deleteCache, checkRateLimit } from '@/lib/cache';

const scheduleMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).default('TEXT'),
  scheduledFor: z.string().datetime(),
  timezone: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  replyToId: z.string().uuid().optional(),
  mentions: z.array(z.string()).optional(),
});

// POST /api/messages/schedule - Schedule a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`schedule:${session.user.id}`, 20, 3600); // 20/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many scheduled messages',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const data = scheduleMessageSchema.parse(await request.json());

    // Validate scheduled time is in the future
    const scheduledTime = new Date(data.scheduledFor);
    const now = new Date();
    if (scheduledTime <= now) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: data.conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create scheduled message
    const scheduledMessage = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: session.user.id,
        content: data.content,
        messageType: data.messageType,
        mediaUrls: data.mediaUrls || [],
        replyToId: data.replyToId,
        mentions: data.mentions || [],
        scheduledFor: scheduledTime,
        isScheduled: true,
        status: 'SENT', // Will be updated when actually sent
      },
    });

    return NextResponse.json({
      success: true,
      scheduledMessage: {
        id: scheduledMessage.id,
        conversationId: data.conversationId,
        scheduledFor: scheduledTime,
        content: data.content.substring(0, 100) + '...',
      },
    });

  } catch (error) {
    console.error('Schedule message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/messages/schedule - Get user's scheduled messages
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      senderId: session.user.id,
      isScheduled: true,
      scheduledFor: { gte: new Date() }, // Only future messages
    };

    if (conversationId) {
      whereClause.conversationId = conversationId;
    }

    const scheduledMessages = await prisma.message.findMany({
      where: whereClause,
      select: {
        id: true,
        conversationId: true,
        content: true,
        messageType: true,
        scheduledFor: true,
        createdAt: true,
        conversation: {
          select: {
            title: true,
            type: true,
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.message.count({ where: whereClause });

    return NextResponse.json({
      scheduledMessages,
      totalCount,
      hasMore: skip + limit < totalCount,
      page,
    });

  } catch (error) {
    console.error('Get scheduled messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}