/**
 * =============================================================================
 * FOLLOW STATUS API - Get Current Follow Relationship - PRODUCTION OPTIMIZED
 * =============================================================================
 * 
 * PURPOSE:
 * Get the current follow status between authenticated user and target user.
 * Used by frontend components to determine follow button state.
 * 
 * ENDPOINT:
 * GET /api/follow/[userId]/status
 * 
 * FEATURES:
 * - Check if current user follows target user
 * - Get follower/following counts
 * - Detect mutual follows
 * - Permission validation
 * - Public follower counts for unauthenticated users
 * - PRODUCTION OPTIMIZED: Redis caching for performance
 * - PRODUCTION OPTIMIZED: Query optimization and batching
 * 
 * RETURNS:
 * {
 *   following: boolean,
 *   followersCount: number,
 *   followingCount: number,
 *   mutualFollow: boolean,
 *   canFollow: boolean,
 *   message: string
 * }
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Redis caching with 5-minute TTL
 * - Optimized single-query relationship checks
 * - Minimal data transfer
 * - Efficient batch processing support
 * 
 * LAST UPDATED: 2025-07-23 - PRODUCTION PERFORMANCE FIX
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params
    const session = await auth()

    // Validate target user ID
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check Redis cache first for performance optimization
    const currentUserId = session?.user?.id
    const cacheKey = `follow_status:${currentUserId || 'anonymous'}:${targetUserId}`
    
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        console.log(`🔥 FOLLOW STATUS CACHE HIT: ${cacheKey}`)
        return NextResponse.json(JSON.parse(cachedResult))
      }
    } catch (cacheError) {
      console.warn('Redis cache error (non-critical):', cacheError)
    }

    // Get target user basic info with optimized query
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { 
        id: true,
        username: true,
        name: true,
        followersCount: true,
        followingCount: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If not authenticated, return public info only
    if (!currentUserId) {
      const publicResult = {
        following: false,
        followersCount: targetUser.followersCount || 0,
        followingCount: targetUser.followingCount || 0,
        mutualFollow: false,
        canFollow: false,
        message: 'Sign in to follow users'
      }

      // Cache public result for 10 minutes
      try {
        await redis.setex(cacheKey, 600, JSON.stringify(publicResult))
      } catch (cacheError) {
        console.warn('Redis cache set error (non-critical):', cacheError)
      }

      return NextResponse.json(publicResult)
    }

    // Cannot follow yourself
    if (currentUserId === targetUserId) {
      const selfResult = {
        following: false,
        followersCount: targetUser.followersCount || 0,
        followingCount: targetUser.followingCount || 0,
        mutualFollow: false,
        canFollow: false,
        message: 'Cannot follow yourself'
      }

      // Cache self result for 1 hour (rarely changes)
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(selfResult))
      } catch (cacheError) {
        console.warn('Redis cache set error (non-critical):', cacheError)
      }

      return NextResponse.json(selfResult)
    }

    // PRODUCTION OPTIMIZATION: Single query to check both directions
    const followRelations = await prisma.follow.findMany({
      where: {
        OR: [
          {
            followerId: currentUserId,
            followingId: targetUserId
          },
          {
            followerId: targetUserId,
            followingId: currentUserId
          }
        ],
        status: 'ACCEPTED'
      },
      select: {
        followerId: true,
        followingId: true
      }
    })

    // Analyze relationships efficiently
    const isFollowing = followRelations.some(
      relation => relation.followerId === currentUserId && relation.followingId === targetUserId
    )
    const isFollowingBack = followRelations.some(
      relation => relation.followerId === targetUserId && relation.followingId === currentUserId
    )

    const result = {
      following: isFollowing,
      followersCount: targetUser.followersCount || 0,
      followingCount: targetUser.followingCount || 0,
      mutualFollow: isFollowing && isFollowingBack,
      canFollow: true,
      message: isFollowing 
        ? (isFollowingBack ? 'Mutual follow' : 'Following') 
        : 'Not following'
    }

    // Cache result for 5 minutes (balance between performance and freshness)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result))
      console.log(`✅ FOLLOW STATUS CACHED: ${cacheKey}`)
    } catch (cacheError) {
      console.warn('Redis cache set error (non-critical):', cacheError)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Follow status API error:', error)
    return NextResponse.json(
      { error: 'Failed to get follow status' },
      { status: 500 }
    )
  }
}
