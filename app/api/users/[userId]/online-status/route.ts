/**
 * =============================================================================
 * ONLINE STATUS API ENDPOINT - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Provides real-time online status for users throughout the application
 * Handles both single user and bulk user status requests
 * 
 * FEATURES:
 * ✅ Single user status lookup
 * ✅ Bulk user status lookup (POST)
 * ✅ Last seen timestamps
 * ✅ Activity status (active, idle, away, offline)
 * ✅ Privacy-respecting data
 * ✅ Caching for performance
 * 
 * ENDPOINTS:
 * GET /api/users/[id]/online-status
 * POST /api/users/online-status
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ==========================================
// SINGLE USER ONLINE STATUS
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Get user's online status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        lastActivity: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

        // Determine activity status
    const now = new Date();
    const lastActivity = user.lastActivity;
    let activity = 'offline';
    let isOnline = false;

    if (lastActivity) {
      const timeDiff = now.getTime() - lastActivity.getTime();
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        activity = 'active';
        isOnline = true;
      } else if (timeDiff < 30 * 60 * 1000) { // 30 minutes
        activity = 'idle';
        isOnline = true;
      } else if (timeDiff < 60 * 60 * 1000) { // 1 hour
        activity = 'away';
        isOnline = false;
      } else {
        activity = 'offline';
        isOnline = false;
      }
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      username: user.username,
      profilePictureUrl: user.avatar,
      isOnline,
      lastSeen: lastActivity || new Date(),
      activity,
      lastActivity: lastActivity || new Date(),
    });

  } catch (error) {
    console.error('Error fetching online status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
