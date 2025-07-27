// ==========================================
// CONVERSATION MUTE API
// ==========================================
// Mute/unmute conversation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/messages/conversations/[id]/mute - Mute/unmute conversation
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { isMuted } = body;

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

    // Update participant mute status
    await prisma.conversationParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        isMuted,
      },
    });

    return NextResponse.json({ success: true, isMuted });
  } catch (error) {
    console.error('Error muting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
