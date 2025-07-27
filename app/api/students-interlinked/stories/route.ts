/**
 * ==========================================
 * STORIES API ROUTE - PRODUCTION READY
 * ==========================================
 * 
 * Features:
 * ✅ Proper error handling and validation
 * ✅ Real-time integration via Kafka
 * ✅ Redis caching for performance
 * ✅ Complete author data inclusion
 * ✅ Media URLs array support
 * ✅ Production-ready response structure
 * ✅ FOLLOWERS-ONLY system (no friends system)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'
import { redis } from '@/lib/redis'

// Story creation schema with proper validation
const createStorySchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  mediaUrls: z.array(z.string().url()).max(5).default([]), // Support up to 5 media items
  mediaTypes: z.array(z.enum(['image', 'video'])).default([]), // Corresponding media types
  backgroundColor: z.string().optional(), // Background color for text stories
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS']).default('FOLLOWERS'), // PRODUCTION FIX: Only FOLLOWERS system
  allowReplies: z.boolean().default(true),
  allowReactions: z.boolean().default(true),
}).refine(
  (data) => data.content || data.mediaUrls.length > 0, 
  { message: "Story must have either content or media" }
).refine(
  (data) => data.mediaUrls.length === data.mediaTypes.length || data.mediaTypes.length === 0,
  { message: "Media URLs and types arrays must have the same length" }
)

/**
 * GET /api/students-interlinked/stories
 * Fetch active stories based on Follow/Followers system (Instagram/Twitter-like)
 * Returns properly structured story groups with complete author data
 * 
 * PRODUCTION OPTIMIZATION: Massive performance improvements
 * 
 * VISIBILITY LOGIC:
 * - PUBLIC: Visible to everyone
 * - FOLLOWERS: Visible to users who follow the author
 * - PRIVATE: Visible to author only
 * 
 * FOLLOW RELATIONSHIPS:
 * - followerId: User who follows someone
 * - followingId: User being followed
 * - User A follows User B = User A can see User B's FOLLOWERS/PUBLIC stories
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      console.log('❌ Stories API: No authenticated session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeOwn = searchParams.get('includeOwn') === 'true'
    const showAllPublic = searchParams.get('showAllPublic') !== 'false' // Default to true for student platform
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 for performance

    console.log(`📱 STORIES OPTIMIZED: Fetching stories for user ${session.user.id}:`, {
      includeOwn,
      showAllPublic,
      limit
    })

    // Check Redis cache first for performance optimization
    const cacheKey = `stories_v2:${session.user.id}:${includeOwn}:${showAllPublic}:${limit}`
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData) {
        console.log('� STORIES CACHE HIT - Returning cached data')
        return NextResponse.json(JSON.parse(cachedData))
      }
    } catch (cacheError) {
      console.warn('Redis cache error (non-critical):', cacheError)
    }

    console.log('🆕 STORIES: No cache, fetching fresh data')

    // PRODUCTION OPTIMIZATION: Get following IDs efficiently with single query
    const userFollows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        status: 'ACCEPTED'
      },
      select: {
        followingId: true,
      }
    })

    const followingIds = userFollows.map(f => f.followingId)
    console.log(`🔄 STORIES: User follows ${followingIds.length} people`)

    // PRODUCTION OPTIMIZATION: Build efficient story visibility conditions
    const storyWhereConditions = []

    // 1. Own stories (all visibility levels)
    storyWhereConditions.push({ authorId: session.user.id })

    // 2. PUBLIC stories (if enabled)
    if (showAllPublic) {
      storyWhereConditions.push({ visibility: 'PUBLIC' as const })
    }

    // 3. FOLLOWERS stories from people user follows
    if (followingIds.length > 0) {
      storyWhereConditions.push({
        AND: [
          { authorId: { in: followingIds } },
          { visibility: 'FOLLOWERS' as const }
        ]
      })
    }

    // PRODUCTION OPTIMIZATION: Single optimized query for stories
    const stories = await prisma.story.findMany({
      where: {
        OR: storyWhereConditions,
        expiresAt: {
          gt: new Date() // Only non-expired stories
        },
      },
      select: {
        id: true,
        authorId: true,
        content: true,
        imageUrl: true,
        videoUrl: true,
        backgroundColor: true,
        visibility: true,
        allowReplies: true,
        allowReactions: true,
        viewCount: true,
        reactionCount: true,
        createdAt: true,
        expiresAt: true,
        mediaUrls: true,
        mediaTypes: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            profession: true,
            headline: true,
            major: true,
            academicYear: true,
            institutionId: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit * 3, // Reduced from limit * 10 for better performance
    })

    console.log(`📊 STORIES: Found ${stories.length} total stories`)

    // Check user's views and reactions efficiently
    const storyIds = stories.map(s => s.id)
    
    const [userViews, userReactions] = await Promise.all([
      prisma.storyView.findMany({
        where: {
          storyId: { in: storyIds },
          userId: session.user.id
        },
        select: {
          storyId: true,
          viewedAt: true
        }
      }),
      prisma.storyReaction.findMany({
        where: {
          storyId: { in: storyIds },
          userId: session.user.id
        },
        select: {
          storyId: true,
          reaction: true
        }
      })
    ])

    // Create lookup maps for efficient processing
    const viewsMap = new Map(userViews.map(v => [v.storyId, v]))
    const reactionsMap = new Map(userReactions.map(r => [r.storyId, r]))

    // Transform stories efficiently
    const transformedStories = stories.map(story => ({
      ...story,
      // Ensure mediaUrls array exists (fallback to legacy fields)
      mediaUrls: story.mediaUrls.length > 0 
        ? story.mediaUrls 
        : [story.imageUrl, story.videoUrl].filter(Boolean),
      // Add user interaction data
      views: viewsMap.has(story.id) ? [viewsMap.get(story.id)] : [],
      reactions: reactionsMap.has(story.id) ? [reactionsMap.get(story.id)] : [],
      _count: {
        views: story.viewCount || 0,
        reactions: story.reactionCount || 0
      },
      // Clean up author data for frontend compatibility
      author: {
        id: story.author.id,
        name: story.author.name,
        image: story.author.avatar, // Map avatar to image for frontend compatibility
        username: story.author.username,
        profile: {
          profession: story.author.profession,
          headline: story.author.headline,
          major: story.author.major,
          academicLevel: story.author.academicYear,
          institutionId: story.author.institutionId
        }
      }
    }))

    // PRODUCTION OPTIMIZATION: Efficient story grouping
    const storyGroups = new Map()
    
    transformedStories.forEach(story => {
      const authorId = story.authorId
      const hasViewed = story.views && story.views.length > 0
      
      if (!storyGroups.has(authorId)) {
        storyGroups.set(authorId, {
          author: story.author,
          stories: [],
          hasUnseenStories: false,
          lastStoryTime: story.createdAt,
        })
      }
      
      const group = storyGroups.get(authorId)
      group.stories.push(story)
      
      if (!hasViewed) {
        group.hasUnseenStories = true
      }
      
      if (story.createdAt > group.lastStoryTime) {
        group.lastStoryTime = story.createdAt
      }
    })

    // Convert to array and sort (unseen first, then by recency)
    const groupedStories = Array.from(storyGroups.values())
      .sort((a, b) => {
        // Prioritize groups with unseen stories
        if (a.hasUnseenStories && !b.hasUnseenStories) return -1
        if (!a.hasUnseenStories && b.hasUnseenStories) return 1
        
        // Then sort by most recent story
        return new Date(b.lastStoryTime).getTime() - new Date(a.lastStoryTime).getTime()
      })
      .slice(0, limit)

    const responseData = {
      storyGroups: groupedStories,
      totalStories: transformedStories.length,
      totalGroups: groupedStories.length,
      fetchMetadata: {
        includeOwn,
        showAllPublic,
        limit,
        followingCount: followingIds.length,
        timestamp: new Date().toISOString(),
        cacheKey // For debugging
      }
    }
    
    // Cache the response for 2 minutes (shorter cache for real-time updates)
    try {
      await redis.setex(cacheKey, 120, JSON.stringify(responseData))
      console.log(`✅ STORIES CACHED: ${cacheKey}`)
    } catch (cacheError) {
      console.warn('Redis cache set error (non-critical):', cacheError)
    }
    
    console.log(`✅ STORIES OPTIMIZED: Returning ${groupedStories.length} story groups (${transformedStories.length} total stories)`)
    
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Error fetching stories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/students-interlinked/stories
 * Create a new story with proper validation and real-time updates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Creating story with data:', body)
    
    const validatedData = createStorySchema.parse(body)

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create story with proper data structure
    const story = await prisma.story.create({
      data: {
        content: validatedData.content || '',
        mediaUrls: validatedData.mediaUrls,
        mediaTypes: validatedData.mediaTypes,
        backgroundColor: validatedData.backgroundColor,
        visibility: validatedData.visibility,
        allowReplies: validatedData.allowReplies,
        allowReactions: validatedData.allowReactions,
        authorId: session.user.id,
        expiresAt,
        // Set legacy fields for backward compatibility
        imageUrl: validatedData.mediaUrls.find((_, index) => validatedData.mediaTypes[index] === 'image'),
        videoUrl: validatedData.mediaUrls.find((_, index) => validatedData.mediaTypes[index] === 'video'),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            profession: true,
            headline: true,
            major: true,
            academicYear: true
          }
        },
        _count: {
          select: {
            views: true,
            reactions: true
          }
        }
      }
    })

    // Transform story for frontend compatibility
    const transformedStory = {
      ...story,
      author: {
        id: story.author.id,
        name: story.author.name,
        image: story.author.avatar,
        username: story.author.username,
        profile: {
          profession: story.author.profession,
          headline: story.author.headline,
          major: story.author.major,
          academicLevel: story.author.academicYear
        }
      }
    }

    // Invalidate cache
    const cachePattern = `stories:${session.user.id}:*`
    const keys = await redis.keys(cachePattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    // Revalidate Next.js cache
    revalidatePath('/students-interlinked')

    // Real-time integration - Instagram-like stories
    await StudentsInterlinkedService.onStoryCreated(transformedStory, session.user.id)

    console.log(`✅ Story created successfully: ${story.id}`)

    return NextResponse.json({ 
      story: transformedStory,
      message: 'Story created successfully' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ Error creating story:', error)
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    )
  }
}
