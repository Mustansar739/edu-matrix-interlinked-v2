// ==========================================
// CONVERSATION ARCHIVE API
// ==========================================
// Archive/unarchive conversation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/messages/conversations/[id]/archive - Archive/unarchive conversation
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { isArchived } = body;

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

    // Update conversation archive status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived },
    });

    return NextResponse.json({ success: true, isArchived });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
