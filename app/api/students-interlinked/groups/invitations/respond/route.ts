import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const responseSchema = z.object({
  action: z.enum(['accept', 'decline']),
  invitationId: z.string().uuid()
})

/**
 * Respond to group invitation (Facebook-like flow)
 * @route POST /api/students-interlinked/groups/invitations/respond
 * @param {NextRequest} request - Body: { action: 'accept' | 'decline', invitationId }
 * @returns {NextResponse} JSON response with result
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = responseSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid response data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { action, invitationId } = validation.data

    console.log('📨 Processing invitation response:', {
      invitationId,
      action,
      userId: session.user.id
    })

    // Find the invitation
    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            privacy: true,
            isActive: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify the invitation is for the current user
    if (invitation.inviteeId !== session.user.id) {
      return NextResponse.json({ error: 'This invitation is not for you' }, { status: 403 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Invitation has already been ${invitation.status.toLowerCase()}` 
      }, { status: 400 })
    }

    // Check if invitation has expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { 
          status: 'EXPIRED',
          respondedAt: new Date()
        }
      })
      
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Check if group is still active
    if (!invitation.group.isActive) {
      return NextResponse.json({ error: 'Group is no longer active' }, { status: 400 })
    }

    if (action === 'accept') {
      // Check if user is already a member
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: session.user.id
          }
        }
      })

      if (existingMembership?.isActive) {
        // Update invitation status
        await prisma.groupInvitation.update({
          where: { id: invitationId },
          data: { 
            status: 'ACCEPTED',
            respondedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: 'You are already a member of this group',
          groupName: invitation.group.name,
          action: 'already_member'
        })
      }

      // Use transaction to join group and update invitation
      await prisma.$transaction(async (tx) => {
        // Create or reactivate membership
        await tx.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId: invitation.groupId,
              userId: session.user.id
            }
          },
          create: {
            groupId: invitation.groupId,
            userId: session.user.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            isActive: true,
            notifications: true,
            postPermissions: true
          },
          update: {
            isActive: true,
            joinedAt: new Date(),
            notifications: true,
            postPermissions: true
          }
        })

        // Update group member count
        await tx.socialGroup.update({
          where: { id: invitation.groupId },
          data: {
            memberCount: { increment: 1 },
            activeMembers: { increment: 1 }
          }
        })

        // Mark invitation as accepted
        await tx.groupInvitation.update({
          where: { id: invitationId },
          data: { 
            status: 'ACCEPTED',
            respondedAt: new Date()
          }
        })
      })

      console.log('✅ User joined group via invitation:', {
        userId: session.user.id,
        groupId: invitation.groupId,
        invitationId
      })

      return NextResponse.json({
        success: true,
        message: `Welcome to ${invitation.group.name}!`,
        groupName: invitation.group.name,
        groupId: invitation.groupId,
        action: 'joined'
      })

    } else if (action === 'decline') {
      // Mark invitation as declined
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { 
          status: 'DECLINED',
          respondedAt: new Date()
        }
      })

      console.log('📝 User declined group invitation:', {
        userId: session.user.id,
        groupId: invitation.groupId,
        invitationId
      })

      return NextResponse.json({
        success: true,
        message: `You declined the invitation to ${invitation.group.name}`,
        groupName: invitation.group.name,
        action: 'declined'
      })
    }

  } catch (error) {
    console.error('❌ Error processing invitation response:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process invitation response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
