import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const { reactionType } = await request.json()

    if (!postId || !reactionType) {
      return NextResponse.json(
        { error: 'Post ID and reaction type are required' },
        { status: 400 }
      )
    }

    const validReactionTypes = ['like', 'love', 'laugh', 'wow', 'sad', 'helpful']
    if (!validReactionTypes.includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Check if post exists
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      include: {
        likes: {
          where: { userId }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user already has a reaction on this post
    const existingReaction = await prisma.socialPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    })

    let reaction

    if (existingReaction) {
      // Update existing reaction
      reaction = await prisma.socialPostLike.update({
        where: {
          postId_userId: {
            postId,
            userId
          }
        },
        data: {
          reaction: reactionType
        }
      })
    } else {
      // Create new reaction
      reaction = await prisma.socialPostLike.create({
        data: {
          postId,
          userId,
          reaction: reactionType
        }
      })

      // Update post like count
      await prisma.socialPost.update({
        where: { id: postId },
        data: {
          likeCount: {
            increment: 1
          }
        }
      })
    }

    // Get user info for real-time event
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Trigger real-time event via StudentsInterlinkedService
    await StudentsInterlinkedService.onPostLiked(
      postId,
      userId,
      post.authorId,
      reactionType
    )

    return NextResponse.json({
      success: true,
      reaction: {
        id: reaction.id,
        postId,
        userId,
        reactionType,
        user: {
          id: user.id,
          name: user.name,
          image: user.avatar
        },
        createdAt: reaction.createdAt
      }
    })

  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const userId = session.user.id

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Check if reaction exists
    const existingReaction = await prisma.socialPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    })

    if (!existingReaction) {
      return NextResponse.json(
        { error: 'Reaction not found' },
        { status: 404 }
      )
    }

    // Remove reaction
    await prisma.socialPostLike.delete({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    })

    // Update post like count
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        likeCount: {
          decrement: 1
        }
      }
    })

    // Get user info for real-time event
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    })

    // Get post info for real-time event
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: {
        authorId: true
      }
    })

    if (user && post) {
      // Trigger real-time event via StudentsInterlinkedService for unlike
      await StudentsInterlinkedService.onPostUnliked(
        postId,
        userId,
        post.authorId,
        existingReaction.reaction
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction removed successfully'
    })

  } catch (error) {
    console.error('Error removing reaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const { searchParams } = new URL(request.url)
    const reactionType = searchParams.get('type')

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get all reactions for the post
    const reactions = await prisma.socialPostLike.findMany({
      where: {
        postId,
        ...(reactionType && { reaction: reactionType })
      },
      include: {
        post: {
          select: {
            id: true,
            authorId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get user info for each reaction
    const userIds = reactions.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // Group reactions by type
    const reactionGroups = reactions.reduce((groups, reaction) => {
      const type = reaction.reaction
      if (!groups[type]) {
        groups[type] = {
          type,
          emoji: getEmojiForReaction(type),
          count: 0,
          users: []
        }
      }
      
      const user = userMap.get(reaction.userId)
      if (user) {
        groups[type].count++
        groups[type].users.push({
          id: user.id,
          name: user.name,
          image: user.avatar
        })
      }
      
      return groups
    }, {} as { [key: string]: any })

    const reactionCounts = Object.values(reactionGroups)
    const totalReactions = reactions.length

    return NextResponse.json({
      success: true,
      reactions: reactionCounts,
      totalReactions,
      userReactions: reactions.map(r => ({
        id: r.id,
        userId: r.userId,
        reactionType: r.reaction,
        createdAt: r.createdAt,
        user: userMap.get(r.userId)
      }))
    })

  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getEmojiForReaction(reactionType: string): string {
  const emojiMap: { [key: string]: string } = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    helpful: '⭐'
  }
  return emojiMap[reactionType] || '👍'
}
