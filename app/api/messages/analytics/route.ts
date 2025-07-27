import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`analytics:${session.user.id}`, 20, 60); // 20/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const messageId = url.searchParams.get('messageId');
    const timeframe = url.searchParams.get('timeframe') || '7d'; // 1d, 7d, 30d, 90d

    // Calculate date range based on timeframe
    const now = new Date();
    const timeframeMap = {
      '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    };
    const startDate = timeframeMap[timeframe as keyof typeof timeframeMap] || timeframeMap['7d'];

    if (messageId) {      // Get analytics for a specific message
      const analytics = await prisma.messageAnalytics.findUnique({
        where: { messageId }
      });

      if (!analytics) {
        return NextResponse.json(
          { error: 'Message analytics not found' },
          { status: 404 }
        );
      }

      // Verify user has access to this message's conversation
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              participants: {
                where: { userId: session.user.id }
              }
            }
          }
        }
      });

      if (!message || message.conversation.participants.length === 0) {
        return NextResponse.json(
          { error: 'Access denied to this message' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        analytics: {
          messageId: analytics.messageId,
          conversationId: analytics.conversationId,
          totalReads: analytics.totalReads,
          totalReactions: analytics.totalReactions,
          totalReplies: analytics.totalReplies,
          avgResponseTime: analytics.avgResponseTime,
          engagementScore: analytics.engagementScore,
          popularityScore: analytics.popularityScore,
          calculatedAt: analytics.calculatedAt,
          updatedAt: analytics.updatedAt,
        }
      });
    }

    if (conversationId) {
      // Verify user has access to this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: { userId: session.user.id }
          }
        }
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }

      // Get conversation analytics
      const analytics = await prisma.messageAnalytics.findMany({
        where: {
          conversationId,
          updatedAt: {
            gte: startDate
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Calculate aggregate metrics
      const totalMessages = await prisma.message.count({
        where: {
          conversationId,
          createdAt: {
            gte: startDate
          }
        }
      });

      const totalReads = analytics.reduce((sum, item) => sum + item.totalReads, 0);
      const totalReactions = analytics.reduce((sum, item) => sum + item.totalReactions, 0);
      const totalReplies = analytics.reduce((sum, item) => sum + item.totalReplies, 0);
      const avgEngagementScore = analytics.length > 0 
        ? analytics.reduce((sum, item) => sum + (item.engagementScore || 0), 0) / analytics.length 
        : 0;

      // Get top performing messages
      const topMessages = analytics
        .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
        .slice(0, 10);

      // Get activity over time (daily breakdown)
      const dailyActivity = await prisma.message.groupBy({
        by: ['createdAt'],
        where: {
          conversationId,
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        }
      });

      return NextResponse.json({
        success: true,
        analytics: {
          conversationId,
          timeframe,
          period: {
            startDate,
            endDate: now
          },
          summary: {
            totalMessages,
            totalReads,
            totalReactions,
            totalReplies,
            avgEngagementScore: Math.round(avgEngagementScore * 100) / 100
          },
          topMessages: topMessages.map(msg => ({
            messageId: msg.messageId,
            engagementScore: msg.engagementScore,
            popularityScore: msg.popularityScore,
            totalReads: msg.totalReads,
            totalReactions: msg.totalReactions,
            totalReplies: msg.totalReplies
          })),
          dailyActivity: dailyActivity.map(day => ({
            date: day.createdAt,
            messageCount: day._count.id
          }))
        }
      });
    }

    // Get user's overall messaging analytics
    const userConversations = await prisma.conversationParticipant.findMany({
      where: { userId: session.user.id },
      select: { conversationId: true }
    });

    const conversationIds = userConversations.map(c => c.conversationId);

    const userMessageCount = await prisma.message.count({
      where: {
        senderId: session.user.id,
        createdAt: {
          gte: startDate
        }
      }
    });

    const userReceivedCount = await prisma.message.count({
      where: {
        conversationId: {
          in: conversationIds
        },
        senderId: {
          not: session.user.id
        },
        createdAt: {
          gte: startDate
        }
      }
    });

    const userReactionsGiven = await prisma.messageReaction.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate
        }
      }
    });

    const userReactionsReceived = await prisma.messageReaction.count({
      where: {
        message: {
          senderId: session.user.id
        },
        createdAt: {
          gte: startDate
        }
      }
    });

    return NextResponse.json({
      success: true,
      analytics: {
        userId: session.user.id,
        timeframe,
        period: {
          startDate,
          endDate: now
        },
        summary: {
          messagesSent: userMessageCount,
          messagesReceived: userReceivedCount,
          reactionsGiven: userReactionsGiven,
          reactionsReceived: userReactionsReceived,
          totalConversations: conversationIds.length
        }
      }
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`analytics_update:${session.user.id}`, 10, 60); // 10/minute
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { messageId, conversationId } = await request.json();

    if (!messageId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, conversationId' },
        { status: 400 }
      );
    }

    // Verify user has access to this message's conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: session.user.id }
            }
          }
        },
        reactions: true,
        reads: true,
        replies: true
      }
    });

    if (!message || message.conversation.participants.length === 0) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate analytics metrics
    const totalReads = message.reads.length;
    const totalReactions = message.reactions.length;
    const totalReplies = message.replies.length;

    // Calculate engagement score (simple formula)
    const engagementScore = (totalReactions * 3) + (totalReplies * 2) + totalReads;

    // Calculate popularity score based on time since creation
    const hoursOld = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    const popularityScore = hoursOld > 0 ? engagementScore / Math.log(hoursOld + 1) : engagementScore;

    // Calculate average response time for replies
    let avgResponseTime = null;
    if (totalReplies > 0) {
      const responseTimes = message.replies.map(reply => 
        (reply.createdAt.getTime() - message.createdAt.getTime()) / (1000 * 60) // minutes
      );
      avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    // Upsert analytics record
    const analytics = await prisma.messageAnalytics.upsert({
      where: { messageId },
      update: {
        totalReads,
        totalReactions,
        totalReplies,
        avgResponseTime,
        engagementScore,
        popularityScore,
        updatedAt: new Date()
      },
      create: {
        messageId,
        conversationId,
        totalReads,
        totalReactions,
        totalReplies,
        avgResponseTime,
        engagementScore,
        popularityScore
      }
    });

    return NextResponse.json({
      success: true,
      analytics: {
        messageId: analytics.messageId,
        conversationId: analytics.conversationId,
        totalReads: analytics.totalReads,
        totalReactions: analytics.totalReactions,
        totalReplies: analytics.totalReplies,
        avgResponseTime: analytics.avgResponseTime,
        engagementScore: analytics.engagementScore,
        popularityScore: analytics.popularityScore,
        updatedAt: analytics.updatedAt
      }
    });

  } catch (error) {
    console.error('Analytics Update API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update analytics data' },
      { status: 500 }
    );
  }
}
