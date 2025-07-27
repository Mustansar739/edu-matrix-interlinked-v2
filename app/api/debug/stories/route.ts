/**
 * ==========================================
 * STORY DEBUG API ROUTE - PRODUCTION DEBUGGING
 * ==========================================
 * 
 * Temporary debug endpoint to analyze story visibility issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 DEBUG: Starting story debug for user:', session.user.id)

    // 1. Check all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
      },
      take: 10
    })
    console.log('👥 All users:', allUsers)

    // 2. Check all stories
    const allStories = await prisma.story.findMany({
      select: {
        id: true,
        authorId: true,
        content: true,
        visibility: true,
        createdAt: true,
        expiresAt: true,
        author: {
          select: {
            name: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    console.log('📚 All stories:', allStories)

    // 3. Check follow relationships for current user
    const userFollows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        status: 'ACCEPTED'
      },
      select: {
        followingId: true,
        following: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })
    console.log('➡️ User follows:', userFollows)

    const userFollowers = await prisma.follow.findMany({
      where: {
        followingId: session.user.id,
        status: 'ACCEPTED'
      },
      select: {
        followerId: true,
        follower: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })
    console.log('⬅️ User followers:', userFollowers)

    // 4. Check active stories (non-expired)
    const activeStories = allStories.filter(story => 
      !story.expiresAt || new Date(story.expiresAt) > new Date()
    )
    console.log('⏰ Active stories:', activeStories)

    // 5. Simulate visibility logic
    const followingIds = userFollows.map(f => f.followingId)
    const followerIds = userFollowers.map(f => f.followerId)
    const mutualFollowIds = followingIds.filter(id => followerIds.includes(id))

    console.log('🔄 Relationship analysis:', {
      followingIds,
      followerIds,
      mutualFollowIds
    })

    // 6. What stories should be visible to current user?
    const visibleStories = activeStories.filter(story => {
      // Own stories
      if (story.authorId === session.user.id) return true
      
      // Public stories
      if (story.visibility === 'PUBLIC') return true
      
      // Followers stories (from people user follows)
      if (story.visibility === 'FOLLOWERS' && followingIds.includes(story.authorId)) return true
      
      // Friends stories (from mutual follows)
      if (story.visibility === 'FRIENDS' && mutualFollowIds.includes(story.authorId)) return true
      
      return false
    })

    console.log('👀 Stories visible to user:', visibleStories)

    return NextResponse.json({
      debug: {
        userId: session.user.id,
        userName: session.user.name,
        allUsers: allUsers.length,
        allStories: allStories.length,
        activeStories: activeStories.length,
        visibleStories: visibleStories.length,
        followingCount: followingIds.length,
        followersCount: followerIds.length,
        mutualFollowsCount: mutualFollowIds.length,
      },
      data: {
        allUsers,
        allStories,
        activeStories,
        visibleStories,
        relationships: {
          following: userFollows,
          followers: userFollowers,
          followingIds,
          followerIds,
          mutualFollowIds
        }
      }
    })

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed' },
      { status: 500 }
    )
  }
}
