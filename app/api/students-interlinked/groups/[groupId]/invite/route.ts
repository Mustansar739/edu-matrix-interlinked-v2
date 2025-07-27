import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas - Only user IDs since schema doesn't support email invites
const inviteDataSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user must be selected'),
  message: z.string().optional()
})

/**
 * Send group invitations to users (Facebook-like flow)
 * @route POST /api/students-interlinked/groups/[groupId]/invite
 * @param {NextRequest} request - Body: { userIds, message }
 * @param {Object} params - Route parameters containing groupId
 * @returns {NextResponse} JSON response with invitation results
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse parameters and request body
    const { groupId } = await params
    const body = await request.json()

    // Validate request data
    const validation = inviteDataSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid invitation data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { userIds, message } = validation.data

    console.log('📤 Processing group invitations:', {
      groupId,
      inviterId: session.user.id,
      userInvites: userIds.length,
      hasMessage: !!message
    })

    // Verify group exists and user has permission to invite
    const [group, userMembership] = await Promise.all([
      prisma.socialGroup.findUnique({
        where: { id: groupId, isActive: true },
        select: {
          id: true,
          name: true,
          privacy: true,
          allowMemberInvites: true,
          isActive: true
        }
      }),
      prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: session.user.id
          }
        },
        select: {
          role: true,
          isActive: true
        }
      })
    ])

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (!userMembership || !userMembership.isActive) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
    }

    // Check invitation permissions
    const canInvite = userMembership.role === 'ADMIN' || 
                     userMembership.role === 'MODERATOR' || 
                     (userMembership.role === 'MEMBER' && group.allowMemberInvites)

    if (!canInvite) {
      return NextResponse.json({
        error: 'You do not have permission to invite people to this group'
      }, { status: 403 })
    }

    // Check which users exist and aren't already members
    const [existingUsers, existingMembers, existingInvitations] = await Promise.all([
      prisma.user.findMany({
        where: { 
          id: { in: userIds }
        },
        select: { id: true, name: true, email: true }
      }),
      prisma.groupMember.findMany({
        where: {
          groupId,
          userId: { in: userIds },
          isActive: true
        },
        select: { userId: true }
      }),
      prisma.groupInvitation.findMany({
        where: {
          groupId,
          inviteeId: { in: userIds },
          status: 'PENDING'
        },
        select: { inviteeId: true }
      })
    ])

    const existingMemberIds = new Set(existingMembers.map(m => m.userId))
    const existingInviteIds = new Set(existingInvitations.map(i => i.inviteeId))
    
    // Filter users who can receive invitations
    const validUsers = existingUsers.filter(user => 
      !existingMemberIds.has(user.id) && !existingInviteIds.has(user.id)
    )

    // Process user invitations
    let userInviteResults = []
    let successfulInvites = 0

    for (const user of existingUsers) {
      try {
        if (existingMemberIds.has(user.id)) {
          userInviteResults.push({
            userId: user.id,
            name: user.name,
            status: 'already_member',
            message: 'User is already a member'
          })
          continue
        }

        if (existingInviteIds.has(user.id)) {
          userInviteResults.push({
            userId: user.id,
            name: user.name,
            status: 'already_invited',
            message: 'User already has a pending invitation'
          })
          continue
        }

        // Create new invitation
        await prisma.groupInvitation.create({
          data: {
            groupId,
            inviteeId: user.id,
            inviterId: session.user.id,
            message: message || null,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        })

        successfulInvites++
        userInviteResults.push({
          userId: user.id,
          name: user.name,
          status: 'invited',
          message: 'Invitation sent successfully'
        })

      } catch (error) {
        console.error(`Failed to invite user ${user.id}:`, error)
        userInviteResults.push({
          userId: user.id,
          name: user.name,
          status: 'failed',
          message: 'Failed to send invitation'
        })
      }
    }

    // Handle non-existent users
    const existingUserIds = new Set(existingUsers.map(u => u.id))
    for (const userId of userIds) {
      if (!existingUserIds.has(userId)) {
        userInviteResults.push({
          userId,
          name: 'Unknown User',
          status: 'user_not_found',
          message: 'User not found or inactive'
        })
      }
    }

    console.log('✅ Group invitations processed:', {
      groupId,
      totalInvites: successfulInvites,
      totalAttempts: userIds.length
    })

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successfulInvites} invitation(s)`,
      totalInvites: successfulInvites,
      results: userInviteResults,
      groupName: group.name
    })

  } catch (error) {
    console.error('❌ Error sending group invitations:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
