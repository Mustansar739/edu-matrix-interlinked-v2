import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Join a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    // Check if group exists and is active
    const group = await prisma.socialGroup.findUnique({
      where: { 
        id: groupId,
        isActive: true
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json({ error: 'Already a member of this group' }, { status: 400 })
      } else {
        // Reactivate membership
        await prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId: session.user.id
            }
          },
          data: {
            isActive: true,
            joinedAt: new Date()
          }
        })
      }
    } else {
      // For private groups, create a join request instead
      if (group.privacy === 'PRIVATE') {
        // Check if there's already a pending request
        const existingRequest = await prisma.groupJoinRequest.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: session.user.id
            }
          }
        })

        if (existingRequest) {
          if (existingRequest.status === 'PENDING') {
            return NextResponse.json({ error: 'Join request already pending' }, { status: 400 })
          } else if (existingRequest.status === 'APPROVED') {
            return NextResponse.json({ error: 'Join request already approved' }, { status: 400 })
          }
        }

        // Create join request
        await prisma.groupJoinRequest.create({
          data: {
            groupId,
            userId: session.user.id,
            status: 'PENDING'
          }
        })

        return NextResponse.json({ 
          message: 'Join request sent successfully',
          status: 'request_sent'
        })
      }

      // For secret groups, user needs an invitation
      if (group.privacy === 'SECRET') {
        return NextResponse.json({ error: 'This group requires an invitation' }, { status: 403 })
      }

      // For public groups, add user directly
      await prisma.groupMember.create({
        data: {
          groupId,
          userId: session.user.id,
          role: 'MEMBER',
          joinedAt: new Date(),
          isActive: true,
          notifications: true,
          postPermissions: true
        }
      })
    }

    // Update group member count
    await prisma.socialGroup.update({
      where: { id: groupId },
      data: {
        memberCount: {
          increment: 1
        },
        activeMembers: {
          increment: 1
        }
      }
    })

    return NextResponse.json({ 
      message: 'Successfully joined the group',
      status: 'joined'
    })

  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    )
  }
}

// Leave a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership || !membership.isActive) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 })
    }

    // Check if user is the only admin
    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: 'ADMIN',
          isActive: true
        }
      })

      if (adminCount === 1) {
        const memberCount = await prisma.groupMember.count({
          where: {
            groupId,
            isActive: true
          }
        })

        if (memberCount > 1) {
          return NextResponse.json({ 
            error: 'Cannot leave group. You are the only admin. Please assign another admin first.' 
          }, { status: 400 })
        }
      }
    }

    // Remove user from group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      },
      data: {
        isActive: false
      }
    })

    // Update group member count
    await prisma.socialGroup.update({
      where: { id: groupId },
      data: {
        memberCount: {
          decrement: 1
        },
        activeMembers: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({ message: 'Successfully left the group' })

  } catch (error) {
    console.error('Error leaving group:', error)
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    )
  }
}
