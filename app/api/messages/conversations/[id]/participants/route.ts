// ==========================================
// CONVERSATION PARTICIPANTS API - FACEBOOK MESSENGER STYLE
// ==========================================
// Manage conversation participants (add, remove, update roles)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit, deleteCache } from '@/lib/cache';
import { publishEvent } from '@/lib/kafka';

const addParticipantsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(20),
});

const updateParticipantSchema = z.object({
  isAdmin: z.boolean().optional(),
  isModerator: z.boolean().optional(),
  canAddMembers: z.boolean().optional(),
  canRemoveMembers: z.boolean().optional(),
  customName: z.string().max(100).optional(),
});

// GET /api/messages/conversations/[id]/participants - Get conversation participants
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;

    // Verify user is participant
    const userParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!userParticipant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get all participants
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isHidden: false,
      },
      include: {
        conversation: {
          select: {
            title: true,
            type: true,
            isGroup: true,
          },
        },
      },
      orderBy: [
        { isAdmin: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    // Get user data from auth schema (would need to be implemented)
    // For now, return participants with placeholder user data
    const participantsWithUsers = participants.map(p => ({
      ...p,
      user: {
        id: p.userId,
        name: `User ${p.userId.substring(0, 8)}`,
        email: `user${p.userId.substring(0, 8)}@example.com`,
        avatar: null,
      },
    }));

    return NextResponse.json({
      participants: participantsWithUsers,
      totalCount: participants.length,
      conversation: participants[0]?.conversation,
    });

  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/conversations/[id]/participants - Add participants to conversation
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;

    // Rate limiting
    const rateLimit = await checkRateLimit(`add_participants:${session.user.id}`, 50, 3600); // 50/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many add participant requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { userIds } = addParticipantsSchema.parse(await request.json());

    // Get conversation and verify user can add members
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId },
      include: {
        participants: {
          where: {
            userId: session.user.id,
            isHidden: false,
          },
        },
      },
    });

    if (!conversation || conversation.participants.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const userParticipant = conversation.participants[0];
    
    // Check if user has permission to add members
    if (!userParticipant.canAddMembers && !userParticipant.isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if conversation is group (can't add to direct messages)
    if (!conversation.isGroup) {
      return NextResponse.json({ error: 'Cannot add participants to direct message' }, { status: 400 });
    }

    // Check current participant count vs max members
    const currentCount = await prisma.conversationParticipant.count({
      where: { conversationId, isHidden: false },
    });

    if (conversation.maxMembers && currentCount + userIds.length > conversation.maxMembers) {
      return NextResponse.json({ 
        error: `Group is full (max ${conversation.maxMembers} members)` 
      }, { status: 400 });
    }

    // Filter out users who are already participants
    const existingParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const existingUserIds = existingParticipants.map(p => p.userId);
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: 'All users are already participants' }, { status: 400 });
    }

    // Add new participants
    const newParticipants = await prisma.conversationParticipant.createMany({
      data: newUserIds.map(userId => ({
        conversationId,
        userId,
        isAdmin: false,
        isModerator: false,
        canAddMembers: conversation.isGroup,
        canRemoveMembers: false,
        joinedAt: new Date(),
      })),
    });

    // Update conversation activity
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    // Clear relevant caches
    await deleteCache(`conversation:${conversationId}:participants`);

    // Publish event
    try {
      await publishEvent('messages', {
        type: 'PARTICIPANTS_ADDED',
        data: {
          conversationId,
          addedUserIds: newUserIds,
          addedBy: session.user.id,
          addedCount: newParticipants.count,
        },
        metadata: {
          userId: session.user.id,
          conversationId,
          rooms: [`conversation:${conversationId}`],
        },
      });
    } catch (error) {
      console.warn('Failed to publish participants added event:', error);
    }

    return NextResponse.json({
      success: true,
      addedCount: newParticipants.count,
      skippedCount: existingUserIds.length,
      conversationId,
    });

  } catch (error) {
    console.error('Add participants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/messages/conversations/[id]/participants/[userId] - Update participant role
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const updates = updateParticipantSchema.parse(await request.json());

    // Verify current user is admin or moderator
    const currentUserParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!currentUserParticipant || (!currentUserParticipant.isAdmin && !currentUserParticipant.isModerator)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update participant
    const updatedParticipant = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      updatedParticipant,
    });

  } catch (error) {
    console.error('Update participant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/conversations/[id]/participants/[userId] - Remove participant
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get current user's participant record
    const currentUserParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!currentUserParticipant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check permissions
    const isSelfRemoval = targetUserId === session.user.id;
    const canRemoveOthers = currentUserParticipant.canRemoveMembers || currentUserParticipant.isAdmin;

    if (!isSelfRemoval && !canRemoveOthers) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Remove participant (soft delete)
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      data: {
        isHidden: true,
        leftAt: new Date(),
      },
    });

    // Publish event
    try {
      await publishEvent('messages', {
        type: 'PARTICIPANT_REMOVED',
        data: {
          conversationId,
          removedUserId: targetUserId,
          removedBy: session.user.id,
          isSelfRemoval,
        },
        metadata: {
          userId: session.user.id,
          conversationId,
          rooms: [`conversation:${conversationId}`],
        },
      });
    } catch (error) {
      console.warn('Failed to publish participant removed event:', error);
    }

    return NextResponse.json({
      success: true,
      removedUserId: targetUserId,
      conversationId,
    });

  } catch (error) {
    console.error('Remove participant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
