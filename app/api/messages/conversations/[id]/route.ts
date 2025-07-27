/**
 * =============================================================================
 * SINGLE CONVERSATION API ENDPOINT - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Fetches a single conversation by ID for direct navigation
 * Returns conversation details with participants and metadata
 * 
 * FEATURES:
 * ✅ Fetch conversation by ID
 * ✅ Include full participant information
 * ✅ Online status for participants
 * ✅ Last message and unread count
 * ✅ Permission checks for conversation access
 * 
 * ENDPOINTS:
 * GET /api/messages/conversations/[id]
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-17
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ==========================================
// SINGLE CONVERSATION ENDPOINT
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate conversation ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Fetch conversation with full details
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePictureUrl: true,
                lastActivity: true,
                isVerified: true,
                createdAt: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
          include: {
            reactions: true,
            reads: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isDeleted: false,
                reads: {
                  none: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.userId === session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format the response with enhanced participant information
    const formattedConversation = {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      isGroup: conversation.isGroup,
      participants: conversation.participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        username: participant.user.username,
        avatar: participant.user.profilePictureUrl,
        isOnline: participant.user.lastActivity 
          ? (new Date().getTime() - participant.user.lastActivity.getTime()) < 5 * 60 * 1000 
          : false,
        lastSeen: participant.user.lastActivity || participant.user.createdAt,
        isAdmin: participant.isAdmin,
        isVerified: participant.user.isVerified,
        canAddMembers: participant.canAddMembers,
        canRemoveMembers: participant.canRemoveMembers,
      })),
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages || 0,
      lastActivity: conversation.lastActivity,
      isArchived: conversation.isArchived,
      isMuted: conversation.isMuted,
      isPinned: conversation.isPinned,
      isEncrypted: conversation.isEncrypted,
      theme: conversation.theme,
      customSettings: conversation.customSettings,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    return NextResponse.json({ conversation: formattedConversation });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// UPDATE CONVERSATION ENDPOINT
// ==========================================

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
    const body = await request.json();
    const { title, description, isArchived, isMuted, isPinned, theme, customSettings } = body;

    // Check if user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!conversation || conversation.participants.length === 0) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Update conversation
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isArchived !== undefined && { isArchived }),
        ...(isMuted !== undefined && { isMuted }),
        ...(isPinned !== undefined && { isPinned }),
        ...(theme !== undefined && { theme }),
        ...(customSettings !== undefined && { customSettings }),
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                profilePictureUrl: true,
                lastActivity: true,
                isVerified: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
        },
      },
    });

    // Format the response
    const formattedConversation = {
      id: updatedConversation.id,
      title: updatedConversation.title,
      type: updatedConversation.type,
      isGroup: updatedConversation.isGroup,
      participants: updatedConversation.participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        username: participant.user.username,
        avatar: participant.user.profilePictureUrl,
        isOnline: participant.user.lastActivity 
          ? (new Date().getTime() - participant.user.lastActivity.getTime()) < 5 * 60 * 1000 
          : false,
        lastSeen: participant.user.lastActivity,
        isAdmin: participant.isAdmin,
        isVerified: participant.user.isVerified,
      })),
      lastMessage: updatedConversation.messages[0] || null,
      lastActivity: updatedConversation.lastActivity,
      isArchived: updatedConversation.isArchived,
      isMuted: updatedConversation.isMuted,
      isPinned: updatedConversation.isPinned,
      isEncrypted: updatedConversation.isEncrypted,
      theme: updatedConversation.theme,
      customSettings: updatedConversation.customSettings,
    };

    return NextResponse.json({ conversation: formattedConversation });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
