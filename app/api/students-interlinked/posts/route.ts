import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { StudentsInterlinkedService } from '@/lib/services/student-interlinked/students-interlinked-realtime'

// Post creation schema with educational context, group support, and polls
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string()).optional().default([]), // Allow any string for now, filter blob URLs later
  groupId: z.string().optional(), // Support for group posts
  educationalContext: z.object({
    courseId: z.string().optional(),
    subject: z.string().optional(),
    academicLevel: z.enum(['UNDERGRADUATE', 'GRADUATE', 'POSTGRADUATE', 'PROFESSIONAL']).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'GROUPS']).default('PUBLIC'),
  allowComments: z.boolean().default(true),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LINK', 'POLL']).default('TEXT'),
  // Poll data (only required if type is POLL)
  poll: z.object({
    question: z.string().min(1).max(500),
    options: z.array(z.object({
      text: z.string().min(1).max(200),
      imageUrl: z.string().url().optional(),
    })).min(2).max(10),
    allowMultiple: z.boolean().default(false),
    expiresAt: z.string().optional(), // ISO date string
    isAnonymous: z.boolean().default(false),
    isEducational: z.boolean().default(false),
    correctAnswer: z.array(z.string()).optional(),
    explanation: z.string().optional(),
  }).optional(),
})

// Get posts with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const courseId = searchParams.get('courseId')
    const subject = searchParams.get('subject')
    const type = searchParams.get('type')
    const authorId = searchParams.get('authorId')
    const groupId = searchParams.get('groupId') // Add group filtering

    const offset = (page - 1) * limit

    // Build filter conditions
    const where: any = {
      status: 'PUBLISHED', // Only show published posts
    }

    // If filtering by group, show only group posts
    if (groupId) {
      where.studyGroupId = groupId // Using studyGroupId from existing schema
    } else {
      // For main feed, show public posts and user's own posts
      where.OR = [
        { visibility: 'PUBLIC' },
        { authorId: session.user.id },
        { visibility: 'FRIENDS' }, // For now, include all friends posts - can be enhanced later
        { visibility: 'LISTED' } // Include group posts user has access to (mapped from frontend 'GROUPS')
      ]
    }

    // Add other filters
    if (courseId) where.courseId = courseId
    if (subject) where.subjectArea = subject
    if (type) where.postType = type
    if (authorId) where.authorId = authorId

    const posts = await prisma.socialPost.findMany({
      where,
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
            likeCount: true,
            replyCount: true,
            likes: {
              select: {
                id: true,
                userId: true,
                reaction: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3, // Show only latest 3 comments initially
        },
        shares: {
          select: {
            userId: true,
            content: true,
            createdAt: true,
          }
        },
        bookmarks: {
          select: {
            userId: true,
            createdAt: true,
          }
        },
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: 'asc' }
            },
            votes: {
              select: {
                userId: true,
                optionId: true,
              }
            }
          }
        },
        // Add count aggregation - PRODUCTION: Include engagement metrics for proper tracking
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            // Note: viewCount is a direct field, not a relation count
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    })

    // Manually fetch author data for each post due to cross-schema limitation
    const authorIds = [...new Set(posts.map(post => post.authorId))]
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        name: true,
        username: true, // ✅ CRITICAL FIX: Include proper username field
        email: true,
        profilePictureUrl: true, // ✅ FIXED: Use correct field name for profile images
        isVerified: true, // ✅ PRODUCTION: Include verification status
        // Add profile relation if exists
        workExperiences: {
          select: {
            company: true,
            position: true,
          },
          take: 1,
          orderBy: { isCurrentJob: 'desc' }
        }
      }
    })

    // Create author lookup map
    const authorMap = new Map(authors.map(author => [author.id, author]))

    // Manually fetch user data for likes and comments
    const likeUserIds = [...new Set(posts.flatMap(post => post.likes.map(like => like.userId)))]
    const commentUserIds = [...new Set(posts.flatMap(post => post.comments.map(comment => comment.userId)))]
    const allUserIds = [...new Set([...likeUserIds, ...commentUserIds])]

    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true,
        name: true,
        username: true, // ✅ CRITICAL FIX: Include proper username field
        profilePictureUrl: true, // ✅ FIXED: Use correct field name for profile images
      }
    })

    const userMap = new Map(users.map(user => [user.id, user]))

    // Transform posts to match frontend interface - with consistent field mapping
    const transformedPosts = posts.map(post => {
      const author = authorMap.get(post.authorId)
      return {
        id: post.id,
        content: post.content,
        // Combine media URLs consistently  
        mediaUrls: [...(post.imageUrls || []), ...(post.videoUrls || []), ...(post.documentUrls || [])],
        // Educational context with proper parsing
        educationalContext: post.educationalContext ? {
          ...JSON.parse(post.educationalContext),
          courseId: post.courseId,
          subject: post.subjectArea,
          academicLevel: post.academicLevel,
        } : undefined,
        // Map visibility consistently
        visibility: post.visibility === 'LISTED' ? 'GROUPS' : post.visibility,
        allowComments: true, // Default since not in current schema
        // Map post type consistently  
        type: post.poll ? 'POLL' :
              post.postType === 'GENERAL' ? 'TEXT' : 
              post.postType === 'RESOURCE_SHARE' ? 'DOCUMENT' : 'TEXT',
        // Poll data if exists
        poll: post.poll ? {
          id: post.poll.id,
          question: post.poll.question,
          allowMultiple: post.poll.allowMultiple,
          expiresAt: post.poll.expiresAt?.toISOString(),
          isAnonymous: post.poll.isAnonymous,
          isEducational: post.poll.isEducational,
          correctAnswer: post.poll.correctAnswer,
          explanation: post.poll.explanation,
          totalVotes: post.poll.totalVotes,
          options: post.poll.options.map(option => ({
            id: option.id,
            text: option.text,
            imageUrl: option.imageUrl,
            voteCount: option.voteCount,
            hasVoted: post.poll?.votes.some(vote => vote.optionId === option.id && vote.userId === session.user.id) || false,
          })),
          hasVoted: post.poll?.votes.some(vote => vote.userId === session.user.id) || false,
          userVotes: post.poll?.votes
            .filter(vote => vote.userId === session.user.id)
            .map(vote => vote.optionId) || [],
        } : undefined,
        // Author with proper username handling - CRITICAL FIX
        author: author ? {
          id: author.id,
          name: author.name || '',
          username: author.username || null, // ✅ PRODUCTION: Use actual username from database
          email: author.email || '',
          image: author.profilePictureUrl || '', // ✅ FIXED: Use correct field name for profile images
          verified: author.isVerified || false, // ✅ PRODUCTION: Proper verification status
          profile: {
            major: author.workExperiences?.[0]?.position,
            academicLevel: post.academicLevel,
            institution: author.workExperiences?.[0]?.company,
          }
        } : null,
        // Likes with consistent structure and proper username handling
        likes: post.likes.map(like => ({
          id: like.id,
          type: like.reaction?.toUpperCase() || 'LIKE',
          user: userMap.get(like.userId) ? {
            id: like.userId,
            name: userMap.get(like.userId)?.name || '',
            username: userMap.get(like.userId)?.username || null, // ✅ PRODUCTION: Use actual username
            image: userMap.get(like.userId)?.profilePictureUrl || '', // ✅ FIXED: Use correct field name
          } : null
        })).filter(like => like.user),
        // Comments with consistent structure and proper username handling
        comments: post.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          author: userMap.get(comment.userId) ? {
            id: comment.userId,
            name: userMap.get(comment.userId)?.name || '',
            username: userMap.get(comment.userId)?.username || null, // ✅ PRODUCTION: Use actual username
            image: userMap.get(comment.userId)?.profilePictureUrl || '', // ✅ FIXED: Use correct field name
          } : null,
          likes: comment.likes || [],
          createdAt: comment.createdAt.toISOString(),
        })).filter(comment => comment.author),
        // Consistent count structure - PRODUCTION: Include all engagement metrics
        _count: {
          likes: post._count.likes,
          comments: post._count.comments, 
          shares: post._count.shares,
          // ✅ PRODUCTION FIX: Include viewCount from post model for proper engagement tracking
          views: post.viewCount || 0, // Use direct field from SocialPost model
        },
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      }
    }).filter(post => post.author) // Only return posts with valid authors

    // Get total count for pagination
    const totalPosts = await prisma.socialPost.count({ where })

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        hasNextPage: page < Math.ceil(totalPosts / limit),
        hasPreviousPage: page > 1,
      }
    })

  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received POST data:', JSON.stringify(body, null, 2))

    const validatedData = createPostSchema.parse(body)

    // Validate poll data if type is POLL
    if (validatedData.type === 'POLL' && !validatedData.poll) {
      return NextResponse.json({ error: 'Poll data required for poll posts' }, { status: 400 })
    }

    // Create post with educational context, group support, and optional poll
    const result = await prisma.$transaction(async (tx) => {
      // Filter out blob URLs and only keep valid HTTP URLs
      const validMediaUrls = validatedData.mediaUrls.filter(url => 
        url.startsWith('http://') || url.startsWith('https://')
      )
      
      const post = await tx.socialPost.create({
        data: {
          content: validatedData.content,
          imageUrls: validMediaUrls.filter(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)),
          videoUrls: validMediaUrls.filter(url => url.match(/\.(mp4|webm|ogg|mov)$/i)),
          documentUrls: validMediaUrls.filter(url => !url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov)$/i)),
          educationalContext: validatedData.educationalContext ? JSON.stringify(validatedData.educationalContext) : null,
          tags: validatedData.educationalContext?.tags || [],
          courseId: validatedData.educationalContext?.courseId,
          subjectArea: validatedData.educationalContext?.subject,
          academicLevel: validatedData.educationalContext?.academicLevel === 'UNDERGRADUATE' ? 'UNDERGRADUATE' :
            validatedData.educationalContext?.academicLevel === 'GRADUATE' ? 'GRADUATE' :
              validatedData.educationalContext?.academicLevel === 'POSTGRADUATE' ? 'GRADUATE' :
                validatedData.educationalContext?.academicLevel === 'PROFESSIONAL' ? 'PROFESSIONAL' : null,
          studyGroupId: validatedData.groupId,
          visibility: validatedData.visibility === 'GROUPS' ? 'LISTED' : validatedData.visibility,
          postType: validatedData.type === 'TEXT' ? 'GENERAL' :
            validatedData.type === 'IMAGE' ? 'GENERAL' :
              validatedData.type === 'VIDEO' ? 'GENERAL' :
                validatedData.type === 'DOCUMENT' ? 'RESOURCE_SHARE' :
                  validatedData.type === 'LINK' ? 'GENERAL' :
                    validatedData.type === 'POLL' ? 'GENERAL' : 'GENERAL',
          authorId: session.user.id,
        },
      })

      // Create poll if this is a poll post
      let poll = null
      if (validatedData.type === 'POLL' && validatedData.poll) {
        poll = await tx.socialPostPoll.create({
          data: {
            postId: post.id,
            question: validatedData.poll.question,
            allowMultiple: validatedData.poll.allowMultiple,
            expiresAt: validatedData.poll.expiresAt ? new Date(validatedData.poll.expiresAt) : null,
            isAnonymous: validatedData.poll.isAnonymous,
            isEducational: validatedData.poll.isEducational,
            correctAnswer: validatedData.poll.correctAnswer || [],
            explanation: validatedData.poll.explanation,
            options: {
              create: validatedData.poll.options.map((option, index) => ({
                text: option.text,
                imageUrl: option.imageUrl,
                orderIndex: index,
              }))
            }
          },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        })
      }

      return { post, poll }
    })

    const post = await prisma.socialPost.findUnique({
      where: { id: result.post.id },
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
            likeCount: true,
            replyCount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: 'asc' }
            },
            votes: {
              select: {
                userId: true,
                optionId: true,
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
          }
        }
      },
    })

    // Get author data
    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true,
        username: true,
        workExperiences: {
          select: {
            company: true,
            position: true,
          },
          take: 1,
          orderBy: { isCurrentJob: 'desc' }
        }
      }
    })

    if (!post || !author) {
      return NextResponse.json({ error: 'Failed to fetch created post' }, { status: 500 })
    }

    // Transform post to match frontend interface - consistent structure with poll support
    const transformedPost = {
      id: post.id,
      content: post.content,
      mediaUrls: [...(post.imageUrls || []), ...(post.videoUrls || []), ...(post.documentUrls || [])],
      educationalContext: post.educationalContext ? {
        ...JSON.parse(post.educationalContext),
        courseId: post.courseId,
        subject: post.subjectArea,
        academicLevel: post.academicLevel,
      } : undefined,
      visibility: post.visibility === 'LISTED' ? 'GROUPS' : post.visibility,
      allowComments: true,
      type: post.poll ? 'POLL' :
        post.postType === 'GENERAL' ? 'TEXT' :
          post.postType === 'RESOURCE_SHARE' ? 'DOCUMENT' : 'TEXT',
      // Poll data if exists
      poll: post.poll ? {
        id: post.poll.id,
        question: post.poll.question,
        allowMultiple: post.poll.allowMultiple,
        expiresAt: post.poll.expiresAt?.toISOString(),
        isAnonymous: post.poll.isAnonymous,
        isEducational: post.poll.isEducational,
        correctAnswer: post.poll.correctAnswer,
        explanation: post.poll.explanation,
        totalVotes: post.poll.totalVotes,
        options: post.poll.options.map(option => ({
          id: option.id,
          text: option.text,
          imageUrl: option.imageUrl,
          voteCount: option.voteCount,
          hasVoted: false, // New post, no votes yet
        })),
        hasVoted: false,
        userVotes: [],
      } : undefined,
      author: {
        id: author.id,
        name: author.name || '',
        username: author.username || author.email?.split('@')[0] || '',
        email: author.email || '',
        image: author.profilePictureUrl || '',
        verified: false,
        profile: {
          major: author.workExperiences?.[0]?.position,
          academicLevel: post.academicLevel,
          institution: author.workExperiences?.[0]?.company,
        }
      },
      likes: post.likes.map(like => ({
        id: like.id,
        type: like.reaction?.toUpperCase() || 'LIKE',
        user: {
          id: like.userId,
          name: '',
          username: '',
          image: '',
        }
      })),
      comments: post.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.userId,
          name: '',
          username: '',
          image: '',
        },
        likes: [],
        createdAt: comment.createdAt.toISOString(),
      })),
      _count: post._count,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }

    // Revalidate the posts cache
    revalidatePath('/students-interlinked')

    // Real-time integration - Facebook-like functionality
    await StudentsInterlinkedService.onPostCreated(transformedPost, session.user.id)

    return NextResponse.json({ post: transformedPost }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
