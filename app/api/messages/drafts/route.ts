// ==========================================
// MESSAGE DRAFTS API - FACEBOOK MESSENGER STYLE
// ==========================================
// Auto-save and manage message drafts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cacheOrFetch, setCache, deleteCache } from '@/lib/cache';

const draftSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().max(10000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).default('TEXT'),
  mediaUrls: z.array(z.string()).optional(),
  replyToId: z.string().uuid().optional(),
});

// GET /api/messages/drafts - Get user's drafts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get draft for specific conversation
      const draft = await cacheOrFetch(
        `draft:${session.user.id}:${conversationId}`,
        async () => {
          return await prisma.messageDraft.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId: session.user.id,
              },
            },
          });
        },
        300 // 5 minutes
      );

      return NextResponse.json({ draft });
    } else {
      // Get all user's drafts
      const drafts = await cacheOrFetch(
        `user:${session.user.id}:drafts`,
        async () => {
          return await prisma.messageDraft.findMany({
            where: { userId: session.user.id },
            include: {
              conversation: {
                select: {
                  title: true,
                  type: true,
                  isGroup: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          });
        },
        180 // 3 minutes
      );

      return NextResponse.json({ drafts });
    }

  } catch (error) {
    console.error('Get drafts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/drafts - Save a draft
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = draftSchema.parse(await request.json());

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

    // Upsert draft (create or update)
    const draft = await prisma.messageDraft.upsert({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId: session.user.id,
        },
      },
      create: {
        conversationId: data.conversationId,
        userId: session.user.id,
        content: data.content,
        messageType: data.messageType,
        mediaUrls: data.mediaUrls || [],
        replyToId: data.replyToId,
      },
      update: {
        content: data.content,
        messageType: data.messageType,
        mediaUrls: data.mediaUrls || [],
        replyToId: data.replyToId,
        updatedAt: new Date(),
      },
    });

    // Update cache
    await setCache(`draft:${session.user.id}:${data.conversationId}`, draft, 300);
    await deleteCache(`user:${session.user.id}:drafts`);

    return NextResponse.json({
      success: true,
      draft,
    });

  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/drafts - Delete drafts
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const action = searchParams.get('action') || 'single';

    if (action === 'all') {
      // Delete all user's drafts
      const deletedCount = await prisma.messageDraft.deleteMany({
        where: { userId: session.user.id },
      });

      // Clear caches
      await deleteCache(`user:${session.user.id}:drafts`);
      
      // Clear individual conversation draft caches
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId: session.user.id },
          },
        },
        select: { id: true },
      });

      for (const conv of conversations) {
        await deleteCache(`draft:${session.user.id}:${conv.id}`);
      }

      return NextResponse.json({
        success: true,
        deletedCount: deletedCount.count,
      });
    } else if (conversationId) {
      // Delete specific conversation draft
      const deletedDraft = await prisma.messageDraft.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId: session.user.id,
          },
        },
      });

      // Clear caches
      await deleteCache(`draft:${session.user.id}:${conversationId}`);
      await deleteCache(`user:${session.user.id}:drafts`);

      return NextResponse.json({
        success: true,
        deletedDraft: {
          conversationId,
          deletedAt: new Date(),
        },
      });
    } else {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
