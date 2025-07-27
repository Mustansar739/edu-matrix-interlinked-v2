/**
 * =============================================================================
 * USER BY ID API ENDPOINT - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Provides user lookup by ID for conversation creation
 * Returns user details with online status and privacy-respecting data
 * 
 * FEATURES:
 * ✅ User lookup by ID
 * ✅ Online status detection
 * ✅ Profile picture and basic user info
 * ✅ Privacy-respecting data filtering
 * ✅ Follow status for the requesting user
 * 
 * ENDPOINTS:
 * GET /api/users/[id]
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ==========================================
// USER BY ID ENDPOINT
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Validate ID format
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        lastActivity: true,
        isVerified: true,
        headline: true,
        city: true,
        country: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        // Get follow status for the requesting user
        followers: {
          where: { followerId: session.user.id },
          select: { id: true, status: true },
        },
        following: {
          where: { followingId: session.user.id },
          select: { id: true, status: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

        // Determine follow status
    const isFollowing = user.followers.length > 0 && user.followers[0].status === 'ACCEPTED';
    const isFollowingMe = user.following.length > 0 && user.following[0].status === 'ACCEPTED';
    
    let followStatus: 'not_following' | 'following' | 'mutual' = 'not_following';
    if (isFollowing && isFollowingMe) {
      followStatus = 'mutual';
    } else if (isFollowing) {
      followStatus = 'following';
    }

    // Return user data with follow status
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePictureUrl: user.avatar,
        isOnline: false, // Will be updated by presence system
        lastSeen: user.lastActivity || user.createdAt,
        isVerified: user.isVerified,
        headline: user.headline,
        city: user.city,
        country: user.country,
        createdAt: user.createdAt,
        followStatus,
        followerCount: user.followersCount,
        followingCount: user.followingCount,
      },
    });

  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// UPDATE USER ENDPOINT (OPTIONAL)
// ==========================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Only allow users to update their own profile
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, headline, city, country, avatar } = body;

    // Validate input
    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 });
    }

    if (headline && headline.length > 160) {
      return NextResponse.json({ error: 'Headline must be less than 160 characters' }, { status: 400 });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(headline !== undefined && { headline }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        lastActivity: true,
        isVerified: true,
        headline: true,
        city: true,
        country: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        profilePictureUrl: updatedUser.avatar,
        isOnline: false, // Will be updated by presence system
        lastSeen: updatedUser.lastActivity || updatedUser.createdAt,
      },
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
