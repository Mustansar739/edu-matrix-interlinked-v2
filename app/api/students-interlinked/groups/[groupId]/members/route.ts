/**
 * @fileoverview Group Members API Endpoint
 * @module GroupMembersAPI
 * @category API
 * 
 * @description
 * Handles group member operations for Students Interlinked
 * - GET: Retrieve group members with user details and pagination
 * - Proper authentication and authorization checks
 * - Cross-schema user data fetching from auth system
 * - Production-ready error handling and validation
 * 
 * @requires NextAuth.js session
 * @requires Prisma ORM for database operations
 * @requires Group membership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Get group members with complete user information
 * @route GET /api/students-interlinked/groups/[groupId]/members
 * @param {NextRequest} request - The request object with query parameters
 * @param {Object} params - Route parameters containing groupId
 * @returns {NextResponse} JSON response with members array and pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  let session: any = null
  let resolvedParams: { groupId: string } | null = null
  
  try {
    // Step 1: Authenticate user session
    session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Extract and validate parameters
    resolvedParams = await params
    const { groupId } = resolvedParams
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20'))) // Limit max 50 for performance
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Step 3: Verify group exists and user has access
    const [group, userMembership] = await Promise.all([
      prisma.socialGroup.findUnique({
        where: { id: groupId, isActive: true }
      }),
      prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: session.user.id
          }
        }
      })
    ])

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Step 4: Check access permissions
    const isPublic = group.privacy === 'PUBLIC'
    const isMember = userMembership?.isActive === true

    if (!isPublic && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Step 5: Build member query with filters
    let where: any = {
      groupId,
      isActive: true
    }

    if (role && ['ADMIN', 'MODERATOR', 'MEMBER'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase()
    }

    // Step 6: Get members with user data from auth schema
    const members = await prisma.groupMember.findMany({
      where,
      orderBy: [
        { role: 'asc' }, // ADMIN first, then MODERATOR, then MEMBER
        { joinedAt: 'desc' } // Most recent first within same role
      ],
      skip: offset,
      take: limit
    })

    // Step 7: Fetch user details from auth schema for each member
    const userIds = members.map(member => member.userId)
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true,
        avatar: true,
        major: true,
        academicYear: true,
        institutionId: true
      }
    })

    // Step 8: Create user lookup map for efficient matching
    const userMap = new Map(users.map(user => [user.id, user]))

    // Step 9: Transform and combine member and user data
    const transformedMembers = members
      .map(member => {
        const user = userMap.get(member.userId)
        
        // Skip members without user data (deleted users, etc.)
        if (!user) {
          console.warn(`User not found for member ${member.id} with userId ${member.userId}`)
          return null
        }

        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          isActive: member.isActive,
          notifications: member.notifications,
          postPermissions: member.postPermissions,
          invitedBy: member.invitedBy,
          isMuted: member.isMuted || false,
          isBanned: member.isBanned || false,
          bannedUntil: member.bannedUntil,
          user: {
            id: user.id,
            name: user.name || 'Unknown User',
            email: user.email || '',
            image: user.profilePictureUrl || user.avatar || null,
            profilePicture: user.profilePictureUrl || user.avatar || null,
            academicInfo: {
              university: user.institutionId || null,
              major: user.major || null,
              year: user.academicYear || null
            }
          }
        }
      })
      .filter(Boolean) // Remove null entries (users not found)

    // Step 10: Apply search filter if provided
    let filteredMembers = transformedMembers
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim()
      filteredMembers = transformedMembers.filter(member => 
        member?.user?.name?.toLowerCase().includes(searchTerm) ||
        member?.user?.email?.toLowerCase().includes(searchTerm)
      )
    }

    // Step 11: Get total count for pagination
    const total = await prisma.groupMember.count({ where })

    // Step 12: Return structured response
    return NextResponse.json({
      members: filteredMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      meta: {
        groupId,
        isPublic,
        isMember,
        userRole: userMembership?.role || null,
        searchApplied: !!search,
        roleFilter: role || null
      }
    })

  } catch (error) {
    console.error('Error fetching group members:', error)
    
    // Production-ready error logging with proper type checking
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring service (e.g., Sentry, LogRocket)
      console.error('Group members API error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: session?.user?.id,
        groupId: resolvedParams?.groupId
      })
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch group members',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
