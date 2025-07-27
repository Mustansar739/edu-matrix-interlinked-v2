import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  videoUrls: z.array(z.string().url()).optional(),
  documentUrls: z.array(z.string().url()).optional(),
  educationalContext: z.string().optional(),
  tags: z.array(z.string()).optional(),
  studyGroupId: z.string().optional(),
  courseId: z.string().optional(),
  subjectArea: z.string().optional(),
  academicLevel: z.enum(['HIGH_SCHOOL', 'UNDERGRADUATE', 'GRADUATE', 'DOCTORATE', 'PROFESSIONAL', 'CONTINUING_EDUCATION']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FRIENDS', 'FOLLOWERS', 'LISTED']).optional(),
  postType: z.enum(['GENERAL', 'STUDY_HELP', 'PROJECT_SHARE', 'ACHIEVEMENT', 'EVENT_SHARE', 'RESOURCE_SHARE', 'GROUP_DISCUSSION', 'CAREER_ADVICE', 'TIPS_TRICKS', 'MOTIVATION']).optional(),
})

interface RouteParams {
  params: Promise<{ postId: string }>
}

// Get single post with full details
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

    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      include: {
        likes: {
          select: {
            id: true,
            userId: true,
            reaction: true,
            createdAt: true,
          }
        },
        comments: {
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
          },
          orderBy: { createdAt: 'desc' },
        },
        shares: true,
        bookmarks: true,
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user has access to this post
    const hasAccess = 
      post.visibility === 'PUBLIC' ||
      post.authorId === session.user.id ||
      (post.visibility === 'FRIENDS' && await checkFriendship(session.user.id, post.authorId))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ post })

  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

// Simple content editing - PUT method
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const { content } = await request.json()

    // Simple validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content too long (max 5000 characters)' }, { status: 400 })
    }

    // Check if user owns the post
    const existingPost = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true }
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 })
    }

    if (existingPost.status === 'DELETED') {
      return NextResponse.json({ error: 'Cannot edit deleted post' }, { status: 400 })
    }

    // Update only the content
    const updatedPost = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        content: true,
        updatedAt: true
      }
    })

    revalidatePath('/students-interlinked')

    return NextResponse.json({ 
      success: true,
      message: 'Post updated successfully',
      post: updatedPost 
    })

  } catch (error) {
    console.error('Error updating post content:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// Update post
export async function PATCH(
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
    const validatedData = updatePostSchema.parse(body)

    // Check if user owns the post
    const existingPost = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true }
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update post
    const updatedPost = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    revalidatePath('/students-interlinked')

    return NextResponse.json({ post: updatedPost })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// Delete post
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

    // Check if user owns the post
    const existingPost = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true }
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Soft delete the post (preserve for analytics)
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'DELETED',
        content: '[Post deleted by user]',
        imageUrls: [],
        videoUrls: [],
        documentUrls: [],
      }
    })

    revalidatePath('/students-interlinked')

    return NextResponse.json({ message: 'Post deleted successfully' })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

// Helper function to check friendship
async function checkFriendship(userId1: string, userId2: string): Promise<boolean> {
  const connection = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: userId1, followingId: userId2, status: 'ACCEPTED' },
        { followerId: userId2, followingId: userId1, status: 'ACCEPTED' }
      ]
    }
  })
  return !!connection
}
