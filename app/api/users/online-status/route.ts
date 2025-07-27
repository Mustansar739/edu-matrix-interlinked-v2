/**
 * =============================================================================
 * BULK ONLINE STATUS API ENDPOINT - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Provides bulk online status lookup for multiple users at once
 * Used by navbar, conversation lists, and other components that need multiple statuses
 * 
 * FEATURES:
 * ✅ Bulk user status lookup (POST)
 * ✅ Optimized database queries
 * ✅ Last seen timestamps
 * ✅ Activity status calculation
 * ✅ Privacy-respecting data
 * ✅ Efficient batch processing
 * 
 * ENDPOINTS:
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
// BULK ONLINE STATUS ENDPOINT
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds } = body;

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (userIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 users per request' }, { status: 400 });
    }

    // Get users' status information
    const users = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
      },
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

    // Calculate online status for each user
    const now = new Date();
    const statuses: { [userId: string]: any } = {};

    users.forEach(user => {
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

      statuses[user.id] = {
        userId: user.id,
        name: user.name,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl || user.avatar,
        isOnline,
        lastSeen: lastActivity || new Date(),
        activity,
        lastActivity: lastActivity || new Date(),
      };
    });

    // Fill in missing users with offline status
    userIds.forEach(userId => {
      if (!statuses[userId]) {
        statuses[userId] = {
          userId,
          name: 'Unknown User',
          username: 'unknown',
          profilePictureUrl: null,
          isOnline: false,
          lastSeen: new Date(),
          activity: 'offline',
          lastActivity: new Date(),
        };
      }
    });

    return NextResponse.json({
      statuses,
      requestedCount: userIds.length,
      foundCount: users.length,
    });

  } catch (error) {
    console.error('Error fetching bulk online status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// GET ENDPOINT FOR SIMPLE QUERIES
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',') || [];

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
    }

    // Limit batch size
    if (userIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 users per GET request' }, { status: 400 });
    }

    // Get users' status information
    const users = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
      },
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

    // Calculate online status for each user
    const now = new Date();
    const statuses: { [userId: string]: any } = {};

    users.forEach(user => {
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

      statuses[user.id] = {
        userId: user.id,
        name: user.name,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl || user.avatar,
        isOnline,
        lastSeen: lastActivity || new Date(),
        activity,
        lastActivity: lastActivity || new Date(),
      };
    });

    return NextResponse.json({
      statuses,
      requestedCount: userIds.length,
      foundCount: users.length,
    });

  } catch (error) {
    console.error('Error fetching online status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
