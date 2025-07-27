// ==========================================
// MESSAGES SEARCH API
// ==========================================
// Search messages across conversations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/messages/search - Search messages
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const conversationId = url.searchParams.get('conversationId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      content: {
        contains: query,
        mode: 'insensitive',
      },
      isDeleted: false,
      conversation: {
        participants: {
          some: {
            userId: session.user.id,
            isHidden: false,
          },
        },
      },
    };

    // Filter by specific conversation if provided
    if (conversationId) {
      whereClause.conversationId = conversationId;
    }

    // Search messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
            type: true,
            isGroup: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.message.count({ where: whereClause });

    return NextResponse.json({
      messages,
      totalCount,
      hasMore: skip + limit < totalCount,
      page,
      limit,
      query,
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
