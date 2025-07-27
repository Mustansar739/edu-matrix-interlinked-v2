import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { GroupCategory, GroupPrivacy, GroupType, GroupVisibility } from '@prisma/client'

// SocialGroup creation schema
const createSocialGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  about: z.string().max(2000).optional(),
  coverPhotoUrl: z.string().url().optional().or(z.literal('')),
  profilePhotoUrl: z.string().url().optional().or(z.literal('')),
  groupType: z.enum(['PUBLIC', 'PRIVATE', 'SECRET']).default('PUBLIC'),
  privacy: z.enum(['PUBLIC', 'PRIVATE', 'SECRET']).default('PUBLIC'),
  visibility: z.enum(['VISIBLE', 'HIDDEN']).default('VISIBLE'),
  category: z.enum([
    'EDUCATION', 'STUDY_GROUPS', 'ACADEMIC_SUBJECTS', 'INSTITUTIONS',
    'CAREER_DEVELOPMENT', 'HOBBIES', 'SPORTS', 'TECHNOLOGY',
    'ARTS_CULTURE', 'SOCIAL_CAUSES', 'LOCAL_COMMUNITY',
    'PROFESSIONAL', 'ENTERTAINMENT', 'HEALTH_WELLNESS', 'OTHER'
  ]).default('EDUCATION'),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  guidelines: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  requirePostApproval: z.boolean().default(false),
  allowMemberPosts: z.boolean().default(true),
  allowMemberInvites: z.boolean().default(true)
});

// Get social groups with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') as GroupCategory | null
    const privacy = searchParams.get('privacy') as GroupPrivacy | null
    const search = searchParams.get('search')
    const userGroups = searchParams.get('userGroups') === 'true'
    const featured = searchParams.get('featured') === 'true'

    const offset = (page - 1) * limit

    // Build where clause
    let where: any = {
      isActive: true
    }

    // If getting user's groups, include groups they're a member of
    if (userGroups) {
      where.OR = [
        { createdById: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      ]
    } else {
      // For public discovery, only show public and visible groups
      where.privacy = 'PUBLIC'
      where.visibility = 'VISIBLE'
    }

    // Add filters
    if (category) where.category = category
    if (privacy) where.privacy = privacy
    if (featured) where.isFeatured = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }

    // Get groups with member count and user's membership status
    const groups = await prisma.socialGroup.findMany({
      where,
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
      },
      orderBy: [
        { isFeatured: 'desc' },
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const total = await prisma.socialGroup.count({ where })

    // Transform response to match frontend interface
    const transformedGroups = groups.map(group => ({
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
      isJoined: group.members.length > 0 && group.members[0].isActive,
      userRole: group.members.length > 0 ? group.members[0].role : null,
      joinedAt: group.members.length > 0 ? group.members[0].joinedAt : null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }))

    return NextResponse.json({
      groups: transformedGroups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching social groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social groups' },
      { status: 500 }
    )
  }
}

// Create a new social group
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSocialGroupSchema.parse(body)

    // Create the social group with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the group
        const group = await tx.socialGroup.create({
          data: {
            name: data.name,
            description: data.description,
            about: data.about,
            coverPhotoUrl: data.coverPhotoUrl,
            profilePhotoUrl: data.profilePhotoUrl,
            groupType: data.groupType as GroupType,
            privacy: data.privacy as GroupPrivacy,
            visibility: data.visibility as GroupVisibility,
            category: data.category as GroupCategory,
            subcategory: data.subcategory,
            tags: data.tags,
            rules: data.rules,
            guidelines: data.guidelines,
            location: data.location,
            website: data.website,
            email: data.email,
            requirePostApproval: data.requirePostApproval,
            allowMemberPosts: data.allowMemberPosts,
            allowMemberInvites: data.allowMemberInvites,
            createdById: session.user.id,
            memberCount: 1, // Creator is first member
            postCount: 0,
            activeMembers: 1,
            isActive: true, // ✅ Ensure group is active when created
            isVerified: false,
            isFeatured: false
          }
        })      // Add creator as first member with ADMIN role
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: session.user.id,
          role: 'ADMIN',
          joinedAt: new Date(),
          isActive: true,
          notifications: true,
          postPermissions: true
        }
      })

      return group
    })

    // Fetch the created group with member info
    const group = await prisma.socialGroup.findUnique({
      where: { id: result.id },
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

    if (!group) {
      return NextResponse.json({ error: 'Group creation failed' }, { status: 500 })
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
      isJoined: true,
      userRole: 'ADMIN',
      joinedAt: group.members[0].joinedAt,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }

    return NextResponse.json(transformedGroup, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating social group:', error)
    return NextResponse.json(
      { error: 'Failed to create social group' },
      { status: 500 }
    )
  }
}
