import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Get user's pending group invitations (Facebook-like notifications)
 * @route GET /api/students-interlinked/groups/invitations
 * @returns {NextResponse} JSON response with pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📋 Fetching pending invitations for user:', session.user.id)

    // Get user's pending invitations
    const invitations = await prisma.groupInvitation.findMany({
      where: {
        inviteeId: session.user.id,
        status: 'PENDING',
        // Only get non-expired invitations
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            profilePhotoUrl: true,
            coverPhotoUrl: true,
            privacy: true,
            category: true,
            memberCount: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get inviter details for each invitation
    const inviterIds = invitations.map(inv => inv.inviterId)
    const inviters = await prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: {
        id: true,
        name: true,
        profilePictureUrl: true,
        avatar: true
      }
    })

    const inviterMap = new Map(inviters.map(user => [user.id, user]))

    // Transform invitations for response
    const transformedInvitations = invitations
      .filter(invitation => invitation.group.isActive) // Only active groups
      .map(invitation => {
        const inviter = inviterMap.get(invitation.inviterId)
        
        return {
          id: invitation.id,
          message: invitation.message,
          createdAt: invitation.createdAt.toISOString(),
          expiresAt: invitation.expiresAt?.toISOString() || null,
          group: {
            id: invitation.group.id,
            name: invitation.group.name,
            description: invitation.group.description,
            profilePhoto: invitation.group.profilePhotoUrl,
            coverPhoto: invitation.group.coverPhotoUrl,
            privacy: invitation.group.privacy,
            category: invitation.group.category,
            memberCount: invitation.group.memberCount
          },
          inviter: {
            id: inviter?.id || invitation.inviterId,
            name: inviter?.name || 'Unknown User',
            profilePicture: inviter?.profilePictureUrl || inviter?.avatar || null
          }
        }
      })

    console.log('✅ Retrieved pending invitations:', {
      userId: session.user.id,
      count: transformedInvitations.length
    })

    return NextResponse.json({
      invitations: transformedInvitations,
      total: transformedInvitations.length
    })

  } catch (error) {
    console.error('❌ Error fetching group invitations:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
