import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const currentUserId = session.user.id

    // Get users that current user is already following
    const alreadyFollowing = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        status: 'ACCEPTED'
      },
      select: {
        followingId: true
      }
    })

    const followingIds = alreadyFollowing.map(f => f.followingId)
    
    // Get suggested users (exclude current user and already following)
    const suggestions = await prisma.user.findMany({
      where: {
        id: {
          notIn: [...followingIds, currentUserId]
        },
        isVerified: true, // Prioritize verified users
        profileVisibility: {
          in: ['PUBLIC', 'CONNECTIONS_ONLY']
        }
      },
      select: {
        id: true,
        name: true,
        username: true,
        profilePictureUrl: true,
        headline: true,
        isVerified: true,
        profession: true,
        institutionId: true
      },
      take: limit * 2 // Get more to filter and randomize
    })

    // Get current user's info for better matching
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        institutionId: true,
        profession: true,
        major: true
      }
    })

    // Score and sort suggestions
    const scoredSuggestions = suggestions.map(user => {
      let score = 0
      
      // Same institution = higher score
      if (currentUser?.institutionId && user.institutionId === currentUser.institutionId) {
        score += 10
      }
      
      // Same profession = higher score
      if (currentUser?.profession && user.profession === currentUser.profession) {
        score += 5
      }
      
      // Verified users get bonus
      if (user.isVerified) {
        score += 3
      }
      
      // Add random factor for diversity
      score += Math.random() * 2
      
      return {
        ...user,
        score
      }
    })

    // Sort by score and take the limit
    const topSuggestions = scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...user }) => user) // Remove score from response

    return NextResponse.json({
      suggestions: topSuggestions,
      total: topSuggestions.length
    })

  } catch (error) {
    console.error('Follow suggestions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
