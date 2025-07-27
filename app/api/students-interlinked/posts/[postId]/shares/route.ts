import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ postId: string }>
}

// Get shares for a post
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: Await params before accessing properties
    const { postId } = await params

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const offset = (page - 1) * limit

    // Check if post exists and user has access
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true, 
        visibility: true,
        status: true,
        shareCount: true 
      }
    })

    if (!post || post.status === 'DELETED') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = 
      post.visibility === 'PUBLIC' ||
      post.authorId === session.user.id
    // TODO: Add more complex permission logic for FRIENDS and GROUPS visibility

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get shares with pagination
    const [shares, totalShares] = await Promise.all([
      prisma.socialPostShare.findMany({
        where: { postId: postId },
        select: {
          postId: true,
          userId: true,
          content: true,
          privacy: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.socialPostShare.count({
        where: { postId: postId }
      })
    ])

    // Get user data for shares (cross-schema lookup would be done at application level)
    const userIds = [...new Set(shares.map(share => share.userId))]
    
    // NOTE: In a real implementation, you'd fetch user data from auth_schema
    // For now, we'll create placeholder user data
    const users = userIds.map(userId => ({
      id: userId,
      name: `User ${userId}`,
      username: `user_${userId}`,
      image: '/default-avatar.svg',
      verified: false
    }))

    // Map shares with user data
    const sharesWithUsers = shares.map(share => ({
      ...share,
      user: users.find(user => user.id === share.userId) || {
        id: share.userId,
        name: 'Unknown User',
        username: 'unknown',
        image: '/default-avatar.svg',
        verified: false
      }
    }))

    const totalPages = Math.ceil(totalShares / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      shares: sharesWithUsers,
      pagination: {
        page,
        limit,
        totalShares,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      }
    })

  } catch (error) {
    console.error('Get shares error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get shares',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}
