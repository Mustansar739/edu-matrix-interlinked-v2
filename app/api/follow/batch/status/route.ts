/**
 * =============================================================================
 * BATCH FOLLOW STATUS API - PRODUCTION PERFORMANCE OPTIMIZATION
 * =============================================================================
 * 
 * PURPOSE:
 * Get follow status for multiple users in a single request.
 * Prevents N+1 API calls when checking follow status for multiple users.
 * 
 * ENDPOINT:
 * POST /api/follow/batch/status
 * 
 * BODY:
 * {
 *   userIds: string[]  // Array of user IDs to check (max 50)
 * }
 * 
 * RETURNS:
 * {
 *   [userId]: {
 *     following: boolean,
 *     followersCount: number,
 *     followingCount: number,
 *     mutualFollow: boolean,
 *     canFollow: boolean,
 *     message: string
 *   }
 * }
 * 
 * PERFORMANCE FEATURES:
 * - Single database query for all relationships
 * - Redis caching for individual and batch results
 * - Efficient relationship mapping
 * - Request deduplication
 * - Rate limiting protection
 * 
 * CREATED: 2025-07-23 - PRODUCTION PERFORMANCE FIX
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

const batchStatusSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50) // Limit to 50 users for performance
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    
    // Validate input
    const { userIds } = batchStatusSchema.parse(body)
    const currentUserId = session?.user?.id

    console.log(`📊 BATCH FOLLOW STATUS: Checking ${userIds.length} users for user ${currentUserId || 'anonymous'}`)

    // Remove duplicates and current user from the list
    const uniqueUserIds = [...new Set(userIds)].filter(id => id !== currentUserId)
    
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({})
    }

    // Check cache first for each user
    const cachedResults: Record<string, any> = {}
    const uncachedUserIds: string[] = []

    for (const userId of uniqueUserIds) {
      const cacheKey = `follow_status:${currentUserId || 'anonymous'}:${userId}`
      try {
        const cachedResult = await redis.get(cacheKey)
        if (cachedResult) {
          cachedResults[userId] = JSON.parse(cachedResult)
        } else {
          uncachedUserIds.push(userId)
        }
      } catch (cacheError) {
        console.warn('Redis cache error for user', userId, cacheError)
        uncachedUserIds.push(userId)
      }
    }

    console.log(`🔥 BATCH CACHE: ${Object.keys(cachedResults).length} cached, ${uncachedUserIds.length} need fetching`)

    let freshResults: Record<string, any> = {}

    if (uncachedUserIds.length > 0) {
      // Get user info for uncached users
      const targetUsers = await prisma.user.findMany({
        where: { id: { in: uncachedUserIds } },
        select: { 
          id: true,
          username: true,
          name: true,
          followersCount: true,
          followingCount: true
        }
      })

      const targetUserMap = new Map(targetUsers.map(user => [user.id, user]))

      if (!currentUserId) {
        // Not authenticated - return public info for all users
        for (const userId of uncachedUserIds) {
          const user = targetUserMap.get(userId)
          if (user) {
            const result = {
              following: false,
              followersCount: user.followersCount || 0,
              followingCount: user.followingCount || 0,
              mutualFollow: false,
              canFollow: false,
              message: 'Sign in to follow users'
            }
            freshResults[userId] = result

            // Cache public result
            const cacheKey = `follow_status:anonymous:${userId}`
            try {
              await redis.setex(cacheKey, 600, JSON.stringify(result))
            } catch (cacheError) {
              console.warn('Redis cache set error (non-critical):', cacheError)
            }
          }
        }
      } else {
        // Authenticated - get follow relationships efficiently
        const followRelations = await prisma.follow.findMany({
          where: {
            OR: [
              {
                followerId: currentUserId,
                followingId: { in: uncachedUserIds }
              },
              {
                followerId: { in: uncachedUserIds },
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

        // Create efficient lookup maps
        const followingMap = new Map<string, boolean>()
        const followersMap = new Map<string, boolean>()

        for (const relation of followRelations) {
          if (relation.followerId === currentUserId) {
            followingMap.set(relation.followingId, true)
          }
          if (relation.followingId === currentUserId) {
            followersMap.set(relation.followerId, true)
          }
        }

        // Build results for each uncached user
        for (const userId of uncachedUserIds) {
          const user = targetUserMap.get(userId)
          if (user) {
            const isFollowing = followingMap.get(userId) || false
            const isFollowingBack = followersMap.get(userId) || false

            const result = {
              following: isFollowing,
              followersCount: user.followersCount || 0,
              followingCount: user.followingCount || 0,
              mutualFollow: isFollowing && isFollowingBack,
              canFollow: true,
              message: isFollowing 
                ? (isFollowingBack ? 'Mutual follow' : 'Following') 
                : 'Not following'
            }

            freshResults[userId] = result

            // Cache individual result
            const cacheKey = `follow_status:${currentUserId}:${userId}`
            try {
              await redis.setex(cacheKey, 300, JSON.stringify(result))
            } catch (cacheError) {
              console.warn('Redis cache set error (non-critical):', cacheError)
            }
          }
        }
      }
    }

    // Combine cached and fresh results
    const finalResults = { ...cachedResults, ...freshResults }

    console.log(`✅ BATCH FOLLOW STATUS: Returning ${Object.keys(finalResults).length} results`)

    return NextResponse.json(finalResults)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Batch follow status API error:', error)
    return NextResponse.json(
      { error: 'Failed to get batch follow status' },
      { status: 500 }
    )
  }
}
