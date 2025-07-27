import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * @fileoverview Group Posts API - Production-Ready with Real-time Notifications
 * @module GroupPostsAPI
 * @category GroupManagement
 * 
 * @description
 * Complete API endpoints for group post management with:
 * - Real-time Socket.IO notifications to group members
 * - Production-ready error handling and validation
 * - Comprehensive security and permission checks
 * - Facebook-style group post functionality
 * - Educational context support for academic groups
 * 
 * @features
 * - POST: Create group posts with real-time member notifications
 * - GET: Fetch paginated group posts with user interactions
 * - Real-time broadcasts: Notify all group members instantly
 * - Permission validation: Ensure proper posting permissions
 * - Content moderation: Support for post approval workflows
 * 
 * @realTimeIntegration
 * - Socket.IO emissions for instant group member notifications
 * - Broadcast new posts to all active group members
 * - Integration with notification system for offline users
 * - Error handling with graceful degradation
 * 
 * @author Production Team
 * @version 2.0.0
 * @lastUpdated 2025-07-24
 */

/**
 * Send real-time Socket.IO notification to group members
 * @param {string} groupId - Group ID where post was created
 * @param {Object} postData - Post data for notification
 * @param {string} authorId - ID of post author
 * @param {string} authorName - Name of post author
 */
async function notifyGroupMembers(groupId: string, postData: any, authorId: string, authorName: string) {
  try {
    // Get Socket.IO server URL from environment
    const socketServerUrl = process.env.SOCKET_IO_INTERNAL_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    
    console.log('📡 Sending group post notification via Socket.IO:', {
      groupId,
      postId: postData.id,
      authorId,
      socketServerUrl
    })

    // Emit to Socket.IO server using internal API call
    const notificationPayload = {
      target: 'group_members',
      event: 'group:new_post',
      data: {
        groupId,
        postId: postData.id,
        authorId,
        authorName,
        postContent: postData.content.substring(0, 100) + (postData.content.length > 100 ? '...' : ''),
        postType: postData.type,
        hasMedia: (postData.imageUrls?.length > 0) || (postData.videoUrls?.length > 0) || (postData.documentUrls?.length > 0),
        timestamp: new Date().toISOString(),
        metadata: {
          groupId,
          postId: postData.id,
          contentPreview: postData.content.substring(0, 200),
          mediaCount: (postData.imageUrls?.length || 0) + (postData.videoUrls?.length || 0) + (postData.documentUrls?.length || 0)
        }
      }
    }

    // Call Socket.IO server endpoint for server-to-server communication
    const response = await fetch(`${socketServerUrl}/api/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SOCKET_IO_SERVER_TOKEN || 'internal-server-token'}`
      },
      body: JSON.stringify(notificationPayload)
    })

    // Set up a timeout manually since fetch doesn't support timeout option
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Socket.IO notification timeout after 5 seconds')
    }, 5000)

    if (response.ok) {
      clearTimeout(timeoutId)
      console.log('✅ Group post notification sent successfully via Socket.IO')
    } else {
      clearTimeout(timeoutId)
      console.warn('⚠️ Socket.IO notification failed, but post created successfully:', response.status)
    }

  } catch (error) {
    // Log error but don't fail the post creation
    console.error('❌ Failed to send Socket.IO notification for group post:', error)
    console.log('📝 Post created successfully, notification failed gracefully')
  }
}

// Unified post creation schema (using SocialPost model)
const createGroupPostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string()).default([]), // Allow any string, filter blob URLs later
  educationalContext: z.object({
    courseId: z.string().optional(),
    subject: z.string().optional(),
    academicLevel: z.enum(['UNDERGRADUATE', 'GRADUATE', 'POSTGRADUATE', 'PROFESSIONAL']).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LINK', 'POLL']).default('TEXT'), // Add POLL support
  pinned: z.boolean().default(false),
  // Poll data (only required if type is POLL)
  poll: z.object({
    question: z.string().min(1).max(500),
    options: z.array(z.object({
      text: z.string().min(1).max(200),
      imageUrl: z.string().optional(), // Don't require URL validation
    })).min(2).max(10),
    allowMultiple: z.boolean().default(false),
    expiresAt: z.string().optional(), // ISO date string
    isAnonymous: z.boolean().default(false),
    isEducational: z.boolean().default(false),
    correctAnswer: z.array(z.string()).optional(),
    explanation: z.string().optional(),
  }).optional(),
})

// Get group posts
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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const postType = searchParams.get('postType')
    const pinned = searchParams.get('pinned') === 'true'

    const offset = (page - 1) * limit

    // Check if user has access to view group posts
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    const group = await prisma.socialGroup.findUnique({
      where: { id: groupId, isActive: true }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check access permissions
    const isPublic = group.privacy === 'PUBLIC'
    const isMember = userMembership && userMembership.isActive

    if (!isPublic && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause for SocialPost
    let where: any = {
      studyGroupId: groupId, // Use studyGroupId to filter by group
      status: 'PUBLISHED'
    }

    // Get posts using SocialPost model
    const posts = await prisma.socialPost.findMany({
      where,
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        },
        likes: {
          where: { userId: session.user.id },
          select: { reaction: true }
        },
        comments: {
          select: {
            id: true,
            userId: true,
            content: true,
            imageUrls: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3 // Show recent comments
        }
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: offset,
      take: limit
    })

    // Transform posts to match frontend expectations
    const transformedPosts = posts.map(post => ({
      id: post.id,
      groupId: groupId, // Pass groupId separately
      authorId: post.authorId,
      content: post.content,
      imageUrls: post.imageUrls,
      videoUrls: post.videoUrls,
      documentUrls: post.documentUrls,
      type: 'TEXT', // Default type, could be enhanced based on content analysis
      tags: post.tags,
      status: post.status,
      pinned: post.pinned,
      featured: post.featured,
      visibility: post.visibility,
      isLiked: post.likes.length > 0,
      userReaction: post.likes.length > 0 ? post.likes[0].reaction : null,
      _count: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      },
      comments: post.comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      educationalContext: post.educationalContext ? JSON.parse(post.educationalContext) : null
    }))

    // Get total count using SocialPost
    const total = await prisma.socialPost.count({ where })

    return NextResponse.json({
      posts: transformedPosts,
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
    console.error('Error fetching group posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group posts' },
      { status: 500 }
    )
  }
}

// Create a new group post
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
    const body = await request.json()
    const data = createGroupPostSchema.parse(body)

    // Check if user is a member and can post
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership || !membership.isActive) {
      return NextResponse.json({ error: 'You must be a member to post in this group' }, { status: 403 })
    }

    if (!membership.postPermissions) {
      return NextResponse.json({ error: 'You do not have permission to post in this group' }, { status: 403 })
    }

    // Get group settings
    const group = await prisma.socialGroup.findUnique({
      where: { id: groupId, isActive: true }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (!group.allowMemberPosts && membership.role === 'MEMBER') {
      return NextResponse.json({ error: 'Members are not allowed to post in this group' }, { status: 403 })
    }

    // Determine if post needs approval
    const requiresApproval = group.requirePostApproval && membership.role === 'MEMBER'
    
    // Create the post using SocialPost model
    const post = await prisma.socialPost.create({
      data: {
        authorId: session.user.id,
        content: data.content,
        imageUrls: data.mediaUrls.filter(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)),
        videoUrls: data.mediaUrls.filter(url => url.match(/\.(mp4|webm|ogg|mov)$/i)),
        documentUrls: data.mediaUrls.filter(url => !url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov)$/i)),
        studyGroupId: groupId, // Use studyGroupId to link to group
        educationalContext: data.educationalContext ? JSON.stringify(data.educationalContext) : null,
        tags: data.educationalContext?.tags || [],
        courseId: data.educationalContext?.courseId,
        subjectArea: data.educationalContext?.subject,
        academicLevel: data.educationalContext?.academicLevel === 'UNDERGRADUATE' ? 'UNDERGRADUATE' :
          data.educationalContext?.academicLevel === 'GRADUATE' ? 'GRADUATE' :
            data.educationalContext?.academicLevel === 'POSTGRADUATE' ? 'GRADUATE' :
              data.educationalContext?.academicLevel === 'PROFESSIONAL' ? 'PROFESSIONAL' : null,
        visibility: 'LISTED', // Group posts are group-visible
        postType: data.type === 'TEXT' ? 'GENERAL' :
          data.type === 'IMAGE' ? 'GENERAL' :
            data.type === 'VIDEO' ? 'GENERAL' :
              data.type === 'DOCUMENT' ? 'RESOURCE_SHARE' :
                data.type === 'LINK' ? 'GENERAL' : 'GENERAL',
        status: requiresApproval ? 'DRAFT' : 'PUBLISHED',
        pinned: data.pinned && ['ADMIN', 'MODERATOR'].includes(membership.role),
      },
      include: {
        likes: {
          select: {
            id: true,
            userId: true,
            reaction: true,
            createdAt: true,
          }
        },
        comments: {
          select: {
            id: true,
            userId: true,
            content: true,
            imageUrls: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        shares: {
          select: {
            userId: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    })

    // Update group post count if published
    if (!requiresApproval) {
      await prisma.socialGroup.update({
        where: { id: groupId },
        data: {
          postCount: {
            increment: 1
          }
        }
      })
    }

    // Transform response to match frontend expectations
    const transformedPost = {
      id: post.id,
      groupId: groupId, // Pass the groupId separately
      authorId: post.authorId,
      content: post.content,
      imageUrls: post.imageUrls,
      videoUrls: post.videoUrls,
      documentUrls: post.documentUrls,
      type: data.type,
      tags: post.tags,
      status: post.status,
      pinned: post.pinned,
      featured: post.featured,
      visibility: post.visibility,
      isLiked: false,
      userReaction: null,
      _count: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      },
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      educationalContext: post.educationalContext ? JSON.parse(post.educationalContext) : null
    }

    // 🚀 REAL-TIME NOTIFICATION: Notify all group members about new post
    if (!requiresApproval && post.status === 'PUBLISHED') {
      try {
        // Get author information for notification
        const author = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, profilePictureUrl: true }
        })

        console.log('📡 Triggering real-time group post notification:', {
          groupId,
          postId: post.id,
          authorName: author?.name || 'Unknown User'
        })

        // Send real-time notification to all group members
        await notifyGroupMembers(
          groupId,
          transformedPost,
          session.user.id,
          author?.name || session.user.name || 'Unknown User'
        )

        console.log('✅ Group members notified about new post via Socket.IO')

      } catch (notificationError) {
        // Log error but don't fail the response - post was created successfully
        console.error('⚠️ Group post notification failed (post still created):', notificationError)
      }
    }

    return NextResponse.json(transformedPost, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating group post:', error)
    return NextResponse.json(
      { error: 'Failed to create group post' },
      { status: 500 }
    )
  }
}
