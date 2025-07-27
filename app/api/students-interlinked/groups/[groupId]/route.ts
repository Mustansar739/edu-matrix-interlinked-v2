import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { GroupCategory, GroupPrivacy, GroupType, GroupVisibility } from '@prisma/client'

// Update group schema
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  about: z.string().max(2000).optional(),
  coverPhotoUrl: z.string().url().optional(),
  profilePhotoUrl: z.string().url().optional(),
  groupType: z.enum(['PUBLIC', 'PRIVATE', 'SECRET']).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE', 'SECRET']).optional(),
  visibility: z.enum(['VISIBLE', 'HIDDEN']).optional(),
  category: z.enum([
    'EDUCATION', 'STUDY_GROUPS', 'ACADEMIC_SUBJECTS', 'INSTITUTIONS',
    'CAREER_DEVELOPMENT', 'HOBBIES', 'SPORTS', 'TECHNOLOGY',
    'ARTS_CULTURE', 'SOCIAL_CAUSES', 'LOCAL_COMMUNITY',
    'PROFESSIONAL', 'ENTERTAINMENT', 'HEALTH_WELLNESS', 'OTHER'
  ]).optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  guidelines: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  requirePostApproval: z.boolean().optional(),
  allowMemberPosts: z.boolean().optional(),
  allowMemberInvites: z.boolean().optional()
})

// Get single group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    // Get group with detailed information
    const group = await prisma.socialGroup.findUnique({
      where: { 
        id: groupId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            members: true,
            posts: true
          }
        },
        members: {
          where: { userId: session.user.id },
          select: {
            role: true,
            isActive: true,
            joinedAt: true,
            notifications: true,
            postPermissions: true
          }
        },
        moderators: {
          select: {
            userId: true,
            assignedAt: true,
            permissions: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user can view this group
    const userMembership = group.members[0]
    const isPublic = group.privacy === 'PUBLIC'
    const isMember = userMembership && userMembership.isActive

    if (!isPublic && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Transform response
    const transformedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      about: group.about,
      coverPhotoUrl: group.coverPhotoUrl,
      profilePhotoUrl: group.profilePhotoUrl,
      groupType: group.groupType,
      privacy: group.privacy,
      visibility: group.visibility,
      category: group.category,
      subcategory: group.subcategory,
      tags: group.tags,
      rules: group.rules,
      guidelines: group.guidelines,
      location: group.location,
      website: group.website,
      email: group.email,
      memberCount: group.memberCount,
      postCount: group.postCount,
      activeMembers: group.activeMembers,
      allowMemberPosts: group.allowMemberPosts,
      requirePostApproval: group.requirePostApproval,
      allowMemberInvites: group.allowMemberInvites,
      isActive: group.isActive,
      isVerified: group.isVerified,
      isFeatured: group.isFeatured,
      _count: {
        members: group._count.members,
        posts: group._count.posts
      },
      isJoined: !!isMember,
      userRole: isMember ? userMembership.role : null,
      joinedAt: isMember ? userMembership.joinedAt : null,
      userPermissions: isMember ? {
        notifications: userMembership.notifications,
        postPermissions: userMembership.postPermissions
      } : null,
      moderators: group.moderators.map(mod => ({
        userId: mod.userId,
        assignedAt: mod.assignedAt,
        permissions: mod.permissions
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }

    return NextResponse.json(transformedGroup)

  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}

// Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const data = updateGroupSchema.parse(body)

    // Check if user has permission to update the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership || !membership.isActive || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update the group
    const updatedGroup = await prisma.socialGroup.update({
      where: { 
        id: groupId,
        isActive: true
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.about !== undefined && { about: data.about }),
        ...(data.coverPhotoUrl !== undefined && { coverPhotoUrl: data.coverPhotoUrl }),
        ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl }),
        ...(data.groupType && { groupType: data.groupType as GroupType }),
        ...(data.privacy && { privacy: data.privacy as GroupPrivacy }),
        ...(data.visibility && { visibility: data.visibility as GroupVisibility }),
        ...(data.category && { category: data.category as GroupCategory }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...(data.tags && { tags: data.tags }),
        ...(data.rules && { rules: data.rules }),
        ...(data.guidelines !== undefined && { guidelines: data.guidelines }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.requirePostApproval !== undefined && { requirePostApproval: data.requirePostApproval }),
        ...(data.allowMemberPosts !== undefined && { allowMemberPosts: data.allowMemberPosts }),
        ...(data.allowMemberInvites !== undefined && { allowMemberInvites: data.allowMemberInvites }),
      },
      include: {
        _count: {
          select: {
            members: true,
            posts: true
          }
        },
        members: {
          where: { userId: session.user.id },
          select: {
            role: true,
            isActive: true,
            joinedAt: true
          }
        }
      }
    })

    // Transform response
    const transformedGroup = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      about: updatedGroup.about,
      coverPhotoUrl: updatedGroup.coverPhotoUrl,
      profilePhotoUrl: updatedGroup.profilePhotoUrl,
      groupType: updatedGroup.groupType,
      privacy: updatedGroup.privacy,
      visibility: updatedGroup.visibility,
      category: updatedGroup.category,
      subcategory: updatedGroup.subcategory,
      tags: updatedGroup.tags,
      rules: updatedGroup.rules,
      guidelines: updatedGroup.guidelines,
      location: updatedGroup.location,
      website: updatedGroup.website,
      email: updatedGroup.email,
      memberCount: updatedGroup.memberCount,
      postCount: updatedGroup.postCount,
      activeMembers: updatedGroup.activeMembers,
      allowMemberPosts: updatedGroup.allowMemberPosts,
      requirePostApproval: updatedGroup.requirePostApproval,
      allowMemberInvites: updatedGroup.allowMemberInvites,
      isActive: updatedGroup.isActive,
      isVerified: updatedGroup.isVerified,
      isFeatured: updatedGroup.isFeatured,
      _count: {
        members: updatedGroup._count.members,
        posts: updatedGroup._count.posts
      },
      isJoined: true,
      userRole: updatedGroup.members[0].role,
      joinedAt: updatedGroup.members[0].joinedAt,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt
    }

    return NextResponse.json(transformedGroup)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}

// Delete group
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

    // Check if user is the group creator or admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership || !membership.isActive || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete the group
    await prisma.socialGroup.update({
      where: { id: groupId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Group deleted successfully' })

  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
