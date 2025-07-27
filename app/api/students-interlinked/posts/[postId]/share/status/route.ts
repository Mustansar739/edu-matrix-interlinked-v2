import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ postId: string }>
}

// Get share status for a post (current user)
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

    // Check if user has shared this post
    const existingShare = await prisma.socialPostShare.findUnique({
      where: {
        postId_userId: {
          userId: session.user.id,
          postId: postId,
        }
      },
      select: {
        postId: true,
        content: true,
        privacy: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      isShared: !!existingShare,
      share: existingShare || null
    })

  } catch (error) {
    console.error('Get share status error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get share status',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}
