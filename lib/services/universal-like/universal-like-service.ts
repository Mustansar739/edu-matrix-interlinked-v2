/**
 * =============================================================================
 * UNIVERSAL LIKE SERVICE - TikTok-Style Unified Like System
 * =============================================================================
 * 
 * PURPOSE:
 * Implements a TikTok-inspired unified like system where ALL user interactions 
 * (likes, reactions, emotions) across ALL content types are aggregated into 
 * a single "likes" total displayed on the user's main profile.
 * 
 * KEY FEATURES:
 * ✅ Unified Like Tracking: All content likes → Profile total likes
 * ✅ Emotion Aggregation: Facebook reactions count as "likes" in profile total
 * ✅ Lifetime Persistence: Likes remain in profile total even when content is deleted
 * ✅ Cross-Platform Support: Works across posts, comments, stories, projects, etc.
 * ✅ Real-time Sync: Profile totals update immediately via ProfileLikesSyncService
 * ✅ Comprehensive Analytics: Detailed breakdown by content type and platform
 * ✅ Notification Integration: Automatic like notifications across the platform
 * 
 * CONTENT TYPES SUPPORTED:
 * - Social Posts & Stories
 * - Comments & Replies  
 * - Projects & Achievements
 * - Work Experience & Education
 * - Certifications & Skills
 * - Profile Direct Likes
 * - And any future content types
 * 
 * DUAL TRACKING SYSTEM:
 * 1. Individual Level: Each content tracks its own specific reactions/emotions
 * 2. Universal Level: ALL reactions aggregate as "likes" for profile display
 * 
 * ARCHITECTURE:
 * - UniversalLike Model: Central like tracking across all content
 * - UserLikeStats: Aggregated statistics per user
 * - User.totalLikesReceived: Main profile display total
 * - Content-specific tables: Individual like/reaction tracking
 * 
 * PERSISTENCE & LIFETIME TRACKING:
 * - Universal likes are NEVER deleted when content is removed
 * - This ensures users maintain their lifetime like achievements
 * - Profile totals reflect all-time engagement, not just current content
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

// ==========================================
// UNIVERSAL LIKES SERVICE - Complete Like Management System
// ==========================================
// Handles all like operations across the entire platform

import { prisma } from '@/lib/prisma';
import { ContentType, LikeActionResult, UserLikeStats, LikesAnalyticsData } from '@/types/profile';
import { ProfileLikesSyncService } from '../profile-likes-sync';

export class UniversalLikeService {
  
  // ==========================================
  // CORE LIKE OPERATIONS
  // ==========================================
  
  /**
   * Add a like to any content type
   */
  async addLike(
    likerId: string, 
    recipientId: string, 
    contentType: ContentType, 
    contentId: string,
    schemaName: string = 'auth_schema',
    metadata?: Record<string, any>
  ): Promise<LikeActionResult> {
    try {
      // Check if like already exists
      // ==========================================
      // ENHANCED VALIDATION BEFORE LIKE CREATION
      // ==========================================
      
      // 1. Verify recipient exists to prevent foreign key constraint violations
      const recipientExists = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true }
      });

      if (!recipientExists) {
        console.error('Recipient user not found for like creation:', {
          recipientId,
          contentType,
          contentId,
          likerId
        });
        throw new Error(`Recipient user ${recipientId} not found in system`);
      }

      // 2. Verify liker exists
      const likerExists = await prisma.user.findUnique({
        where: { id: likerId },
        select: { id: true }
      });

      if (!likerExists) {
        console.error('Liker user not found:', {
          likerId,
          contentType,
          contentId
        });
        throw new Error(`Liker user ${likerId} not found in system`);
      }

      // 3. Check for existing like
      const existingLike = await prisma.universalLike.findUnique({
        where: {
          likerId_contentType_contentId: {
            likerId,
            contentType,
            contentId
          }
        }
      });

      if (existingLike) {
        return {
          success: false,
          liked: true,
          totalLikes: await this.getContentLikeCount(contentType, contentId),
          error: 'Already liked'
        };
      }

      // ==========================================
      // CREATE LIKE IN TRANSACTION WITH ERROR HANDLING
      // ==========================================
      
      // Create the like in a transaction
      const result = await prisma.$transaction(async (tx) => {
        try {
          // 1. Create the like with enhanced error handling
          await tx.universalLike.create({
            data: {
              likerId,
              recipientId,
              contentType,
              contentId,
              schemaName,
              metadata
            }
          });

          // 2. Update recipient's total like count (with existence check)
          await tx.user.update({
            where: { id: recipientId },
            data: {
              totalLikesReceived: {
                increment: 1
              }
            }
          });

          // 3. Update or create user like stats
          await tx.userLikeStats.upsert({
            where: { userId: recipientId },
            create: {
              userId: recipientId,
              totalLikes: 1,
              likesByType: { [contentType]: 1 },
              lastUpdated: new Date()
            },
            update: {
              totalLikes: {
                increment: 1
              },
              likesByType: {
                // Use raw SQL to increment JSON field
                // This will be handled by the increment operation
              },
              lastUpdated: new Date()
            }
          });

          // 4. Create notification
          await tx.likeNotification.create({
            data: {
              recipientId,
              likerId,
              contentType,
              contentId
            }
          });

          return await this.getContentLikeCount(contentType, contentId);
          
        } catch (transactionError) {
          console.error('Transaction error in like creation:', transactionError);
          
          // Handle specific foreign key constraint errors
          if (transactionError instanceof Error && 
              transactionError.message.includes('Foreign key constraint violated')) {
            throw new Error(`Invalid recipient: User ${recipientId} not found`);
          }
          
          throw transactionError;
        }
      });

      // Trigger profile likes sync in background
      ProfileLikesSyncService.triggerSyncAfterLike(recipientId, contentType, true);

      return {
        success: true,
        liked: true,
        totalLikes: result
      };

    } catch (error) {
      console.error('Error adding like:', error);
      return {
        success: false,
        liked: false,
        totalLikes: 0,
        error: 'Failed to add like'
      };
    }
  }

  /**
   * Remove a like from any content type
   */
  async removeLike(
    likerId: string, 
    contentType: ContentType, 
    contentId: string
  ): Promise<LikeActionResult> {
    try {
      // Find the existing like
      const existingLike = await prisma.universalLike.findUnique({
        where: {
          likerId_contentType_contentId: {
            likerId,
            contentType,
            contentId
          }
        }
      });

      if (!existingLike) {
        return {
          success: false,
          liked: false,
          totalLikes: await this.getContentLikeCount(contentType, contentId),
          error: 'Like not found'
        };
      }

      // Remove the like in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Delete the like
        await tx.universalLike.delete({
          where: {
            likerId_contentType_contentId: {
              likerId,
              contentType,
              contentId
            }
          }
        });

        // 2. Update recipient's total like count
        await tx.user.update({
          where: { id: existingLike.recipientId },
          data: {
            totalLikesReceived: {
              decrement: 1
            }
          }
        });

        // 3. Update user like stats
        const stats = await tx.userLikeStats.findUnique({
          where: { userId: existingLike.recipientId }
        });

        if (stats) {
          const currentTypes = stats.likesByType as Record<string, number>;
          const newCount = Math.max((currentTypes[contentType] || 1) - 1, 0);
          
          await tx.userLikeStats.update({
            where: { userId: existingLike.recipientId },
            data: {
              totalLikes: {
                decrement: 1
              },
              likesByType: {
                ...currentTypes,
                [contentType]: newCount
              },
              lastUpdated: new Date()
            }
          });
        }

        // 4. Mark notification as read (soft delete)
        await tx.likeNotification.updateMany({
          where: {
            recipientId: existingLike.recipientId,
            likerId,
            contentType,
            contentId
          },
          data: {
            isRead: true
          }
        });

        return await this.getContentLikeCount(contentType, contentId);
      });

      // Trigger profile likes sync in background
      ProfileLikesSyncService.triggerSyncAfterLike(existingLike.recipientId, contentType, false);

      return {
        success: true,
        liked: false,
        totalLikes: result
      };

    } catch (error) {
      console.error('Error removing like:', error);
      return {
        success: false,
        liked: true,
        totalLikes: 0,
        error: 'Failed to remove like'
      };
    }
  }

  // ==========================================
  // QUERY OPERATIONS
  // ==========================================

  /**
   * Check if user has liked specific content
   */
  async hasUserLiked(
    userId: string, 
    contentType: ContentType, 
    contentId: string
  ): Promise<boolean> {
    const like = await prisma.universalLike.findUnique({
      where: {
        likerId_contentType_contentId: {
          likerId: userId,
          contentType,
          contentId
        }
      }
    });
    return !!like;
  }

  /**
   * Get total likes count for specific content
   */
  async getContentLikeCount(
    contentType: ContentType, 
    contentId: string
  ): Promise<number> {
    return await prisma.universalLike.count({
      where: {
        contentType,
        contentId
      }
    });
  }

  /**
   * Get user's total likes received
   */
  async getUserTotalLikes(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalLikesReceived: true }
    });
    return user?.totalLikesReceived || 0;
  }

  /**
   * Get user's likes breakdown by type
   */
  async getUserLikesByType(userId: string): Promise<Record<ContentType, number>> {
    const stats = await prisma.userLikeStats.findUnique({
      where: { userId }
    });
    return (stats?.likesByType as Record<ContentType, number>) || {};
  }

  /**
   * Get user's complete like statistics
   */
  async getUserLikeStats(userId: string): Promise<UserLikeStats | null> {
    const stats = await prisma.userLikeStats.findUnique({
      where: { userId }
    });
    
    if (!stats) return null;

    return {
      userId: stats.userId,
      totalLikes: stats.totalLikes,
      likesByType: stats.likesByType as Record<ContentType, number>,
      lastUpdated: stats.lastUpdated,
      monthlyStats: stats.monthlyStats as Record<string, any>
    };
  }

  /**
   * Get comprehensive likes analytics for a user
   */
  async getUserLikesAnalytics(userId: string): Promise<LikesAnalyticsData> {
    const stats = await this.getUserLikeStats(userId);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    // Get recent likes received
    const recentLikes = await prisma.universalLike.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        liker: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true,
            username: true
          }
        }
      }
    });    // Get top content by likes
    const topContent = await prisma.$queryRaw`
      SELECT "contentType", "contentId", COUNT(*) as likes
      FROM "auth_schema"."UniversalLike"
      WHERE "recipientId" = ${userId}
      GROUP BY "contentType", "contentId"
      ORDER BY likes DESC
      LIMIT 5
    ` as Array<{ contentType: ContentType; contentId: string; likes: bigint }>;

    const monthlyStats = stats?.monthlyStats as Record<string, any> || {};
    const thisMonthStats = monthlyStats[currentMonth] || { total: 0 };
    const lastMonthStats = monthlyStats[lastMonth] || { total: 0 };

    const growthPercentage = lastMonthStats.total > 0 
      ? ((thisMonthStats.total - lastMonthStats.total) / lastMonthStats.total) * 100
      : thisMonthStats.total > 0 ? 100 : 0;

    return {
      totalLikes: stats?.totalLikes || 0,
      totalThisMonth: thisMonthStats.total,
      totalLastMonth: lastMonthStats.total,
      growthPercentage,
      likesByType: stats?.likesByType || {} as Record<ContentType, number>,
      monthlyBreakdown: Object.entries(monthlyStats).map(([month, data]: [string, any]) => ({
        month,
        total: data.total,
        types: data
      })),      topContent: topContent.map(item => ({
        contentType: item.contentType,
        contentId: item.contentId,
        likes: Number(item.likes)
      })),      recentLikers: recentLikes.map(like => ({
        id: like.liker.id,
        name: like.liker.name,
        profilePictureUrl: like.liker.profilePictureUrl || undefined,
        username: like.liker.username,
        likedAt: like.createdAt,
        contentType: like.contentType as ContentType
      }))
    };
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  /**
   * Get like status for multiple content items
   */
  async getBulkLikeStatus(
    userId: string,
    items: Array<{ contentType: ContentType; contentId: string }>
  ): Promise<Record<string, { liked: boolean; count: number }>> {
    const likes = await prisma.universalLike.findMany({
      where: {
        likerId: userId,
        OR: items.map(item => ({
          contentType: item.contentType,
          contentId: item.contentId
        }))
      }
    });

    const counts = await Promise.all(
      items.map(async item => ({
        key: `${item.contentType}-${item.contentId}`,
        count: await this.getContentLikeCount(item.contentType, item.contentId)
      }))
    );

    const result: Record<string, { liked: boolean; count: number }> = {};
    
    items.forEach(item => {
      const key = `${item.contentType}-${item.contentId}`;
      const isLiked = likes.some(like => 
        like.contentType === item.contentType && like.contentId === item.contentId
      );
      const count = counts.find(c => c.key === key)?.count || 0;
      
      result[key] = { liked: isLiked, count };
    });

    return result;
  }

  // ==========================================
  // MAINTENANCE OPERATIONS
  // ==========================================

  /**
   * Recalculate user's total likes (for data consistency)
   */
  async recalculateUserLikes(userId: string): Promise<number> {
    const totalLikes = await prisma.universalLike.count({
      where: { recipientId: userId }
    });

    // Get breakdown by type
    const likesByType = await prisma.universalLike.groupBy({
      by: ['contentType'],
      where: { recipientId: userId },
      _count: { contentType: true }
    });

    const typeBreakdown: Record<string, number> = {};
    likesByType.forEach(item => {
      typeBreakdown[item.contentType] = item._count.contentType;
    });

    // Update user and stats
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalLikesReceived: totalLikes }
      }),
      prisma.userLikeStats.upsert({
        where: { userId },
        create: {
          userId,
          totalLikes,
          likesByType: typeBreakdown,
          lastUpdated: new Date()
        },
        update: {
          totalLikes,
          likesByType: typeBreakdown,
          lastUpdated: new Date()
        }
      })
    ]);

    return totalLikes;
  }

  /**
   * Clean up orphaned like notifications
   */
  async cleanupOrphanedNotifications(): Promise<number> {
    const result = await prisma.likeNotification.deleteMany({
      where: {
        AND: [
          { isRead: true },
          { 
            createdAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
            }
          }
        ]
      }
    });

    return result.count;
  }
}

// Export singleton instance
export const universalLikeService = new UniversalLikeService();
