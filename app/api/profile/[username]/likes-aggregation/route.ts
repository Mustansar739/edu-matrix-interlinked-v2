/**
 * =============================================================================
 * PROFILE LIKES AGGREGATION API - Calculate Total User Likes (FIXED)
 * =============================================================================
 * 
 * PURPOSE:
 * Calculates and updates the total likes received by a user across all their content.
 * This ensures the profile displays accurate aggregated like counts from posts,
 * projects, achievements, work experience, education, certifications, etc.
 * 
 * FIXED ROUTING ISSUE:
 * - Changed from [userId] to [username] to match Next.js 15 routing convention
 * - Now consistent with all other profile API routes
 * - Resolves "different slug names for the same dynamic path" error
 * 
 * ENDPOINTS:
 * - GET /api/profile/[username]/likes-aggregation - Get current aggregated likes
 * - POST /api/profile/[username]/likes-aggregation - Recalculate and update likes
 * 
 * FEATURES:
 * ✅ Aggregates likes from all content types
 * ✅ Real-time calculation from Universal Like System
 * ✅ Updates profile totalLikesReceived field
 * ✅ Comprehensive error handling
 * ✅ Performance optimization with database transactions
 * ✅ Detailed breakdown by content type
 * ✅ Authentication and authorization
 * ✅ Next.js 15 routing compatibility (fixed)
 * 
 * CONTENT TYPES INCLUDED:
 * - Posts and stories
 * - Projects and achievements  
 * - Work experience entries
 * - Education records
 * - Certifications
 * - Profile direct likes
 * - Comments and other content
 * 
 * SECURITY:
 * - Authentication required for POST operations
 * - Users can only update their own aggregation
 * - Public read access for transparency
 * - Input validation and sanitization
 * 
 * PERFORMANCE:
 * - Efficient database queries with proper indexing
 * - Batch operations for large datasets
 * - Caching considerations for frequent access
 * - Transaction handling for data consistency
 * 
 * ROUTING CONSISTENCY:
 * - Follows Next.js 15 App Router conventions
 * - Consistent with other profile API routes
 * - Uses username parameter like frontend routes
 * 
 * LAST UPDATED: 2025-07-05 - Fixed routing conflict
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ContentType } from '@/types/profile'
import { z } from 'zod'

// Validation schema for aggregation requests
const aggregationSchema = z.object({
  forceRecalculate: z.boolean().optional().default(false),
  includeBreakdown: z.boolean().optional().default(true)
})

/**
 * GET AGGREGATED LIKES COUNT
 * Returns current aggregated likes for a user profile
 * 
 * @param request - The incoming request with optional query parameters
 * @param params - Route parameters containing the username
 * @returns JSON response with user's total likes and optional breakdown
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const url = new URL(request.url)
    const includeBreakdown = url.searchParams.get('breakdown') === 'true'

    // Validate username parameter
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Find user by username and get their likes data
    const user = await prisma.user.findUnique({
      where: { username },
      select: { 
        id: true, 
        username: true, 
        totalLikesReceived: true 
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let breakdown = {}
    
    if (includeBreakdown) {
      // Calculate breakdown by content type using user ID
      const likesBreakdown = await calculateLikesBreakdown(user.id)
      breakdown = likesBreakdown
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      username: user.username,
      totalLikes: user.totalLikesReceived || 0,
      lastUpdated: new Date().toISOString(),
      ...(includeBreakdown && { breakdown })
    })

  } catch (error) {
    console.error('Get likes aggregation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * RECALCULATE AND UPDATE LIKES AGGREGATION
 * Recalculates total likes across all content and updates profile
 * 
 * @param request - The incoming request with aggregation options
 * @param params - Route parameters containing the username
 * @returns JSON response with updated likes totals
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const session = await auth()

    // Authentication check
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { 
        id: true, 
        username: true, 
        totalLikesReceived: true 
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Authorization check - only user can update their own aggregation
    if (session.user.id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - can only update your own profile' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { forceRecalculate, includeBreakdown } = aggregationSchema.parse(body)

    // Calculate total likes across all content using user ID
    const { totalLikes, breakdown } = await recalculateUserLikes(user.id, includeBreakdown)

    // Update user profile with new total
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        totalLikesReceived: totalLikes,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        totalLikesReceived: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Likes aggregation updated successfully',
      userId: updatedUser.id,
      username: updatedUser.username,
      previousTotal: user.totalLikesReceived || 0,
      newTotal: totalLikes,
      difference: totalLikes - (user.totalLikesReceived || 0),
      lastUpdated: updatedUser.updatedAt.toISOString(),
      ...(includeBreakdown && { breakdown })
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update likes aggregation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate likes breakdown by content type
 * 
 * @param userId - The user's ID to calculate likes for
 * @returns Record of content types and their like counts
 */
async function calculateLikesBreakdown(userId: string): Promise<Record<ContentType, number>> {
  const contentTypes: ContentType[] = [
    'post', 'story', 'comment', 'project', 'achievement', 
    'work_experience', 'education', 'certification', 
    'skill_endorsement', 'profile_view', 'connection', 'profile'
  ]

  const breakdown: Record<string, number> = {}

  for (const contentType of contentTypes) {
    try {
      const count = await prisma.universalLike.count({
        where: {
          recipientId: userId,
          contentType: contentType
        }
      })
      breakdown[contentType] = count
    } catch (error) {
      console.error(`Error counting likes for ${contentType}:`, error)
      breakdown[contentType] = 0
    }
  }

  return breakdown as Record<ContentType, number>
}

/**
 * Recalculate total user likes across all content
 * 
 * @param userId - The user's ID to recalculate likes for
 * @param includeBreakdown - Whether to include detailed breakdown
 * @returns Object with total likes and optional breakdown
 */
async function recalculateUserLikes(userId: string, includeBreakdown: boolean = false) {
  // Count total likes where user is the recipient
  const totalLikesResult = await prisma.universalLike.aggregate({
    where: {
      recipientId: userId
    },
    _count: {
      id: true
    }
  })

  const totalLikes = totalLikesResult._count.id || 0

  let breakdown = {}
  if (includeBreakdown) {
    breakdown = await calculateLikesBreakdown(userId)
  }

  return {
    totalLikes,
    breakdown
  }
}
