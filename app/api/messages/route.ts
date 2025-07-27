import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { cacheOrFetch, setCache, deleteCache, checkRateLimit } from '@/lib/cache'
import { publishEvent } from '@/lib/kafka'

// ==========================================
// PRODUCTION-READY FACEBOOK-STYLE MESSAGING API
// ==========================================
// Enhanced with Redis caching and Kafka event streaming

// Validation Schemas
const createConversationSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
  participantIds: z.array(z.string()).min(1),
  title: z.string().optional(),
  description: z.string().optional(),
})

const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'STICKER', 'EMOJI_REACTION']).default('TEXT'),
  mediaUrls: z.array(z.string()).optional().nullable(),
  replyToId: z.string().optional().nullable(),
  mentions: z.array(z.string()).optional().nullable(),
})

const reactionSchema = z.object({
  messageId: z.string(),
  emoji: z.string(),
  reaction: z.string(),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Fetch user data for cross-schema relations
async function fetchUserData(userIds: string[]) {
  if (userIds.length === 0) return []
  
  return await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      profilePictureUrl: true,
      username: true,
    }
  })
}

// Emit real-time event via Kafka (replacing direct Socket.IO calls)
async function publishRealtimeEvent(eventType: string, data: any, metadata: any = {}) {
  try {
    await publishEvent('messages', {
      type: eventType,
      timestamp: new Date().toISOString(),
      userId: metadata.userId,
      conversationId: data.conversationId,
      data,
      metadata
    })
  } catch (error) {
    console.warn(`Kafka event publish failed for ${eventType}:`, error)
    // Fallback to direct Socket.IO call if Kafka fails
    await emitRealtimeEventFallback(eventType, data, metadata.rooms)
  }
}

// Fallback to direct Socket.IO (for reliability)
async function emitRealtimeEventFallback(event: string, data: any, rooms?: string[]) {
  try {
    const socketUrl = process.env.SOCKETIO_SERVER_URL || 'http://localhost:3001'
    const response = await fetch(`${socketUrl}/api/emit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SOCKETIO_API_KEY || 'dev-key'}`
      },
      body: JSON.stringify({ 
        event, 
        data, 
        rooms: rooms || [data.conversationId]
      })
    })
    
    if (!response.ok) {
      console.warn(`Failed to emit real-time event ${event}:`, await response.text())
    }
  } catch (error) {
    console.warn(`Real-time event emission failed for ${event}:`, error)
    // Don't fail the API request if real-time fails
  }
}

// Cache invalidation helper
async function invalidateConversationCaches(conversationId: string, participantIds: string[]) {
  try {
    // Invalidate conversation-specific caches
    await deleteCache(`conversation:${conversationId}:messages:recent`)
    await deleteCache(`conversation:${conversationId}:metadata`)
    
    // Invalidate participant conversation lists
    for (const userId of participantIds) {
      await deleteCache(`user:${userId}:conversations`)
    }
  } catch (error) {
    console.warn('Cache invalidation failed:', error)
  }
}

// ==========================================
// GET - Fetch Conversations & Messages with Redis Caching
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting check
    const rateLimit = await checkRateLimit(`api:${session.user.id}`, 1000, 3600) // 1000/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const conversationId = searchParams.get('conversationId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    switch (action) {
      case 'conversations':
        // Cache conversations list for 5 minutes
        const conversations = await cacheOrFetch(
          `user:${session.user.id}:conversations`,
          async () => {
            const convs = await prisma.conversation.findMany({
              where: {
                participants: {
                  some: {
                    userId: session.user.id,
                    isHidden: false,
                  }
                }
              },
              include: {
                participants: true,
                messages: {
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                  select: {
                    id: true,
                    content: true,
                    messageType: true,
                    createdAt: true,
                    senderId: true,
                    isDeleted: true,
                  }
                }
              },
              orderBy: { lastActivity: 'desc' }
            })

            // Get all participant user IDs
            const allUserIds = convs.flatMap(conv => 
              conv.participants.map(p => p.userId)
            )
            const uniqueUserIds = [...new Set(allUserIds)]
            const userData = await fetchUserData(uniqueUserIds)
            const userMap = new Map(userData.map(user => [user.id, user]))

            // Get unread count for each conversation (cached separately)
            const conversationsWithData = await Promise.all(
              convs.map(async (conv) => {
                const unreadCount = await cacheOrFetch(
                  `conversation:${conv.id}:unread:${session.user.id}`,
                  async () => {
                    return await prisma.message.count({
                      where: {
                        conversationId: conv.id,
                        isDeleted: false,
                        senderId: { not: session.user.id },
                        reads: {
                          none: {
                            userId: session.user.id
                          }
                        }
                      }
                    })
                  },
                  300 // 5 minutes
                )

                return {
                  ...conv,
                  participants: conv.participants.map(p => ({
                    ...p,
                    user: userMap.get(p.userId) || null
                  })),
                  lastMessage: conv.messages[0] || null,
                  unreadCount
                }
              })
            )

            return conversationsWithData
          },
          300 // 5 minutes TTL
        )

        return NextResponse.json({ conversations })

      case 'messages':
        if (!conversationId) {
          return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
        }

        // Verify user is participant (cached)
        const userConversation = await cacheOrFetch(
          `conversation:${conversationId}:participant:${session.user.id}`,
          async () => {
            return await prisma.conversation.findFirst({
              where: {
                id: conversationId,
                participants: {
                  some: { userId: session.user.id }
                }
              }
            })
          },
          1800 // 30 minutes
        )

        if (!userConversation) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }        // Cache recent messages (last 50) for 10 minutes
        const cacheKey = page === 1 
          ? `conversation:${conversationId}:messages:recent`
          : `conversation:${conversationId}:messages:page:${page}`

        const messages = await cacheOrFetch(
          cacheKey,
          async () => {
            return await prisma.message.findMany({
              where: {
                conversationId,
                isDeleted: false,
              },
              include: {
                replyTo: {
                  select: {
                    id: true,
                    content: true,
                    senderId: true,
                  }
                },
                reactions: true,
                reads: true
              },
              orderBy: { createdAt: 'asc' },
              skip: offset,
              take: limit
            })
          },
          page === 1 ? 600 : 3600 // Recent messages: 10min, older: 1hour
        )

        // Get all sender IDs and reaction user IDs
        const messageUserIds = messages.flatMap(msg => [
          msg.senderId,
          ...(msg.reactions?.map(r => r.userId) || []),
          ...(msg.reads?.map(r => r.userId) || [])
        ])
        const uniqueMessageUserIds = [...new Set(messageUserIds)]
        const messageUserData = await fetchUserData(uniqueMessageUserIds)
        const messageUserMap = new Map(messageUserData.map(user => [user.id, user]))

        // Enhance messages with user data
        const messagesWithUserData = messages.map(msg => ({
          ...msg,
          sender: messageUserMap.get(msg.senderId) || null,
          reactions: msg.reactions?.map(reaction => ({
            ...reaction,
            user: messageUserMap.get(reaction.userId) || null
          })) || [],
          readBy: msg.reads?.map(read => ({
            ...read,
            user: messageUserMap.get(read.userId) || null
          })) || []
        }))

        return NextResponse.json({ messages: messagesWithUserData })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ==========================================
// POST - Create Conversation & Send Message with Caching & Events
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    console.log('🔐 Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id
    })
    
    if (!session?.user?.id) {
      console.error('❌ Authentication failed: No valid session or user ID')
      
      // Enhanced authentication debugging
      console.log('🔍 Request headers:', {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization'),
        userAgent: request.headers.get('user-agent')
      })
      
      return NextResponse.json({ 
        error: 'Unauthorized', 
        debug: 'Session validation failed - please refresh and login again',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Rate limiting for message sending
    const rateLimit = await checkRateLimit(`messages:${session.user.id}`, 30, 60) // 30/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many messages sent',
        resetTime: rateLimit.resetTime
      }, { status: 429 })
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    console.log('🎯 Action:', action)

    switch (action) {
      case 'conversation':
        // Create new conversation
        const conversationData = createConversationSchema.parse(body)
        
        // Add current user to participants
        const allParticipants = [...new Set([session.user.id, ...conversationData.participantIds])]
        
        // For direct messages, check if conversation already exists (with caching)
        if (conversationData.type === 'DIRECT' && allParticipants.length === 2) {
          const cacheKey = `direct_conversation:${allParticipants.sort().join(':')}`
          const existingConversation = await cacheOrFetch(
            cacheKey,
            async () => {
              return await prisma.conversation.findFirst({
                where: {
                  type: 'DIRECT',
                  participants: {
                    every: {
                      userId: { in: allParticipants }
                    }
                  }
                },
                include: {
                  participants: true
                }
              })            },
            3600 // 1 hour
          )
          
          if (existingConversation && existingConversation.participants.length === 2) {
            // Invalidate participants' conversation caches since they might see this conversation
            await invalidateConversationCaches(existingConversation.id, allParticipants)
            
            // Get user data for participants
            const participantUserData = await fetchUserData(
              existingConversation.participants.map(p => p.userId)
            )
            const userMap = new Map(participantUserData.map(user => [user.id, user]))

            const conversationWithUserData = {
              ...existingConversation,
              participants: existingConversation.participants.map(p => ({
                ...p,
                user: userMap.get(p.userId) || null
              }))
            }

            return NextResponse.json({ conversation: conversationWithUserData })
          }
        }

        // Create new conversation
        const newConversation = await prisma.conversation.create({
          data: {
            type: conversationData.type,
            title: conversationData.title,
            description: conversationData.description,
            isGroup: conversationData.type === 'GROUP',
            participants: {
              create: allParticipants.map(userId => ({
                userId,
                isAdmin: userId === session.user.id,
                joinedAt: new Date(),
              }))
            }
          },
          include: {
            participants: true
          }
        })

        // Invalidate conversation caches for all participants
        await invalidateConversationCaches(newConversation.id, allParticipants)

        // Cache the new conversation metadata
        await setCache(
          `conversation:${newConversation.id}:metadata`,
          newConversation,
          1800 // 30 minutes
        )        // Publish conversation created event via Kafka
        await publishRealtimeEvent('CONVERSATION_CREATED', newConversation, {
          userId: session.user.id,
          rooms: allParticipants.map(id => `user:${id}`)
        })

        // Get user data for participants
        const newParticipantUserData = await fetchUserData(
          newConversation.participants.map(p => p.userId)
        )
        const newUserMap = new Map(newParticipantUserData.map(user => [user.id, user]))

        const conversationWithUserData = {
          ...newConversation,
          participants: newConversation.participants.map(p => ({
            ...p,
            user: newUserMap.get(p.userId) || null
          }))
        }

        return NextResponse.json({ conversation: conversationWithUserData })

      case 'message':
        // Send message with Redis caching and Kafka events
        console.log('💬 Processing message send request')
        console.log('📝 Request body:', JSON.stringify(body, null, 2))
        
        let messageData;
        try {
          messageData = sendMessageSchema.parse(body)
          console.log('✅ Message data validated:', messageData)
        } catch (error) {
          console.error('❌ Validation error:', error)
          return NextResponse.json({ 
            error: 'Invalid message data', 
            details: error instanceof Error ? error.message : 'Unknown validation error',
            receivedData: body
          }, { status: 400 })
        }
        
        // Verify user is participant in conversation (with caching)
        const targetConversation = await cacheOrFetch(
          `conversation:${messageData.conversationId}:participants`,
          async () => {
            console.log('🔍 Checking conversation access for:', messageData.conversationId)
            return await prisma.conversation.findFirst({
              where: {
                id: messageData.conversationId,
                participants: {
                  some: { userId: session.user.id }
                }
              },
              include: {
                participants: true
              }
            })
          },
          1800 // 30 minutes
        )

        if (!targetConversation) {
          console.error('❌ Conversation not found or access denied:', messageData.conversationId)
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        console.log('✅ Conversation access verified')

        // Create message with enhanced error handling
        console.log('📝 Creating message in database')
        const newMessage = await prisma.message.create({
          data: {
            conversationId: messageData.conversationId,
            senderId: session.user.id,
            content: messageData.content,
            messageType: messageData.messageType,
            mediaUrls: messageData.mediaUrls || [],
            replyToId: messageData.replyToId || undefined,
            mentions: messageData.mentions || [],
          },
          include: {
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true,
              }
            }
          }
        })

        console.log('✅ Message created successfully:', newMessage.id)

        // Update conversation last activity
        await prisma.conversation.update({
          where: { id: messageData.conversationId },
          data: { lastActivity: new Date() }
        })

        console.log('✅ Conversation last activity updated')

        // Invalidate relevant caches
        const participantIds = targetConversation.participants.map(p => p.userId)
        await invalidateConversationCaches(messageData.conversationId, participantIds)

        console.log('✅ Caches invalidated')

        // Update unread counts for all participants except sender
        for (const participant of targetConversation.participants) {
          if (participant.userId !== session.user.id) {
            await deleteCache(`conversation:${messageData.conversationId}:unread:${participant.userId}`)
          }
        }

        console.log('✅ Unread counts updated')

        // Cache the new message
        await setCache(
          `message:${newMessage.id}`,
          newMessage,
          21600 // 6 hours
        )

        console.log('✅ Message cached')

        // Get sender data
        const senderData = await fetchUserData([session.user.id])
        const messageWithSender = {
          ...newMessage,
          sender: senderData[0] || null
        }

        console.log('✅ Sender data attached')

        // CRITICAL: Publish message event via Kafka with enhanced error handling
        try {
          console.log('📤 Publishing to Kafka...')
          await publishRealtimeEvent('MESSAGE_SENT', messageWithSender, {
            userId: session.user.id,
            conversationId: messageData.conversationId,
            rooms: [`conversation:${messageData.conversationId}`]
          })
          console.log('✅ Kafka event published successfully')
        } catch (kafkaError) {
          console.error('❌ Kafka publish failed:', kafkaError)
          // Don't fail the request if Kafka fails, but log it
        }

        // Publish notification events for mentions
        if (messageData.mentions && messageData.mentions.length > 0) {
          for (const mentionedUserId of messageData.mentions) {
            try {
              await publishRealtimeEvent('MENTION_NOTIFICATION', {
                messageId: newMessage.id,
                conversationId: messageData.conversationId,
                mentionedUserId,
                senderName: session.user.name || 'Someone',
                content: messageData.content?.substring(0, 100) || 'mentioned you'
              }, {
                userId: session.user.id,
                rooms: [`user:${mentionedUserId}`]
              })
            } catch (mentionError) {
              console.error('❌ Mention notification failed:', mentionError)
            }
          }
          console.log('✅ Mention notifications sent')
        }

        console.log('🎉 Message processing completed successfully')
        return NextResponse.json({ 
          message: messageWithSender,
          success: true,
          timestamp: new Date().toISOString()
        })

      case 'reaction':
        // Add/remove message reaction with caching and events
        const reactionData = reactionSchema.parse(body)
        
        // Rate limiting for reactions
        const reactionRateLimit = await checkRateLimit(`reactions:${session.user.id}`, 100, 60) // 100/minute
        if (!reactionRateLimit.allowed) {
          return NextResponse.json({ 
            error: 'Too many reactions',
            resetTime: reactionRateLimit.resetTime
          }, { status: 429 })
        }
        
        // Verify message exists and user can access it (with caching)
        const message = await cacheOrFetch(
          `message:${reactionData.messageId}:access:${session.user.id}`,
          async () => {
            return await prisma.message.findFirst({
              where: {
                id: reactionData.messageId,
                conversation: {
                  participants: {
                    some: { userId: session.user.id }
                  }
                }
              }
            })
          },
          1800 // 30 minutes
        )

        if (!message) {
          return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        // Check if reaction already exists
        const existingReaction = await prisma.messageReaction.findFirst({
          where: {
            messageId: reactionData.messageId,
            userId: session.user.id,
            emoji: reactionData.emoji,
          }        })

        if (existingReaction) {
          // Remove reaction
          await prisma.messageReaction.delete({
            where: { id: existingReaction.id }
          })

          // Invalidate message cache
          await deleteCache(`message:${reactionData.messageId}`)
          await deleteCache(`conversation:${message.conversationId}:messages:recent`)

          // Publish reaction removed event via Kafka
          await publishRealtimeEvent('REACTION_REMOVED', {
            messageId: reactionData.messageId,
            emoji: reactionData.emoji,
            userId: session.user.id,
            conversationId: message.conversationId
          }, {
            userId: session.user.id,
            rooms: [`conversation:${message.conversationId}`]
          })

          return NextResponse.json({ success: true, action: 'removed' })
        } else {
          // Add reaction
          const reaction = await prisma.messageReaction.create({
            data: {
              messageId: reactionData.messageId,
              userId: session.user.id,
              emoji: reactionData.emoji,
              reaction: reactionData.reaction,
            }
          })

          // Invalidate message cache
          await deleteCache(`message:${reactionData.messageId}`)
          await deleteCache(`conversation:${message.conversationId}:messages:recent`)

          // Get user data for reaction
          const reactionUserData = await fetchUserData([session.user.id])
          const reactionWithUser = {
            ...reaction,
            user: reactionUserData[0] || null
          }

          // Publish reaction added event via Kafka
          await publishRealtimeEvent('REACTION_ADDED', {
            messageId: reactionData.messageId,
            reaction: reactionWithUser,
            conversationId: message.conversationId
          }, {
            userId: session.user.id,
            rooms: [`conversation:${message.conversationId}`]          })

          return NextResponse.json({ success: true, action: 'added', reaction: reactionWithUser })
        }

      case 'remove_reaction':
        // Remove message reaction specifically
        const removeReactionData = z.object({
          messageId: z.string(),
          emoji: z.string(),
        }).parse(body)
        
        // Rate limiting for reactions
        const removeReactionRateLimit = await checkRateLimit(`reactions:${session.user.id}`, 100, 60) // 100/minute
        if (!removeReactionRateLimit.allowed) {
          return NextResponse.json({ 
            error: 'Too many reactions',
            resetTime: removeReactionRateLimit.resetTime
          }, { status: 429 })
        }``
        
        // Verify message exists and user can access it
        const removeReactionMessage = await cacheOrFetch(
          `message:${removeReactionData.messageId}:access:${session.user.id}`,
          async () => {
            return await prisma.message.findFirst({
              where: {
                id: removeReactionData.messageId,
                conversation: {
                  participants: {
                    some: { userId: session.user.id }
                  }
                }
              }
            })
          },
          1800 // 30 minutes
        )

        if (!removeReactionMessage) {
          return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        // Remove reaction
        const deletedReaction = await prisma.messageReaction.deleteMany({
          where: {
            messageId: removeReactionData.messageId,
            userId: session.user.id,
            emoji: removeReactionData.emoji,
          }
        })

        // Invalidate message cache
        await deleteCache(`message:${removeReactionData.messageId}`)
        await deleteCache(`conversation:${removeReactionMessage.conversationId}:messages:recent`)

        // Publish reaction removed event via Kafka
        await publishRealtimeEvent('REACTION_REMOVED', {
          messageId: removeReactionData.messageId,
          emoji: removeReactionData.emoji,
          userId: session.user.id,
          conversationId: removeReactionMessage.conversationId
        }, {
          userId: session.user.id,
          rooms: [`conversation:${removeReactionMessage.conversationId}`]
        })

        return NextResponse.json({ success: true, action: 'removed', deletedCount: deletedReaction.count })

      case 'typing_start':
        // Handle typing start with Redis caching
        const typingStartData = z.object({
          conversationId: z.string(),
        }).parse(body)
        
        // Verify user is participant (with caching)
        const typingStartConversation = await cacheOrFetch(
          `conversation:${typingStartData.conversationId}:participant:${session.user.id}`,
          async () => {
            return await prisma.conversation.findFirst({
              where: {
                id: typingStartData.conversationId,
                participants: {
                  some: { userId: session.user.id }
                }
              }
            })
          },
          1800 // 30 minutes
        )

        if (!typingStartConversation) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // Set typing indicator in Redis with 5-second TTL
        await setCache(`typing:${typingStartData.conversationId}:${session.user.id}`, true, 5)
        
        // Publish typing start event via Kafka
        await publishRealtimeEvent('TYPING_START', {
          conversationId: typingStartData.conversationId,
          userId: session.user.id,
          username: session.user.name || 'Someone'
        }, {
          userId: session.user.id,
          rooms: [`conversation:${typingStartData.conversationId}`]
        })

        return NextResponse.json({ success: true })

      case 'typing_stop':
        // Handle typing stop
        const typingStopData = z.object({
          conversationId: z.string(),
        }).parse(body)
        
        // Verify user is participant (with caching)
        const typingStopConversation = await cacheOrFetch(
          `conversation:${typingStopData.conversationId}:participant:${session.user.id}`,
          async () => {
            return await prisma.conversation.findFirst({
              where: {
                id: typingStopData.conversationId,
                participants: {
                  some: { userId: session.user.id }
                }
              }
            })
          },
          1800 // 30 minutes
        )

        if (!typingStopConversation) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // Remove typing indicator
        await deleteCache(`typing:${typingStopData.conversationId}:${session.user.id}`)
        
        // Publish typing stop event via Kafka
        await publishRealtimeEvent('TYPING_STOP', {
          conversationId: typingStopData.conversationId,
          userId: session.user.id
        }, {
          userId: session.user.id,
          rooms: [`conversation:${typingStopData.conversationId}`]
        })

        return NextResponse.json({ success: true })

      case 'mark_read':
        // Mark messages as read with cache invalidation
        const markReadData = z.object({
          conversationId: z.string(),
          messageIds: z.array(z.string()),
        }).parse(body)
        
        if (markReadData.messageIds.length === 0) {
          return NextResponse.json({ error: 'Message IDs required' }, { status: 400 })
        }

        // Get messages and verify access
        const messagesToRead = await prisma.message.findMany({
          where: {
            id: { in: markReadData.messageIds },
            conversationId: markReadData.conversationId,
            conversation: {
              participants: {
                some: { userId: session.user.id }
              }
            }
          }
        })

        if (messagesToRead.length === 0) {
          return NextResponse.json({ error: 'No accessible messages found' }, { status: 404 })
        }

        // Mark as read (createMany with skipDuplicates handles race conditions)
        const readReceipts = await prisma.messageRead.createMany({
          data: messagesToRead.map(msg => ({
            messageId: msg.id,
            conversationId: msg.conversationId,
            userId: session.user.id,
            readAt: new Date(),
          })),
          skipDuplicates: true
        })

        // Invalidate unread count cache for this user
        await deleteCache(`conversation:${markReadData.conversationId}:unread:${session.user.id}`)
        await deleteCache(`conversation:${markReadData.conversationId}:messages:recent`)

        // Publish read receipts event via Kafka
        await publishRealtimeEvent('MESSAGES_READ', {
          messageIds: markReadData.messageIds,
          userId: session.user.id,
          userName: session.user.name || 'Someone',
          conversationId: markReadData.conversationId
        }, {
          userId: session.user.id,
          rooms: [`conversation:${markReadData.conversationId}`]
        })

        return NextResponse.json({ success: true, readCount: readReceipts.count })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ==========================================
// PATCH - Edit Message with Caching & Events
// ==========================================
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for message edits
    const editRateLimit = await checkRateLimit(`edit:${session.user.id}`, 20, 60) // 20/minute
    if (!editRateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many edits',
        resetTime: editRateLimit.resetTime
      }, { status: 429 })
    }

    const { messageId, content } = await request.json()
    
    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'Message ID and content required' }, { status: 400 })
    }

    // Get message and verify ownership
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        isDeleted: false,
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Store original content before edit
    const originalContent = message.originalContent || message.content

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        originalContent,
        isEdited: true,
        editedAt: new Date(),
      }
    })

    // Invalidate message caches
    await deleteCache(`message:${messageId}`)
    await deleteCache(`conversation:${message.conversationId}:messages:recent`)

    // Get sender data
    const senderData = await fetchUserData([session.user.id])
    const messageWithSender = {
      ...updatedMessage,
      sender: senderData[0] || null
    }

    // Publish message edited event via Kafka
    await publishRealtimeEvent('MESSAGE_EDITED', messageWithSender, {
      userId: session.user.id,
      conversationId: message.conversationId,
      rooms: [`conversation:${message.conversationId}`]
    })

    return NextResponse.json({ message: messageWithSender })
  } catch (error) {
    console.error('Messages PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ==========================================
// DELETE - Delete Message
// ==========================================
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    // Get message and verify ownership
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        isDeleted: false,
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }    // Soft delete message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
        content: null, // Clear content for privacy
      }
    })

    // Invalidate message caches
    await deleteCache(`message:${messageId}`)
    await deleteCache(`conversation:${message.conversationId}:messages:recent`)

    // Publish message deleted event via Kafka
    await publishRealtimeEvent('MESSAGE_DELETED', {
      messageId,
      conversationId: message.conversationId,
      deletedBy: session.user.id
    }, {
      userId: session.user.id,
      conversationId: message.conversationId,
      rooms: [`conversation:${message.conversationId}`]
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Messages DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
