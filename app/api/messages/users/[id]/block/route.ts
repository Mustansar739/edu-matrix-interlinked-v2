// ==========================================
// USER BLOCK API
// ==========================================
// Block/unblock users

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/messages/users/[id]/block - Block/unblock user
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { isBlocked } = body;

    if (isBlocked) {
      // Create block record
      await prisma.blockedUser.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId: targetUserId,
          },
        },
        create: {
          blockerId: session.user.id,
          blockedId: targetUserId,
          isReported: false,
        },
        update: {},
      });
    } else {
      // Remove block record
      await prisma.blockedUser.deleteMany({
        where: {
          blockerId: session.user.id,
          blockedId: targetUserId,
        },
      });
    }

    return NextResponse.json({ success: true, isBlocked });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
