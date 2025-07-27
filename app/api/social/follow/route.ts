import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const followSchema = z.object({
  followingId: z.string().min(1, 'User ID is required')
})

// Follow a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { followingId } = followSchema.parse(body)
    
    const followerId = session.user.id

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, username: true, name: true }
    })

    if (!userToFollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cannot follow yourself
    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      )
    }

    // Create follow relationship
    await prisma.$transaction(async (tx) => {
      // Create follow record
      await tx.follow.create({
        data: {
          followerId,
          followingId,
          status: 'ACCEPTED' // Instant follow (no approval needed)
        }
      })

      // Update follower count for the user being followed
      await tx.user.update({
        where: { id: followingId },
        data: {
          followersCount: {
            increment: 1
          }
        }
      })

      // Update following count for the follower
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            increment: 1
          }
        }
      })
    })

    return NextResponse.json({
      message: 'Successfully followed user',
      isFollowing: true
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { followingId } = followSchema.parse(body)
    
    const followerId = session.user.id

    // Find existing follow relationship
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      )
    }

    // Remove follow relationship
    await prisma.$transaction(async (tx) => {
      // Delete follow record
      await tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      })

      // Update follower count for the user being unfollowed
      await tx.user.update({
        where: { id: followingId },
        data: {
          followersCount: {
            decrement: 1
          }
        }
      })

      // Update following count for the follower
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            decrement: 1
          }
        }
      })
    })

    return NextResponse.json({
      message: 'Successfully unfollowed user',
      isFollowing: false
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
