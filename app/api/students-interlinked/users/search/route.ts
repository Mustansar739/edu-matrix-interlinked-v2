import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  exclude: z.string().optional(), // Group ID to exclude members from
  limit: z.coerce.number().min(1).max(50).default(20)
})

/**
 * Search users for group invitations
 * @route GET /api/students-interlinked/users/search
 * @param {NextRequest} request - Query params: q (search term), exclude (groupId), limit
 * @returns {NextResponse} JSON response with matching users
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      q: searchParams.get('q'),
      exclude: searchParams.get('exclude'),
      limit: searchParams.get('limit')
    }

    const validation = searchQuerySchema.safeParse(queryData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { q: searchQuery, exclude: excludeGroupId, limit } = validation.data

    console.log('🔍 Searching users:', {
      query: searchQuery,
      excludeGroupId,
      limit,
      requesterId: session.user.id
    })

    // Get existing group members to exclude (if groupId provided)
    let existingMemberIds: string[] = []
    if (excludeGroupId) {
      const existingMembers = await prisma.groupMember.findMany({
        where: {
          groupId: excludeGroupId,
          isActive: true
        },
        select: { userId: true }
      })
      existingMemberIds = existingMembers.map(member => member.userId)
    }

    // Search users across multiple fields
    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclude the requesting user
          { id: { not: session.user.id } },
          // Exclude existing group members
          ...(existingMemberIds.length > 0 ? [{ id: { notIn: existingMemberIds } }] : []),
          // Search across multiple fields
          {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { username: { contains: searchQuery, mode: 'insensitive' } },
              { major: { contains: searchQuery, mode: 'insensitive' } },
              { bio: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        profilePictureUrl: true,
        avatar: true,
        major: true,
        academicYear: true,
        institutionId: true,
        bio: true,
        isVerified: true
      },
      take: limit,
      orderBy: [
        // Prioritize verified users
        { isVerified: 'desc' },
        // Then by name similarity (exact matches first)
        { name: 'asc' }
      ]
    })

    // Transform users for response
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      email: user.email || '',
      username: user.username,
      image: user.profilePictureUrl || user.avatar || null,
      profilePicture: user.profilePictureUrl || user.avatar || null,
      major: user.major,
      academicYear: user.academicYear,
      institution: user.institutionId,
      bio: user.bio,
      isActive: true, // Assume active since we can find them
      isVerified: user.isVerified,
      isAlreadyMember: false // We already filtered these out
    }))

    console.log('✅ User search completed:', {
      query: searchQuery,
      resultsCount: transformedUsers.length,
      excludedMembers: existingMemberIds.length
    })

    return NextResponse.json({
      users: transformedUsers,
      total: transformedUsers.length,
      query: searchQuery,
      hasMore: transformedUsers.length === limit
    })

  } catch (error) {
    console.error('❌ Error searching users:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
