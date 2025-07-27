// ==========================================
// UNREAD COUNTS API - FACEBOOK MESSENGER STYLE
// ==========================================
// Real-time unread message counts with Redis caching

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cacheOrFetch, setCache, deleteCache, checkRateLimit } from '@/lib/cache';

// GET /api/messages/unread-counts - Get unread message counts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting check
    const rateLimit = await checkRateLimit(`unread:${session.user.id}`, 300, 60); // 300/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const includeZero = searchParams.get('includeZero') === 'true';

    if (conversationId) {
      // Get unread count for specific conversation
      const unreadCount = await cacheOrFetch(
        `conversation:${conversationId}:unread:${session.user.id}`,
        async () => {
          // Verify user is participant
          const participant = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId: session.user.id,
              isHidden: false,
            }
          });

          if (!participant) {
            return null;
          }

          return await prisma.message.count({
            where: {
              conversationId,
              isDeleted: false,
              senderId: { not: session.user.id },
              reads: {
                none: {
                  userId: session.user.id
                }
              }
            }
          });
        },
        300 // 5 minutes TTL
      );

      if (unreadCount === null) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        conversationId,
        unreadCount,
        timestamp: new Date().toISOString()
      });
    }

    // Get unread counts for all user's conversations
    const unreadCounts = await cacheOrFetch(
      `user:${session.user.id}:unread_counts`,
      async () => {
        // Get all user's conversations
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: session.user.id,
                isHidden: false,
              }
            }
          },
          select: {
            id: true,
            title: true,
            type: true,
            isGroup: true,
            lastActivity: true
          }
        });

        // Get unread counts for each conversation
        const unreadData = await Promise.all(
          conversations.map(async (conv) => {
            const unreadCount = await prisma.message.count({
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
            });

            return {
              conversationId: conv.id,
              title: conv.title,
              type: conv.type,
              isGroup: conv.isGroup,
              unreadCount,
              lastActivity: conv.lastActivity
            };
          })
        );

        // Filter out zero counts if requested
        return includeZero 
          ? unreadData 
          : unreadData.filter(item => item.unreadCount > 0);
      },
      180 // 3 minutes TTL
    );

    // Calculate total unread count
    const totalUnread = unreadCounts.reduce((sum, item) => sum + item.unreadCount, 0);

    return NextResponse.json({
      totalUnread,
      conversations: unreadCounts,
      timestamp: new Date().toISOString(),
      userId: session.user.id
    });

  } catch (error) {
    console.error('Unread counts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/unread-counts - Update unread counts (mark as read)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for updates
    const rateLimit = await checkRateLimit(`unread_update:${session.user.id}`, 100, 60); // 100/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { conversationId, action = 'mark_all_read' } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
        isHidden: false,
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    switch (action) {
      case 'mark_all_read':
        // Get all unread messages in conversation
        const unreadMessages = await prisma.message.findMany({
          where: {
            conversationId,
            isDeleted: false,
            senderId: { not: session.user.id },
            reads: {
              none: {
                userId: session.user.id
              }
            }
          },
          select: { id: true }
        });

        if (unreadMessages.length > 0) {
          // Mark all as read
          await prisma.messageRead.createMany({
            data: unreadMessages.map(msg => ({
              messageId: msg.id,
              conversationId,
              userId: session.user.id,
              readAt: new Date(),
              deliveredAt: new Date(),
            })),
            skipDuplicates: true
          });

          // Invalidate caches
          await deleteCache(`conversation:${conversationId}:unread:${session.user.id}`);
          await deleteCache(`user:${session.user.id}:unread_counts`);

          // Emit real-time update via Socket.IO emitter
          try {
            const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
            const socketEmitter = SocketIOEmitter.getInstance();
            
            await socketEmitter.emitToRoom(`conversation:${conversationId}`, 'messages:read', {
              messageIds: unreadMessages.map(m => m.id),
              userId: session.user.id,
              userName: session.user.name || 'Someone',
              conversationId,
              timestamp: new Date().toISOString()
            });
          } catch (realtimeError) {
            console.warn('Failed to emit unread update:', realtimeError);
          }
        }

        return NextResponse.json({ 
          success: true, 
          markedAsRead: unreadMessages.length,
          conversationId,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Unread counts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/messages/unread-counts - Reset or update specific counts
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, conversationIds } = await request.json();

    switch (action) {
      case 'reset_all':
        // Reset all unread counts for user
        await deleteCache(`user:${session.user.id}:unread_counts`);
        
        // Also clear individual conversation caches
        if (conversationIds && Array.isArray(conversationIds)) {
          for (const convId of conversationIds) {
            await deleteCache(`conversation:${convId}:unread:${session.user.id}`);
          }
        }

        return NextResponse.json({ 
          success: true, 
          action: 'reset_all',
          timestamp: new Date().toISOString()
        });

      case 'refresh':
        // Force refresh of unread counts cache
        await deleteCache(`user:${session.user.id}:unread_counts`);
        
        // Recalculate fresh counts
        const freshCounts = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: session.user.id,
                isHidden: false,
              }
            }
          },
          include: {
            _count: {
              select: {
                messages: {
                  where: {
                    isDeleted: false,
                    senderId: { not: session.user.id },
                    reads: {
                      none: {
                        userId: session.user.id
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const refreshedCounts = freshCounts.map(conv => ({
          conversationId: conv.id,
          unreadCount: conv._count.messages || 0,
          title: conv.title,
          type: conv.type
        })).filter(item => item.unreadCount > 0);

        // Cache the fresh data
        await setCache(
          `user:${session.user.id}:unread_counts`,
          refreshedCounts,
          180 // 3 minutes
        );

        return NextResponse.json({
          success: true,
          action: 'refresh',
          totalUnread: refreshedCounts.reduce((sum, item) => sum + item.unreadCount, 0),
          conversations: refreshedCounts,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Unread counts PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}