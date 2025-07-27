/**
 * =============================================================================
 * CONVERSATIONS API - PRODUCTION-READY FACEBOOK-STYLE MESSAGING
 * =============================================================================
 * 
 * PURPOSE:
 * Complete messaging system with real-time features, allowing all types of conversations
 * including self-messaging (like Facebook, WhatsApp, and other major platforms)
 * 
 * FEATURES:
 * ✅ Direct messaging between any users (including self-messaging)
 * ✅ Group conversations with admin controls
 * ✅ Real-time notifications via Socket.IO
 * ✅ Redis caching for performance optimization
 * ✅ Kafka event streaming for analytics
 * ✅ Conversation search and pagination
 * ✅ Unread message counting
 * ✅ Duplicate conversation prevention
 * ✅ Comprehensive error handling
 * ✅ Production-ready logging
 * ✅ Type-safe implementation
 * ✅ Rate limiting protection
 * ✅ Authentication integration (NextAuth 5)
 * 
 * ENDPOINTS:
 * - GET /api/messages/conversations - List user conversations with caching
 * - POST /api/messages/conversations - Create new conversation with real-time notifications
 * 
 * REAL-TIME INTEGRATION:
 * - Socket.IO for instant notifications
 * - Redis for conversation caching
 * - Kafka for event streaming and analytics
 * 
 * LAST UPDATED: 2025-07-23 - Production Ready Implementation
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { producer as kafkaProducer } from '@/lib/kafka';
import { SocketIOEmitter } from '@/lib/socket/socket-emitter';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  lastActivity?: Date;
  isVerified: boolean;
  createdAt: Date;
}

interface ConversationParticipant {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  isAdmin: boolean;
  isVerified: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
}

interface FormattedConversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string;
  description?: string;
  isGroup: boolean;
  participants: ConversationParticipant[];
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    createdAt: Date;
    updatedAt: Date;
    senderId: string;
    isEdited: boolean;
    status: string;
    senderName: string;
    senderAvatar?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    profilePictureUrl?: string;
    lastActivity?: Date;
    isVerified: boolean;
    createdAt: Date;
  };
  isAdmin: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Rate limiting for conversation creation
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const key = `rate_limit:conversation_create:${userId}`;
    const current = await redis.get(key);
    
    if (!current) {
      // First request - set limit of 20 conversations per hour
      await redis.setex(key, 3600, '1');
      return true;
    }
    
    const count = parseInt(current);
    if (count >= 20) {
      return false; // Rate limit exceeded
    }
    
    await redis.incr(key);
    return true;
  } catch (error) {
    console.error('⚠️ Rate limit check failed:', error);
    return true; // Allow request if rate limiting fails
  }
}

/**
 * Check if user is online (last activity within 5 minutes)
 */
function isUserOnline(lastActivity?: Date): boolean {
  if (!lastActivity) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastActivity > fiveMinutesAgo;
}

/**
 * Format participant data for frontend
 */
function formatParticipant(participant: PrismaParticipant): ConversationParticipant {
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.user.name,
    username: participant.user.username,
    avatar: participant.user.profilePictureUrl,
    isOnline: isUserOnline(participant.user.lastActivity),
    lastSeen: participant.user.lastActivity || participant.user.createdAt,
    isAdmin: participant.isAdmin,
    isVerified: participant.user.isVerified,
    canAddMembers: participant.canAddMembers,
    canRemoveMembers: participant.canRemoveMembers,
  };
}

/**
 * Format conversation data for frontend
 */
function formatConversation(conversation: any): FormattedConversation {
  return {
    ...conversation,
    participants: conversation.participants.map(formatParticipant),
    unreadCount: conversation._count?.messages || 0,
    lastMessage: conversation.messages?.[0] ? {
      ...conversation.messages[0],
      // Add sender info from participants if needed
      senderName: conversation.participants.find((p: any) => p.userId === conversation.messages[0].senderId)?.user?.name || 'Unknown',
      senderAvatar: conversation.participants.find((p: any) => p.userId === conversation.messages[0].senderId)?.user?.profilePictureUrl,
    } : null,
  };
}

// ==========================================
// GET CONVERSATIONS ENDPOINT
// ==========================================

/**
 * GET /api/messages/conversations
 * Retrieve user's conversations with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/messages/conversations - Fetching user conversations');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50); // Max 50 per page
    const search = url.searchParams.get('search')?.trim() || '';

    const skip = (page - 1) * limit;

    console.log('📋 Query parameters:', { page, limit, search, userId: session.user.id });

    // ==========================================
    // REDIS CACHING FOR PERFORMANCE
    // ==========================================
    
    const cacheKey = `conversations:${session.user.id}:page:${page}:limit:${limit}:search:${search}`;
    
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log('✅ Returning cached conversations for user:', session.user.id);
        return NextResponse.json(JSON.parse(cachedData));
      }
    } catch (cacheError) {
      console.log('⚠️ Redis cache miss or error:', cacheError);
    }

    // Build where clause for conversation filtering
    const whereClause: any = {
      participants: {
        some: {
          userId: session.user.id,
          isHidden: false,
        },
      },
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          participants: {
            some: {
              user: {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    username: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        },
      ];
    }

    // Fetch conversations with all related data
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePictureUrl: true,
                lastActivity: true,
                isVerified: true,
                createdAt: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
          select: {
            id: true,
            content: true,
            messageType: true,
            createdAt: true,
            updatedAt: true,
            senderId: true,
            isEdited: true,
            status: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isDeleted: false,
                reads: {
                  none: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    // Format conversations for frontend
    const formattedConversations = conversations.map(formatConversation);

    // Get total count for pagination
    const totalCount = await prisma.conversation.count({ where: whereClause });
    const hasMore = skip + limit < totalCount;

    console.log('✅ Successfully fetched conversations:', {
      count: formattedConversations.length,
      totalCount,
      hasMore,
      page,
    });

    const result = {
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        totalCount,
        hasMore,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    // ==========================================
    // CACHE RESULT FOR PERFORMANCE
    // ==========================================
    
    try {
      // Cache for 60 seconds to balance freshness and performance
      await redis.setex(cacheKey, 60, JSON.stringify(result));
      console.log('✅ Cached conversations result');
    } catch (cacheError) {
      console.log('⚠️ Failed to cache result:', cacheError);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations. Please try again.' },
      { status: 500 }
    );
  }
}

// ==========================================
// CREATE CONVERSATION ENDPOINT
// ==========================================

/**
 * POST /api/messages/conversations
 * Create a new conversation or return existing one
 * Supports both direct messaging (including self-messaging) and group chats
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/messages/conversations - Creating new conversation');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ==========================================
    // RATE LIMITING (PRODUCTION SECURITY)
    // ==========================================
    
    const rateLimitPassed = await checkRateLimit(session.user.id);
    if (!rateLimitPassed) {
      console.log('⚠️ Rate limit exceeded for user:', session.user.id);
      return NextResponse.json(
        { error: 'Too many conversation creation requests. Please try again later.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('❌ Invalid JSON in request body');
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { 
      participantIds, 
      type = 'DIRECT', 
      title, 
      description, 
      isGroup = false 
    } = body;

    console.log('📝 Conversation creation request:', {
      currentUserId: session.user.id,
      participantIds,
      type,
      isGroup,
      title,
    });

    // Validate participant IDs
    if (!participantIds || !Array.isArray(participantIds)) {
      console.log('❌ Invalid participant IDs provided');
      return NextResponse.json(
        { error: 'Participant IDs must be provided as an array' },
        { status: 400 }
      );
    }

    // Validate participant IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const id of participantIds) {
      if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
        console.log('❌ Invalid participant ID format:', id);
        return NextResponse.json(
          { error: 'All participant IDs must be valid UUIDs' },
          { status: 400 }
        );
      }
    }

    // Validate conversation type
    if (!['DIRECT', 'GROUP'].includes(type)) {
      console.log('❌ Invalid conversation type:', type);
      return NextResponse.json(
        { error: 'Conversation type must be DIRECT or GROUP' },
        { status: 400 }
      );
    }

    // For direct messages, ensure exactly one participant is provided
    if (type === 'DIRECT' && participantIds.length !== 1) {
      console.log('❌ Invalid participant count for direct message');
      return NextResponse.json(
        { error: 'Direct conversations must have exactly one other participant' },
        { status: 400 }
      );
    }

    const targetUserId = participantIds[0];

    // ==========================================
    // SELF-MESSAGING SUPPORT (PRODUCTION-READY)
    // ==========================================
    // Allow users to message themselves like Facebook, WhatsApp, etc.
    // This is useful for personal notes, reminders, and testing
    
    if (targetUserId === session.user.id) {
      console.log('💬 Self-messaging conversation requested - this is allowed');
      
      // Check for existing self-conversation
      const existingSelfConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: session.user.id,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  profilePictureUrl: true,
                  lastActivity: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            where: { isDeleted: false },
          },
        },
      });

      if (existingSelfConversation) {
        console.log('✅ Found existing self-conversation:', existingSelfConversation.id);
        return NextResponse.json({
          conversation: formatConversation(existingSelfConversation),
          isExisting: true,
        });
      }

      // Create new self-conversation
      console.log('🆕 Creating new self-conversation...');
      
      const selfConversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          title: title || `${session.user.name} (Personal Notes)`,
          description: description || 'Personal conversation for notes and reminders',
          isGroup: false,
          participants: {
            create: {
              userId: session.user.id,
              isAdmin: true,
              canAddMembers: false,
              canRemoveMembers: false,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  profilePictureUrl: true,
                  lastActivity: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            where: { isDeleted: false },
          },
        },
      });

      console.log('✅ Self-conversation created successfully:', selfConversation.id);
      
      // ==========================================
      // REAL-TIME NOTIFICATIONS FOR SELF-MESSAGING
      // ==========================================
      
      // Non-blocking real-time notifications
      setImmediate(async () => {
        try {
          // Cache self-conversation
          const cacheKey = `conversation:${selfConversation.id}`;
          await redis.setex(cacheKey, 3600, JSON.stringify(formatConversation(selfConversation)));
          
          // Invalidate user's conversation list cache
          const listCachePattern = `conversations:${session.user.id}:*`;
          try {
            const keys = await redis.keys(listCachePattern);
            if (keys.length > 0) {
              await redis.del(...keys);
              console.log('✅ Invalidated conversation list cache');
            }
          } catch (cacheInvalidateError) {
            console.log('⚠️ Failed to invalidate cache:', cacheInvalidateError);
          }
          
          // Send real-time notification to self (non-blocking)
          try {
            const socketEmitter = SocketIOEmitter.getInstance();
            await socketEmitter.emitToUser(session.user.id, 'conversation:created', {
              type: 'self_conversation_created',
              conversationId: selfConversation.id,
              conversation: formatConversation(selfConversation),
              timestamp: new Date().toISOString(),
            });
            console.log('✅ Self-messaging Socket.IO notification sent');
          } catch (socketError: any) {
            console.log('⚠️ Socket.IO notification failed (non-blocking):', socketError?.message || socketError);
          }

          // Send Kafka event for analytics (non-blocking)
          try {
            await kafkaProducer.send({
              topic: 'conversation-events',
              messages: [{
                key: selfConversation.id,
                value: JSON.stringify({
                  event: 'self_conversation_created',
                  conversationId: selfConversation.id,
                  userId: session.user.id,
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
            console.log('✅ Self-messaging Kafka event sent');
          } catch (kafkaError: any) {
            console.log('⚠️ Kafka event failed (non-blocking):', kafkaError?.message || kafkaError);
          }
        } catch (notificationError) {
          console.error('⚠️ Background notifications failed:', notificationError);
        }
      });
      
      return NextResponse.json({
        conversation: formatConversation(selfConversation),
        isExisting: false,
      });
    }

    // ==========================================
    // REGULAR DIRECT MESSAGING
    // ==========================================
    
    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true },
    });

    if (!targetUser) {
      console.log('❌ Target user not found:', targetUserId);
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    console.log('✅ Target user found:', targetUser.name);

    // For direct conversations, check if conversation already exists
    if (type === 'DIRECT') {
      console.log('🔍 Checking for existing direct conversation...');
      
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            {
              participants: {
                some: { userId: session.user.id },
              },
            },
            {
              participants: {
                some: { userId: targetUserId },
              },
            },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  profilePictureUrl: true,
                  lastActivity: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            where: { isDeleted: false },
          },
        },
      });

      // Verify it's exactly between these two users
      if (existingConversation && existingConversation.participants.length === 2) {
        console.log('✅ Found existing conversation:', existingConversation.id);
        return NextResponse.json({
          conversation: formatConversation(existingConversation),
          isExisting: true,
        });
      }

      // Also check for self-conversations if target user is current user
      if (targetUserId === session.user.id) {
        const selfConversation = await prisma.conversation.findFirst({
          where: {
            type: 'DIRECT',
            participants: {
              every: { userId: session.user.id },
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    profilePictureUrl: true,
                    lastActivity: true,
                    isVerified: true,
                    createdAt: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              where: { isDeleted: false },
            },
          },
        });

        if (selfConversation && selfConversation.participants.length === 1) {
          console.log('✅ Found existing self-conversation:', selfConversation.id);
          return NextResponse.json({
            conversation: formatConversation(selfConversation),
            isExisting: true,
          });
        }
      }
    }

    // ==========================================
    // CREATE NEW CONVERSATION
    // ==========================================
    
    console.log('🆕 Creating new conversation...');

    const newConversation = await prisma.$transaction(async (tx) => {
      // Create the conversation
      const conversation = await tx.conversation.create({
        data: {
          type,
          title,
          description,
          isGroup,
          participants: {
            create: [
              // Add current user as admin
              {
                userId: session.user.id,
                isAdmin: true,
                canAddMembers: true,
                canRemoveMembers: isGroup,
              },
              // Add other participants
              ...participantIds
                .filter((id: string) => id !== session.user.id) // Avoid duplicates
                .map((userId: string) => ({
                  userId,
                  isAdmin: false,
                  canAddMembers: isGroup,
                  canRemoveMembers: false,
                })),
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  profilePictureUrl: true,
                  lastActivity: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            where: { isDeleted: false },
          },
        },
      });

      return conversation;
    });

    console.log('✅ New conversation created successfully:', newConversation.id);

    // ==========================================
    // REAL-TIME NOTIFICATIONS (FACEBOOK-STYLE)
    // ==========================================
    
    // Non-blocking real-time notifications
    setImmediate(async () => {
      try {
        // 1. Cache conversation in Redis for faster access
        const cacheKey = `conversation:${newConversation.id}`;
        await redis.setex(cacheKey, 3600, JSON.stringify(formatConversation(newConversation)));
        
        // Invalidate all participants' conversation list cache
        const participantIds = newConversation.participants.map((p: any) => p.userId);
        for (const participantId of participantIds) {
          try {
            const listCachePattern = `conversations:${participantId}:*`;
            const keys = await redis.keys(listCachePattern);
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } catch (cacheInvalidateError) {
            console.log(`⚠️ Failed to invalidate cache for user ${participantId}:`, cacheInvalidateError);
          }
        }
        
        // 2. Send real-time notification via Socket.IO (non-blocking)
        try {
          const socketEmitter = SocketIOEmitter.getInstance();
          const notificationData = {
            type: 'conversation_created',
            conversationId: newConversation.id,
            conversation: formatConversation(newConversation),
            timestamp: new Date().toISOString(),
            metadata: {
              isGroup: newConversation.isGroup,
              title: newConversation.title,
              createdBy: session.user.id,
              createdByName: session.user.name,
            },
          };

          // Send to all participants except the creator
          for (const participant of newConversation.participants) {
            if (participant.userId !== session.user.id) {
              try {
                await socketEmitter.emitToUser(participant.userId, 'conversation:created', notificationData);
                console.log(`✅ Sent conversation notification to user: ${participant.userId}`);
              } catch (userNotifyError: any) {
                console.log(`⚠️ Failed to notify user ${participant.userId}:`, userNotifyError?.message || userNotifyError);
              }
            }
          }

          // Also emit to the conversation room for future message handling
          try {
            await socketEmitter.emitToRoom(`conversation:${newConversation.id}`, 'conversation:ready', {
              conversationId: newConversation.id,
              participants: newConversation.participants.map((p: any) => p.userId),
            });
            console.log('✅ Conversation room notification sent');
          } catch (roomError: any) {
            console.log('⚠️ Room notification failed:', roomError?.message || roomError);
          }
        } catch (socketError: any) {
          console.log('⚠️ Socket.IO notifications failed (non-blocking):', socketError?.message || socketError);
        }

        // 3. Send event to Kafka for analytics (non-blocking)
        try {
          await kafkaProducer.send({
            topic: 'conversation-events',
            messages: [{
              key: newConversation.id,
              value: JSON.stringify({
                event: 'conversation_created',
                conversationId: newConversation.id,
                userId: session.user.id,
                participantIds: newConversation.participants.map((p: any) => p.userId),
                timestamp: new Date().toISOString(),
                metadata: {
                  isGroup: newConversation.isGroup,
                  title: newConversation.title,
                  createdBy: session.user.id,
                  createdByName: session.user.name,
                },
              }),
            }],
          });
          console.log('✅ Kafka event sent for conversation:', newConversation.id);
        } catch (kafkaError: any) {
          console.log('⚠️ Kafka event failed (non-blocking):', kafkaError?.message || kafkaError);
        }
      } catch (backgroundError) {
        console.error('⚠️ Background notifications failed:', backgroundError);
      }
    });

    return NextResponse.json({
      conversation: formatConversation(newConversation),
      isExisting: false,
    });

  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        console.log('⚠️ Unique constraint violation - conversation likely exists');
        return NextResponse.json(
          { error: 'Conversation already exists between these participants' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create conversation. Please try again.' },
      { status: 500 }
    );
  }
}
