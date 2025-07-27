/**
 * Comments API Route Handler
 * 
 * Purpose: Handle CRUD operations for post comments with Facebook-like functionality
 * Features:
 * - Get paginated comments with nested replies
 * - Create new comments with media support
 * - Real-time notifications via Socket.IO and Kafka
 * - Proper data transformation for frontend compatibility
 * 
 * Data Flow:
 * - Fetches comments from database with author relations
 * - Transforms data to match frontend Comment interface
 * - Publishes real-time events for immediate UI updates
 * - Handles privacy and access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'
import { directNotificationService } from '@/lib/services/notification-system/direct-notifications'
import { NotificationType } from '@prisma/client'
import { MAX_COMMENT_DEPTH, MAX_COMMENT_LENGTH, isValidCommentDepth } from '@/lib/constants/comments'

// Production-ready configuration for nested comments
const createCommentSchema = z.object({
  content: z.string().min(1).max(MAX_COMMENT_LENGTH),
  parentId: z.string().optional(), // For nested replies
  imageUrls: z.array(z.string().url()).optional(), // Match schema field name
})

interface RouteParams {
  params: Promise<{ postId: string }>
}

/**
 * Get the depth of a comment in the nesting hierarchy
 * @param commentId - The comment ID to check depth for
 * @returns Promise<number> - The depth level (0 for top-level)
 */
async function getCommentDepth(commentId: string): Promise<number> {
  let depth = 0;
  let currentCommentId: string | null = commentId;
  
  // Traverse up the parent chain to calculate depth
  while (currentCommentId && depth < MAX_COMMENT_DEPTH + 1) { // +1 to catch violations
    const parentComment: { parentId: string | null } | null = await prisma.socialPostComment.findUnique({
      where: { id: currentCommentId },
      select: { parentId: true }
    });
    
    if (!parentComment || !parentComment.parentId) {
      break;
    }
    
    currentCommentId = parentComment.parentId;
    depth++;
  }
  
  return depth;
}

/**
 * Recursively build nested comment structure with proper like status
 * @param comments - All comments from database
 * @param parentId - Parent comment ID (null for top-level)
 * @param authorMap - Map of user IDs to user data
 * @param likesMap - Map of comment IDs to user like status
 * @param postId - Post ID for consistency
 * @param maxDepth - Maximum nesting depth to prevent infinite recursion
 * @param currentDepth - Current recursion depth
 * @returns Array of nested comments with proper like status
 */
function buildNestedComments(
  comments: any[], 
  parentId: string | null, 
  authorMap: Map<string, any>, 
  likesMap: Map<string, boolean>,
  postId: string,
  maxDepth: number = MAX_COMMENT_DEPTH,
  currentDepth: number = 0
): any[] {
  // Prevent infinite recursion and excessive nesting
  if (currentDepth >= maxDepth) {
    return [];
  }

  // Find comments that belong to this parent
  const childComments = comments.filter(c => c.parentId === parentId);
  
  return childComments.map(comment => {
    const author = authorMap.get(comment.userId);
    
    // Recursively get nested replies
    const nestedReplies = buildNestedComments(
      comments, 
      comment.id, 
      authorMap, 
      likesMap,
      postId, 
      maxDepth, 
      currentDepth + 1
    );
    
    return {
      id: comment.id,
      content: comment.content,
      postId: postId,
      parentId: comment.parentId,
      author: author ? {
        id: author.id,
        name: author.name,
        username: author.username,
        image: author.avatar,
        role: author.profession,
        verified: author.isVerified,
      } : {
        id: comment.userId,
        name: 'Unknown User',
        username: 'unknown',
        image: null,
        role: 'OTHER',
        verified: false,
      },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      // PRODUCTION FIX: Get actual like status from database instead of hardcoding false
      isLiked: likesMap.get(comment.id) || false,
      _count: {
        likes: comment.likeCount,
        replies: nestedReplies.length, // Use actual nested replies count
      },
      replies: nestedReplies,
      // PRODUCTION FIX: Add proper edit indicator based on updatedAt vs createdAt
      edited: comment.updatedAt.getTime() !== comment.createdAt.getTime(),
    };
  });
}

/**
 * Check friendship status between users
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Promise<boolean> - Whether users are friends
 */
async function checkFriendship(userId1: string, userId2: string): Promise<boolean> {
  // TODO: Implement friendship check logic
  // This is a placeholder - implement based on your friendship system
  return true;
}

/**
 * Validate comment hierarchy to prevent circular references
 * @param parentId - The parent comment ID
 * @param ancestors - Array of ancestor comment IDs
 * @returns boolean - True if hierarchy is valid  
 */
function validateCommentHierarchy(parentId: string, ancestors: string[]): boolean {
  return !ancestors.includes(parentId);
}

// Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: Await params before accessing properties
    const { postId } = await params

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, oldest, popular

    const offset = (page - 1) * limit

    // Check if post exists and user has access
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true, 
        visibility: true,        status: true,
      }
    })

    if (!post || post.status === 'DELETED') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }    // Check access permissions
    const hasAccess = 
      post.visibility === 'PUBLIC' ||
      post.authorId === session.user.id ||
      (post.visibility === 'FRIENDS' && await checkFriendship(session.user.id, post.authorId))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sortBy === 'popular') {
      orderBy = { likeCount: 'desc' }
    }

    // Production-ready fix: Get ALL comments for this post to build proper nested structure
    const allComments = await prisma.socialPostComment.findMany({
      where: {
        postId: postId,
      },
      select: {
        id: true,
        userId: true,
        parentId: true,
        content: true,
        imageUrls: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' }, // Order by creation for proper nesting
    });

    // Get total count for pagination (only top-level comments)
    const totalComments = await prisma.socialPostComment.count({
      where: {
        postId: postId,
        parentId: null, // Only count top-level comments for pagination
      }
    });

    // Get all unique user IDs from comments for author data
    const allUserIds = Array.from(new Set(allComments.map(c => c.userId)));
    
    // Fetch author data from auth_schema (manual join since cross-schema relations not supported)
    const authors = await prisma.user.findMany({
      where: {
        id: { in: allUserIds }
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        profession: true,
        isVerified: true,
      }
    })

    // Create author lookup map for efficient data transformation
    const authorMap = new Map(authors.map(author => [author.id, author]));

    // PRODUCTION FIX: Fetch user's like status for all comments in single query
    const userLikes = await prisma.socialPostCommentLike.findMany({
      where: {
        userId: session.user.id,
        commentId: { in: allComments.map(c => c.id) }
      },
      select: {
        commentId: true
      }
    });

    // Create likes lookup map for efficient data transformation
    const likesMap = new Map(userLikes.map(like => [like.commentId, true]));

    // Build nested comment structure using recursive function with like status
    const allTransformedComments = buildNestedComments(
      allComments, 
      null, 
      authorMap, 
      likesMap, 
      postId
    );
    
    // Apply pagination to top-level comments only (after building nested structure)
    const transformedComments = allTransformedComments.slice(offset, offset + limit);

    return NextResponse.json({
      comments: transformedComments,
      pagination: {
        page,
        limit,
        total: totalComments,
        totalPages: Math.ceil(totalComments / limit),
        hasNextPage: page < Math.ceil(totalComments / limit),
        hasPreviousPage: page > 1,
      }
    })

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// Create new comment
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: Await params before accessing properties
    const { postId } = await params
    
    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    // Check if post exists and allows comments
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true, 
        visibility: true,
        status: true,
      }
    })

    if (!post || post.status === 'DELETED') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }    // Check access permissions
    const hasAccess = 
      post.visibility === 'PUBLIC' ||
      post.authorId === session.user.id ||
      (post.visibility === 'FRIENDS' && await checkFriendship(session.user.id, post.authorId))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If it's a reply, check if parent comment exists and validate nesting depth
    if (validatedData.parentId) {
      const parentComment = await prisma.socialPostComment.findUnique({
        where: { id: validatedData.parentId },
        select: { id: true, postId: true }
      })

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      // Production-ready: Check comment nesting depth to prevent infinite nesting
      const currentDepth = await getCommentDepth(validatedData.parentId);
      if (currentDepth >= MAX_COMMENT_DEPTH) {
        return NextResponse.json({ 
          error: `Maximum comment nesting depth of ${MAX_COMMENT_DEPTH} levels exceeded` 
        }, { status: 400 })
      }

      // Validate comment hierarchy to prevent circular references
      const ancestors: string[] = [];
      let currentParentId: string | null = validatedData.parentId;
      
      // Build ancestor chain for circular reference detection
      while (currentParentId && ancestors.length < MAX_COMMENT_DEPTH + 1) {
        ancestors.push(currentParentId);
        const ancestorComment: { parentId: string | null } | null = await prisma.socialPostComment.findUnique({
          where: { id: currentParentId },
          select: { parentId: true }
        });
        currentParentId = ancestorComment?.parentId || null;
      }

      // Check for circular references
      if (!validateCommentHierarchy(validatedData.parentId, ancestors.slice(1))) {
        return NextResponse.json({ 
          error: 'Invalid comment hierarchy: circular reference detected' 
        }, { status: 400 })
      }
    }

    // Create comment (without author relation since cross-schema relations not supported)
    const comment = await prisma.socialPostComment.create({
      data: {
        content: validatedData.content,
        imageUrls: validatedData.imageUrls || [],
        postId: postId,
        userId: session.user.id,
        parentId: validatedData.parentId || null,
      },
      select: {
        id: true,
        userId: true,
        parentId: true,
        content: true,
        imageUrls: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Manually fetch author data since cross-schema relation not supported
    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        profession: true,
        isVerified: true,
      }
    })

    // Transform comment response to match frontend expectations with manually joined author data
    const transformedComment = {
      id: comment.id,
      content: comment.content,
      postId: postId,
      parentId: comment.parentId,
      author: author ? {
        id: author.id,
        name: author.name,
        username: author.username,
        image: author.avatar,
        role: author.profession,
        verified: author.isVerified,
      } : {
        id: session.user.id,
        name: session.user.name || 'Unknown User',
        username: 'unknown',
        image: session.user.image,
        role: 'OTHER',
        verified: false,
      },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      isLiked: false,
      _count: {
        likes: comment.likeCount,
        replies: comment.replyCount,
      },
      replies: [],
    }

    revalidatePath('/students-interlinked')

    // Real-time integration - Facebook-like comments
    await StudentsInterlinkedService.onCommentCreated(
      transformedComment, 
      postId, 
      session.user.id, 
      post.authorId
    )

    // ==========================================
    // NOTIFICATION SYSTEM (Facebook-style)
    // ==========================================
    
    // Send notification to post author (but not to self)
    if (post.authorId !== session.user.id) {
      try {
        await directNotificationService.createNotification({
          userId: post.authorId,
          title: 'New comment on your post',
          message: await getCommentNotificationMessage(session.user.id, validatedData.content, 'post'),
          type: NotificationType.POST_COMMENTED,
          category: 'SOCIAL',
          priority: 'NORMAL',
          channels: ['IN_APP', 'PUSH'],
          entityType: 'POST',
          entityId: postId,
          data: {
            commenterId: session.user.id,
            commenterName: session.user.name || 'Someone',
            commentContent: validatedData.content.slice(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
            postId: postId,
            commentId: comment.id
          }
        })
        
        console.log(`📢 Sent comment notification to post author ${post.authorId}`)
      } catch (notificationError) {
        console.error('Failed to send comment notification:', notificationError)
        // Don't fail the request for notification errors
      }
    }

    // Send notification to parent comment author for replies
    if (validatedData.parentId) {
      try {
        const parentComment = await prisma.socialPostComment.findUnique({
          where: { id: validatedData.parentId },
          select: { userId: true }
        })
        
        if (parentComment && parentComment.userId !== session.user.id) {
          await directNotificationService.createNotification({
            userId: parentComment.userId,
            title: 'Someone replied to your comment',
            message: await getCommentNotificationMessage(session.user.id, validatedData.content, 'comment'),
            type: NotificationType.COMMENT_REPLIED,
            category: 'SOCIAL',
            priority: 'NORMAL',
            channels: ['IN_APP', 'PUSH'],
            entityType: 'COMMENT',
            entityId: validatedData.parentId,
            data: {
              commenterId: session.user.id,
              commenterName: session.user.name || 'Someone',
              commentContent: validatedData.content.slice(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
              parentCommentId: validatedData.parentId,
              commentId: comment.id
            }
          })
          
          console.log(`📢 Sent reply notification to comment author ${parentComment.userId}`)
        }
      } catch (notificationError) {
        console.error('Failed to send reply notification:', notificationError)
        // Don't fail the request for notification errors
      }
    }

    return NextResponse.json({ comment: transformedComment }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

// ==========================================
// NOTIFICATION HELPER FUNCTIONS
// ==========================================

/**
 * Get personalized notification message for comments
 */
async function getCommentNotificationMessage(
  commenterId: string,
  commentContent: string,
  targetType: 'post' | 'comment'
): Promise<string> {
  try {
    // Get commenter's name
    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { name: true, username: true }
    });
    
    const commenterName = commenter?.name || commenter?.username || 'Someone';
    const contentPreview = commentContent.slice(0, 50) + (commentContent.length > 50 ? '...' : '');
    
    if (targetType === 'post') {
      return `${commenterName} commented on your post: "${contentPreview}"`;
    } else {
      return `${commenterName} replied to your comment: "${contentPreview}"`;
    }
  } catch (error) {
    console.error('Error creating comment notification message:', error);
    const action = targetType === 'post' ? 'commented on your post' : 'replied to your comment';
    return `Someone ${action}`;
  }
}
