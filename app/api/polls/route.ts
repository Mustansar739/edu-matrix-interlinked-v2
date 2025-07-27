import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Create poll schema
const createPollSchema = z.object({
  postId: z.string(),
  question: z.string().min(1).max(500),
  options: z.array(z.object({
    text: z.string().min(1).max(200),
    imageUrl: z.string().url().optional(),
  })).min(2).max(10), // 2-10 options
  allowMultiple: z.boolean().default(false),
  expiresAt: z.string().optional(), // ISO date string
  isAnonymous: z.boolean().default(false),
  isEducational: z.boolean().default(false),
  correctAnswer: z.array(z.string()).optional(), // Option IDs that are correct
  explanation: z.string().optional(),
})

// Create poll for a post
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPollSchema.parse(body)

    // Verify user owns the post
    const post = await prisma.socialPost.findUnique({
      where: { id: validatedData.postId },
      select: { authorId: true }
    })

    if (!post || post.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 })
    }

    // Check if poll already exists for this post
    const existingPoll = await prisma.socialPostPoll.findUnique({
      where: { postId: validatedData.postId }
    })

    if (existingPoll) {
      return NextResponse.json({ error: 'Poll already exists for this post' }, { status: 400 })
    }

    // Create poll with options
    const poll = await prisma.socialPostPoll.create({
      data: {
        postId: validatedData.postId,
        question: validatedData.question,
        allowMultiple: validatedData.allowMultiple,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        isAnonymous: validatedData.isAnonymous,
        isEducational: validatedData.isEducational,
        correctAnswer: validatedData.correctAnswer || [],
        explanation: validatedData.explanation,
        options: {
          create: validatedData.options.map((option, index) => ({
            text: option.text,
            imageUrl: option.imageUrl,
            orderIndex: index,
          }))
        }
      },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error creating poll:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get poll by post ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const poll = await prisma.socialPostPoll.findUnique({
      where: { postId },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' }
        },
        votes: {
          select: {
            userId: true,
            optionId: true,
          }
        }
      }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
