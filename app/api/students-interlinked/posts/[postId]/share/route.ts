import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

const shareSchema = z.object({
  content: z.string().optional(), // Optional share message
  privacy: z.enum(['PUBLIC', 'PRIVATE', 'FRIENDS', 'FOLLOWERS', 'LISTED']).default('PUBLIC'),
})

interface RouteParams {
  params: Promise<{ postId: string }>
}

// Share/Unshare a post
export async function POST(
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

    const body = await request.json()
    const { content, privacy } = shareSchema.parse(body)

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

    // Check if user already shared this post
    const existingShare = await prisma.socialPostShare.findUnique({
      where: {
        postId_userId: {
          userId: session.user.id,
          postId: postId,
        }
      }
    })

    if (existingShare) {
      return NextResponse.json({ 
        error: 'Post already shared',
        shared: true,
        totalShares: post.shareCount 
      }, { status: 400 })
    }

    // Create share and update share count in a transaction
    const [share, updatedPost] = await prisma.$transaction([
      prisma.socialPostShare.create({
        data: {
          userId: session.user.id,
          postId: postId,
          content: content || null,
          privacy,
        },
      }),
      prisma.socialPost.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
        select: { shareCount: true }
      })
    ])

    // Real-time notification and analytics
    try {
      await StudentsInterlinkedService.onPostShared(
        postId,
        session.user.id,
        post.authorId,
        {
          id: share.postId + '-' + share.userId, // Composite ID for the share
          content: share.content,
          privacy: share.privacy,
          createdAt: new Date().toISOString()
        }
      )
    } catch (notificationError) {
      console.error('Failed to send share notification:', notificationError)
      // Don't fail the request for notification errors
    }

    // Revalidate relevant pages
    revalidatePath('/students-interlinked')
    revalidatePath(`/students-interlinked/posts/${postId}`)

    return NextResponse.json({
      success: true,
      shared: true,
      totalShares: updatedPost.shareCount,
      message: 'Post shared successfully'
    })

  } catch (error) {
    console.error('Share post error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to share post',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}

// Remove share
export async function DELETE(
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

    // Check if share exists
    const existingShare = await prisma.socialPostShare.findUnique({
      where: {
        postId_userId: {
          userId: session.user.id,
          postId: postId,
        }
      },
      include: {
        post: {
          select: {
            authorId: true
          }
        }
      }
    })

    if (!existingShare) {
      return NextResponse.json({ 
        error: 'Share not found',
        shared: false 
      }, { status: 404 })
    }

    // Remove share and update share count in a transaction
    const [, updatedPost] = await prisma.$transaction([
      prisma.socialPostShare.delete({
        where: {
          postId_userId: {
            userId: session.user.id,
            postId: postId,
          }
        }
      }),
      prisma.socialPost.update({
        where: { id: postId },
        data: { shareCount: { decrement: 1 } },
        select: { shareCount: true }
      })
    ])

    // Real-time notification and analytics
    try {
      await StudentsInterlinkedService.onPostUnshared(
        postId,
        session.user.id,
        existingShare.post.authorId
      )
    } catch (notificationError) {
      console.error('Failed to send unshare notification:', notificationError)
      // Don't fail the request for notification errors
    }

    // Revalidate relevant pages
    revalidatePath('/students-interlinked')
    revalidatePath(`/students-interlinked/posts/${postId}`)

    return NextResponse.json({
      success: true,
      shared: false,
      totalShares: Math.max(updatedPost.shareCount, 0),
      message: 'Share removed successfully'
    })

  } catch (error) {
    console.error('Unshare post error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to remove share',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}
