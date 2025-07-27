// ==========================================
// USER LIKES ANALYTICS API
// ==========================================
// GET /api/profile/[username]/likes - Get user's like statistics

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { universalLikeService } from '@/lib/services/universal-like/universal-like-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();

    // Get the profile user
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { 
        id: true, 
        totalLikesReceived: true,
        profileVisibility: true
      }
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check privacy settings
    const isOwner = session?.user?.id === profileUser.id;
    const isPublic = profileUser.profileVisibility === 'PUBLIC';
    
    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      );
    }

    // Get basic like stats (always visible)
    const basicStats = {
      totalLikesReceived: profileUser.totalLikesReceived,
      userId: profileUser.id
    };

    // If not the owner, return only basic stats
    if (!isOwner) {
      return NextResponse.json({
        likes: basicStats,
        analytics: null,
        message: 'Basic like stats only'
      });
    }

    // For the owner, get detailed analytics
    const [likeStats, analytics] = await Promise.all([
      universalLikeService.getUserLikeStats(profileUser.id),
      universalLikeService.getUserLikesAnalytics(profileUser.id)
    ]);

    return NextResponse.json({
      likes: {
        ...basicStats,
        likesByType: likeStats?.likesByType || {},
        lastUpdated: likeStats?.lastUpdated
      },
      analytics,
      isOwner: true
    });

  } catch (error) {
    console.error('User likes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
