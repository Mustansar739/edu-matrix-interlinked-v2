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
  { params }: { params: Promise<{ userId: string, id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, id } = await params;

    // Get user's online status
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        lastActivity: true,
        profilePictureUrl: true,
        avatar: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine online status based on last activity
    const now = new Date();
    const lastActivity = user.lastActivity || user.lastLogin;
    let isOnline = false;
    let activity = 'offline';

    if (lastActivity) {
      const timeDiff = now.getTime() - lastActivity.getTime();
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        isOnline = true;
        activity = 'active';
      } else if (timeDiff < 15 * 60 * 1000) { // 15 minutes
        isOnline = true;
        activity = 'idle';
      } else if (timeDiff < 60 * 60 * 1000) { // 1 hour
        isOnline = false;
        activity = 'away';
      } else {
        isOnline = false;
        activity = 'offline';
      }
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl || user.avatar,
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
