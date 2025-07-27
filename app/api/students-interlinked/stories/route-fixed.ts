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
 * PRODUCTION FIX: Correct Follow/Followers System Implementation
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

    console.log(`📱 STORIES DEBUG: Fetching stories for user ${session.user.id} (${session.user.name}):`, {
      includeOwn,
      showAllPublic,
      limit
    })

    // Check Redis cache first for performance
    const cacheKey = `stories:${session.user.id}:${includeOwn}:${showAllPublic}:${limit}`
    console.log(`🔑 STORIES DEBUG: Cache key: ${cacheKey}`)
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData) {
        console.log('📦 STORIES DEBUG: Returning cached stories data')
        return NextResponse.json(JSON.parse(cachedData))
      } else {
        console.log('🆕 STORIES DEBUG: No cached data found, fetching fresh data')
      }
    } catch (cacheError) {
      console.log('⚠️ STORIES DEBUG: Cache error:', cacheError)
    }

    // Get user's follow relationships for proper story visibility
    // PRODUCTION FIX: Correct Follow/Followers system implementation
    const userFollows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id, // People the current user follows
        status: 'ACCEPTED'
      },
      select: {
        followingId: true,
      }
    })

    // Get IDs for different relationship types
    const followingIds = userFollows.map(f => f.followingId) // People user follows

    console.log(`🔄 STORIES DEBUG: Relationships for user ${session.user.id}:`, {
      followingIds: followingIds.slice(0, 5), // First 5 for debugging
      totalFollowing: followingIds.length
    })

    // Get current user's institution for institutional discovery
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { institutionId: true }
    })

    // Build comprehensive visibility filter for FOLLOW/FOLLOWERS system
    // PRODUCTION FIX: Correct implementation for Instagram/Twitter-like story visibility
    const visibilityConditions = []

    // 1. PUBLIC stories - visible to everyone (ALWAYS include this)
    if (showAllPublic) {
      visibilityConditions.push({ visibility: 'PUBLIC' as const })
    }

    // 2. FOLLOWERS stories - visible to people who follow the author
    // Current user can see FOLLOWERS stories from people they follow
    if (followingIds.length > 0) {
      visibilityConditions.push({
        AND: [
          { authorId: { in: followingIds } },
          { visibility: 'FOLLOWERS' as const }
        ]
      })
    } else {
      console.log('⚠️ STORIES DEBUG: User follows nobody - no FOLLOWERS stories will be visible')
    }

    // 3. Own stories - always included for the author (all visibility types)
    visibilityConditions.push({ authorId: session.user.id })

    // 4. Institution-based discovery - students from same institution (PUBLIC only)
    if (currentUser?.institutionId && showAllPublic) {
      visibilityConditions.push({
        AND: [
          { visibility: 'PUBLIC' as const },
          { 
            author: { 
              institutionId: currentUser.institutionId 
            } 
          }
        ]
      })
    }

    const visibilityFilter = {
      OR: visibilityConditions
    }

    // SAFETY CHECK: Ensure we always have some visibility conditions
    if (visibilityConditions.length === 0) {
      console.log('⚠️ STORIES DEBUG: No visibility conditions! Adding default conditions.')
      visibilityFilter.OR = [
        { authorId: session.user.id }, // Always show own stories
        { visibility: 'PUBLIC' as const } // Always show public stories
      ]
    }

    console.log('🔍 STORIES DEBUG: Final visibility filter:', JSON.stringify(visibilityFilter, null, 2))
    console.log(`📊 STORIES DEBUG: Total visibility conditions: ${visibilityConditions.length}`)

    // Get active stories with complete author data
    const stories = await prisma.story.findMany({
      where: {
        ...visibilityFilter,
        expiresAt: {
          gt: new Date() // Only non-expired stories
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            profession: true,
            // Include additional profile data for rich story display
            headline: true,
            institutionId: true,
            major: true,
            academicYear: true
          }
        },
        views: {
          where: {
            userId: session.user.id
          },
          select: {
            id: true,
            viewedAt: true,
          }
        },
        reactions: {
          where: {
            userId: session.user.id
          },
          select: {
            id: true,
            reaction: true,
          }
        },
        _count: {
          select: {
            views: true,
            reactions: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit * 10, // Get more to group by author
    })

    // Transform stories to match frontend expectations
    const transformedStories = stories.map(story => ({
      ...story,
      // Ensure mediaUrls array exists (fallback to legacy fields)
      mediaUrls: story.mediaUrls.length > 0 
        ? story.mediaUrls 
        : [story.imageUrl, story.videoUrl].filter(Boolean),
      // Clean up author data
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

    // Group stories by author and prioritize unseen stories
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

    console.log(`✅ STORIES DEBUG: Final results for user ${session.user.id}:`, {
      totalGroups: groupedStories.length,
      totalStories: transformedStories.length,
      unseenGroups: groupedStories.filter(g => g.hasUnseenStories).length,
      storiesByVisibility: transformedStories.reduce((acc, story) => {
        acc[story.visibility] = (acc[story.visibility] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      firstFewStories: transformedStories.slice(0, 3).map(s => ({
        id: s.id.slice(0, 8),
        authorName: s.author.name,
        visibility: s.visibility,
        content: s.content?.slice(0, 20) + '...'
      }))
    })

    const responseData = {
      storyGroups: groupedStories,
      totalStories: transformedStories.length,
      totalGroups: groupedStories.length,
      fetchMetadata: {
        includeOwn,
        showAllPublic,
        limit,
        followingCount: followingIds.length,
        institutionId: currentUser?.institutionId || null,
        timestamp: new Date().toISOString()
      }
    }
    
    // Cache the response for 2 minutes (shorter cache for real-time updates)
    await redis.setex(cacheKey, 120, JSON.stringify(responseData))
    
    console.log(`✅ Fetched ${groupedStories.length} story groups (${transformedStories.length} total stories) for user ${session.user.id}`)
    console.log(`📊 Story distribution:`, {
      totalUsers: groupedStories.length,
      avgStoriesPerUser: Math.round(transformedStories.length / groupedStories.length * 10) / 10,
      unseenGroups: groupedStories.filter(g => g.hasUnseenStories).length,
      visibilityBreakdown: {
        public: transformedStories.filter(s => s.visibility === 'PUBLIC').length,
        followers: transformedStories.filter(s => s.visibility === 'FOLLOWERS').length,
        private: transformedStories.filter(s => s.visibility === 'PRIVATE').length,
      }
    })
    
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
