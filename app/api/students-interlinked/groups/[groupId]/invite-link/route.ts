import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Generate shareable invite link for group
 * @route POST /api/students-interlinked/groups/[groupId]/invite-link
 * @param {Object} params - Route parameters containing groupId
 * @returns {NextResponse} JSON response with invite link
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

    const { groupId } = await params

    // Verify user can generate invite links
    const [group, membership] = await Promise.all([
      prisma.socialGroup.findUnique({
        where: { id: groupId, isActive: true },
        select: {
          id: true,
          name: true,
          privacy: true,
          allowMemberInvites: true
        }
      }),
      prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: session.user.id
          }
        },
        select: { role: true, isActive: true }
      })
    ])

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (!membership?.isActive) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
    }

    // Check permissions
    const canCreateLink = membership.role === 'ADMIN' || 
                         membership.role === 'MODERATOR' || 
                         (membership.role === 'MEMBER' && group.allowMemberInvites)

    if (!canCreateLink) {
      return NextResponse.json({
        error: 'You do not have permission to create invite links'
      }, { status: 403 })
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/students-interlinked/groups/join/${inviteToken}`

    // Store the invite link (you might want to create a GroupInviteLink table)
    // For now, we'll return the link directly
    
    console.log('🔗 Generated invite link:', {
      groupId,
      userId: session.user.id,
      token: inviteToken.substring(0, 8) + '...'
    })

    return NextResponse.json({
      inviteLink,
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      groupName: group.name
    })

  } catch (error) {
    console.error('❌ Error generating invite link:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate invite link',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
