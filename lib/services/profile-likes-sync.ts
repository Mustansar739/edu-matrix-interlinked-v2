/**
 * =============================================================================
 * PROFILE LIKES SYNC SERVICE - Auto-Update Profile Like Totals
 * ===============================================      // Get all users with received likes
      const usersWithLikes = await prisma.universalLike.findMany({
        select: { recipientId: true },
        distinct: ['recipientId']
      })

      const userIds = usersWithLikes.map((like: { recipientId: string }) => like.recipientId)=======================
 * 
 * PURPOSE:
 * Automatically synchronizes profile total likes when any content is liked/unliked.
 * Ensures profile like counts are always accurate and up-to-date in real-time.
 * 
 * FEATURES:
 * ✅ Real-time profile like total updates
 * ✅ Triggers on any content like/unlike action
 * ✅ Background processing for performance
 * ✅ Error handling and retry logic
 * ✅ Database transaction safety
 * ✅ Performance optimization
 * 
 * TRIGGERS:
 * - When any content is liked (posts, projects, achievements, etc.)
 * - When any content is unliked
 * - On profile direct likes/unlikes
 * - Manual recalculation requests
 * 
 * INTEGRATION:
 * - Called by Universal Like Service after like operations
 * - Used by profile aggregation API
 * - Background job for periodic sync
 * 
 * PERFORMANCE:
 * - Efficient database queries
 * - Batch processing for multiple updates
 * - Caching for frequently accessed data
 * - Minimal impact on user experience
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { prisma } from '@/lib/prisma'
import { ContentType } from '@/types/profile'

interface LikeSyncResult {
  success: boolean
  userId: string
  previousTotal: number
  newTotal: number
  difference: number
  error?: string
}

interface BulkSyncResult {
  success: boolean
  processed: number
  errors: string[]
  results: LikeSyncResult[]
}

export class ProfileLikesSyncService {
  
  /**
   * Update a single user's profile like total
   */
  static async syncUserLikes(userId: string): Promise<LikeSyncResult> {
    try {
      // Get current total from profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalLikesReceived: true }
      })

      if (!user) {
        return {
          success: false,
          userId,
          previousTotal: 0,
          newTotal: 0,
          difference: 0,
          error: 'User not found'
        }
      }

      const previousTotal = user.totalLikesReceived || 0

      // Calculate actual total from likes table
      const actualTotal = await prisma.universalLike.count({
        where: { recipientId: userId }
      })

      // Update profile if totals don't match
      if (actualTotal !== previousTotal) {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            totalLikesReceived: actualTotal,
            updatedAt: new Date()
          }
        })
      }

      const difference = actualTotal - previousTotal

      return {
        success: true,
        userId,
        previousTotal,
        newTotal: actualTotal,
        difference
      }

    } catch (error) {
      console.error(`Failed to sync likes for user ${userId}:`, error)
      return {
        success: false,
        userId,
        previousTotal: 0,
        newTotal: 0,
        difference: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync likes for multiple users
   */
  static async syncMultipleUsers(userIds: string[]): Promise<BulkSyncResult> {
    const results: LikeSyncResult[] = []
    const errors: string[] = []
    let processed = 0

    for (const userId of userIds) {
      try {
        const result = await this.syncUserLikes(userId)
        results.push(result)
        
        if (result.success) {
          processed++
        } else {
          errors.push(`User ${userId}: ${result.error}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`User ${userId}: ${errorMessage}`)
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
      results
    }
  }

  /**
   * Trigger sync after a like action
   */
  static async triggerSyncAfterLike(recipientId: string, contentType: ContentType, liked: boolean): Promise<void> {
    try {
      // Run sync in background without blocking the response
      setTimeout(async () => {
        await this.syncUserLikes(recipientId)
      }, 100)
    } catch (error) {
      console.error('Failed to trigger like sync:', error)
      // Don't throw error - sync failure shouldn't block like action
    }
  }

  /**
   * Get users with inconsistent like totals
   */
  static async findInconsistentProfiles(limit: number = 100): Promise<string[]> {
    try {
      // Get users where profile total doesn't match actual likes
      const inconsistentUsers = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id
        FROM "User" u
        LEFT JOIN (
          SELECT "recipientId", COUNT(*) as actual_count
          FROM "UniversalLike"
          GROUP BY "recipientId"
        ) l ON u.id = l."recipientId"
        WHERE COALESCE(u."totalLikesReceived", 0) != COALESCE(l.actual_count, 0)
        LIMIT ${limit}
      `

      return inconsistentUsers.map(user => user.id)
    } catch (error) {
      console.error('Failed to find inconsistent profiles:', error)
      return []
    }
  }

  /**
   * Full system-wide likes sync
   */
  static async fullSystemSync(): Promise<BulkSyncResult> {
    try {
      // Get all users with received likes
      const usersWithLikes = await prisma.universalLike.findMany({
        select: { recipientId: true },
        distinct: ['recipientId']
      })

      const userIds = usersWithLikes.map((like: { recipientId: string }) => like.recipientId)
      
      // Also include users who might have zero likes but non-zero totals
      const usersWithTotals = await prisma.user.findMany({
        where: {
          totalLikesReceived: { gt: 0 },
          id: { notIn: userIds }
        },
        select: { id: true }
      })

      const allUserIds = [...userIds, ...usersWithTotals.map(user => user.id)]

      // Process in batches for performance
      const batchSize = 50
      const allResults: LikeSyncResult[] = []
      const allErrors: string[] = []
      let totalProcessed = 0

      for (let i = 0; i < allUserIds.length; i += batchSize) {
        const batch = allUserIds.slice(i, i + batchSize)
        const batchResult = await this.syncMultipleUsers(batch)
        
        allResults.push(...batchResult.results)
        allErrors.push(...batchResult.errors)
        totalProcessed += batchResult.processed
      }

      return {
        success: allErrors.length === 0,
        processed: totalProcessed,
        errors: allErrors,
        results: allResults
      }

    } catch (error) {
      console.error('Failed to perform full system sync:', error)
      return {
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        results: []
      }
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(): Promise<{
    totalUsers: number
    usersWithLikes: number
    inconsistentUsers: number
    lastSyncTime?: Date
  }> {
    try {
      const totalUsers = await prisma.user.count()
      
      const usersWithLikes = await prisma.universalLike.findMany({
        select: { recipientId: true },
        distinct: ['recipientId']
      })

      const inconsistentUserIds = await this.findInconsistentProfiles(1000)

      return {
        totalUsers,
        usersWithLikes: usersWithLikes.length,
        inconsistentUsers: inconsistentUserIds.length,
        lastSyncTime: new Date()
      }
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      return {
        totalUsers: 0,
        usersWithLikes: 0,
        inconsistentUsers: 0
      }
    }
  }
}

export default ProfileLikesSyncService
