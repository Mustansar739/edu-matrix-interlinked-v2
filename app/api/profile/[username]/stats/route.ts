import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Get user profile by username to get userId
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        followersCount: true,
        followingCount: true,
        profileViewsCount: true,
        totalLikesReceived: true,
        profileVisibility: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check privacy settings
    const session = await auth()
    const isOwnProfile = session?.user?.id === user.id
    
    if (user.profileVisibility === 'PRIVATE' && !isOwnProfile) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      )
    }

    const userId = user.id

    // Get followers count from User model (already calculated)
    const followersCount = user.followersCount || 0
    const followingCount = user.followingCount || 0

    // Get social posts count
    const postsCount = await prisma.socialPost.count({
      where: { authorId: userId }
    })

    // Get comments count
    const commentsCount = await prisma.socialPostComment.count({
      where: { userId: userId }
    })

    // Get shares count
    const sharesCount = await prisma.socialPostShare.count({
      where: { userId: userId }
    })

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentViews = await prisma.profileView.count({
      where: {
        profileId: userId,
        viewedAt: {
          gte: sevenDaysAgo
        }
      }
    })

    const recentLikes = await prisma.socialPostLike.count({
      where: {
        post: {
          authorId: userId
        },
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    })

    const recentFollowers = await prisma.follow.count({
      where: {
        followingId: userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    })

    const stats = {
      followersCount,
      followingCount,
      profileViewsCount: user.profileViewsCount || 0,
      totalLikesReceived: user.totalLikesReceived || 0,
      postsCount,
      commentsCount,
      sharesCount,
      recentViews,
      recentLikes,
      recentFollowers
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
