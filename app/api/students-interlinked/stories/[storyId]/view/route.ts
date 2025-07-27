/**
 * ==========================================
 * STORY VIEW API ROUTE - PRODUCTION READY
 * ==========================================
 * 
 * Features:
 * ✅ Proper Follow/Followers system permissions
 * ✅ Real-time view tracking
 * ✅ Production-ready error handling
 * ✅ Complete access control validation
 * 
 * PERMISSIONS:
 * - PUBLIC: Anyone can view
 * - FOLLOWERS: Only followers of author can view
 * - PRIVATE: Only author can view
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

interface RouteParams {
  params: Promise<{ storyId: string }>
}

// View story endpoint
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    
    
    const { storyId } = await params

    // Check if story exists and is still active
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { 
        id: true, 
        authorId: true, 
        visibility: true,
        expiresAt: true,
      }
    })

    if (!story || new Date() > story.expiresAt) {
      return NextResponse.json({ error: 'Story not found or expired' }, { status: 404 })
    }

    // Check access permissions based on Follow/Followers system
    const hasAccess = 
      story.visibility === 'PUBLIC' ||
      story.authorId === session.user.id ||
      (story.visibility === 'FOLLOWERS' && await checkFollowing(session.user.id, story.authorId))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }    // Check if user already viewed this story
    const existingView = await prisma.storyView.findUnique({
      where: {
        storyId_userId: {
          storyId: storyId,
          userId: session.user.id,
        }
      }
    })

    if (!existingView) {
      // Create new view record
      await prisma.storyView.create({
        data: {
          userId: session.user.id,
          storyId: storyId,
          viewedAt: new Date(),
        }
      })
    }    // Get updated view count
    const viewCount = await prisma.storyView.count({
      where: { storyId: storyId }
    })

    // Real-time integration - Instagram-like story views
    await StudentsInterlinkedService.onStoryViewed(storyId, session.user.id, story.authorId)

    return NextResponse.json({ 
      message: 'Story view recorded',
      viewCount,
      hasViewed: true 
    })

  } catch (error) {
    console.error('Error recording story view:', error)
    return NextResponse.json(
      { error: 'Failed to record story view' },
      { status: 500 }
    )
  }
}

// Helper function to check if user follows the author (for FOLLOWERS stories)
async function checkFollowing(userId: string, authorId: string): Promise<boolean> {
  const follow = await prisma.follow.findFirst({
    where: {
      followerId: userId,
      followingId: authorId,
      status: 'ACCEPTED'
    }
  })
  return !!follow
}
