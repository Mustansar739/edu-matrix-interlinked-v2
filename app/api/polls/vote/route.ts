import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const voteSchema = z.object({
  pollId: z.string(),
  optionIds: z.array(z.string()).min(1), // Support multiple votes for multiple choice polls
})

// Cast vote(s) in a poll
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pollId, optionIds } = voteSchema.parse(body)

    // Get poll with options
    const poll = await prisma.socialPostPoll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        votes: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if poll has expired
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })
    }

    // Validate option IDs
    const validOptionIds = poll.options.map(option => option.id)
    const invalidOptions = optionIds.filter(id => !validOptionIds.includes(id))
    if (invalidOptions.length > 0) {
      return NextResponse.json({ error: 'Invalid option IDs' }, { status: 400 })
    }

    // Check if multiple votes allowed
    if (!poll.allowMultiple && optionIds.length > 1) {
      return NextResponse.json({ error: 'Multiple votes not allowed for this poll' }, { status: 400 })
    }

    // Check if user has already voted
    if (poll.votes.length > 0) {
      return NextResponse.json({ error: 'You have already voted in this poll' }, { status: 400 })
    }

    // Create votes and update counters in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create vote records
      const votes = await Promise.all(
        optionIds.map(optionId =>
          tx.socialPollVote.create({
            data: {
              pollId,
              optionId,
              userId: session.user.id
            }
          })
        )
      )

      // Update option vote counts
      await Promise.all(
        optionIds.map(optionId =>
          tx.socialPollOption.update({
            where: { id: optionId },
            data: { voteCount: { increment: 1 } }
          })
        )
      )

      // Update total poll vote count
      await tx.socialPostPoll.update({
        where: { id: pollId },
        data: { totalVotes: { increment: optionIds.length } }
      })

      return votes
    })

    return NextResponse.json({ success: true, votes: result })
  } catch (error) {
    console.error('Error voting in poll:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove vote from poll
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pollId = searchParams.get('pollId')

    if (!pollId) {
      return NextResponse.json({ error: 'Poll ID required' }, { status: 400 })
    }

    // Get user's votes for this poll
    const userVotes = await prisma.socialPollVote.findMany({
      where: {
        pollId,
        userId: session.user.id
      }
    })

    if (userVotes.length === 0) {
      return NextResponse.json({ error: 'No votes found to remove' }, { status: 404 })
    }

    // Remove votes and update counters in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete vote records
      await tx.socialPollVote.deleteMany({
        where: {
          pollId,
          userId: session.user.id
        }
      })

      // Update option vote counts
      const optionIds = userVotes.map(vote => vote.optionId)
      await Promise.all(
        optionIds.map(optionId =>
          tx.socialPollOption.update({
            where: { id: optionId },
            data: { voteCount: { decrement: 1 } }
          })
        )
      )

      // Update total poll vote count
      await tx.socialPostPoll.update({
        where: { id: pollId },
        data: { totalVotes: { decrement: userVotes.length } }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
