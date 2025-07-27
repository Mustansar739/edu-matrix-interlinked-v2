/**
 * Individual Comment API Route Handler
 * 
 * Purpose: Handle UPDATE and DELETE operations for individual comments
 * Features:
 * - Update comment content with permission checks
 * - Delete comments with cascading reply cleanup
 * - Real-time notifications via Socket.IO and Kafka
 * - Proper error handling and validation
 * 
 * This completes the CRUD operations for the production-ready comment system
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'
import type { Comment } from '@/types/comments'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

interface RouteParams {
  params: Promise<{ postId: string; commentId: string }>
}

// Update comment
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId, commentId } = await params
    const body = await request.json()
    const validatedData = updateCommentSchema.parse(body)

    // Check if comment exists and user owns it
    const existingComment = await prisma.socialPostComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        postId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likeCount: true,
        replyCount: true,
      }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.postId !== postId) {
      return NextResponse.json({ error: 'Comment does not belong to this post' }, { status: 400 })
    }

    if (existingComment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Update comment
    const updatedComment = await prisma.socialPostComment.update({
      where: { id: commentId },
      data: {
        content: validatedData.content,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        parentId: true,
        content: true,
        imageUrls: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Get author data
    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        profession: true,
        isVerified: true,
      }
    })

    // Transform to unified Comment interface
    const transformedComment: Comment = {
      id: updatedComment.id,
      content: updatedComment.content,
      postId: postId,
      parentId: updatedComment.parentId,
      author: author ? {
        id: author.id,
        name: author.name,
        username: author.username,
        image: author.avatar,
        role: author.profession as any,
        verified: author.isVerified,
      } : {
        id: session.user.id,
        name: session.user.name || 'Unknown User',
        username: 'unknown',
        image: session.user.image,
        role: 'other',
        verified: false,
      },
      createdAt: updatedComment.createdAt.toISOString(),
      updatedAt: updatedComment.updatedAt.toISOString(),
      isLiked: false,
      _count: {
        likes: updatedComment.likeCount,
        replies: updatedComment.replyCount,
      },
      replies: [],
      edited: true,
    }

    revalidatePath('/students-interlinked')

    // Real-time update via Socket.IO
    await StudentsInterlinkedService.onCommentUpdated(
      transformedComment,
      postId,
      session.user.id
    )

    return NextResponse.json({ comment: transformedComment }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId, commentId } = await params

    // Check if comment exists and user owns it
    const existingComment = await prisma.socialPostComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        postId: true,
        parentId: true,
        replyCount: true,
      }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.postId !== postId) {
      return NextResponse.json({ error: 'Comment does not belong to this post' }, { status: 400 })
    }

    if (existingComment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Start transaction to handle cascading deletes
    await prisma.$transaction(async (tx) => {
      // Delete all replies to this comment
      await tx.socialPostComment.deleteMany({
        where: { parentId: commentId }
      })

      // Delete the comment itself
      await tx.socialPostComment.delete({
        where: { id: commentId }
      })

      // Update parent comment reply count if this was a reply
      if (existingComment.parentId) {
        await tx.socialPostComment.update({
          where: { id: existingComment.parentId },
          data: {
            replyCount: {
              decrement: 1
            }
          }
        })
      }

      // Update post comment count
      await tx.socialPost.update({
        where: { id: postId },
        data: {
          commentCount: {
            decrement: 1 + existingComment.replyCount // Include replies in count
          }
        }
      })
    })

    revalidatePath('/students-interlinked')

    // Real-time deletion via Socket.IO
    await StudentsInterlinkedService.onCommentDeleted(
      commentId,
      postId,
      session.user.id
    )

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
