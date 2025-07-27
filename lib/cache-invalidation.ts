/**
 * =============================================================================
 * CACHE INVALIDATION UTILITIES - PRODUCTION PERFORMANCE OPTIMIZATION
 * =============================================================================
 * 
 * PURPOSE:
 * Utility functions to efficiently invalidate related caches when follow
 * relationships change, ensuring data consistency without performance loss.
 * 
 * FEATURES:
 * - Selective cache invalidation
 * - Pattern-based cache clearing
 * - Non-blocking cache operations
 * - Error handling and logging
 * 
 * CREATED: 2025-07-23 - PRODUCTION PERFORMANCE FIX
 * =============================================================================
 */

import { redis } from '@/lib/redis'

export class CacheInvalidationService {
  
  /**
   * Invalidate follow-related caches when follow relationship changes
   */
  static async invalidateFollowCaches(userId: string, targetUserId: string): Promise<void> {
    try {
      const cachePatterns = [
        // Follow status caches (both directions)
        `follow_status:${userId}:${targetUserId}`,
        `follow_status:${targetUserId}:${userId}`,
        `follow_status:anonymous:${targetUserId}`,
        
        // Follow list caches
        `follow_list:${userId}:*`,
        `follow_list:${targetUserId}:*`,
        
        // Stories caches (affected by follow relationship changes)
        `stories*:${userId}:*`,
        `stories*:${targetUserId}:*`,
        
        // Batch follow status caches
        `batch_follow:${userId}:*`,
        `batch_follow:${targetUserId}:*`
      ]

      console.log(`🔄 CACHE INVALIDATION: Clearing follow-related caches for users ${userId} and ${targetUserId}`)

      // Use Promise.allSettled to ensure non-blocking operation
      const invalidationPromises = cachePatterns.map(async (pattern) => {
        try {
          if (pattern.includes('*')) {
            // Pattern-based deletion
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
              await redis.del(...keys)
              console.log(`🗑️ CACHE: Deleted ${keys.length} keys matching pattern: ${pattern}`)
            }
          } else {
            // Direct key deletion
            const result = await redis.del(pattern)
            if (result > 0) {
              console.log(`🗑️ CACHE: Deleted key: ${pattern}`)
            }
          }
        } catch (error) {
          console.warn(`⚠️ CACHE: Failed to delete pattern ${pattern}:`, error)
        }
      })

      await Promise.allSettled(invalidationPromises)
      console.log(`✅ CACHE INVALIDATION: Completed for follow relationship ${userId} -> ${targetUserId}`)

    } catch (error) {
      console.error('❌ CACHE INVALIDATION ERROR:', error)
      // Don't throw - cache invalidation should not break the main operation
    }
  }

  /**
   * Invalidate story-related caches when story is created/deleted
   */
  static async invalidateStoryCaches(authorId: string, storyId?: string): Promise<void> {
    try {
      const cachePatterns = [
        // Author's story caches
        `stories*:${authorId}:*`,
        
        // Story viewers' caches (followers who might see this story)
        `stories*:*:*`, // Broader invalidation for story visibility changes
      ]

      console.log(`🔄 CACHE INVALIDATION: Clearing story-related caches for author ${authorId}`)

      const invalidationPromises = cachePatterns.map(async (pattern) => {
        try {
          const keys = await redis.keys(pattern)
          if (keys.length > 0) {
            await redis.del(...keys)
            console.log(`🗑️ CACHE: Deleted ${keys.length} story cache keys`)
          }
        } catch (error) {
          console.warn(`⚠️ CACHE: Failed to delete story pattern ${pattern}:`, error)
        }
      })

      await Promise.allSettled(invalidationPromises)
      console.log(`✅ CACHE INVALIDATION: Completed for story from author ${authorId}`)

    } catch (error) {
      console.error('❌ STORY CACHE INVALIDATION ERROR:', error)
    }
  }

  /**
   * Invalidate user profile-related caches
   */
  static async invalidateUserProfileCaches(userId: string): Promise<void> {
    try {
      const cachePatterns = [
        `profile:${userId}`,
        `user_posts:${userId}`,
        `follow_list:${userId}:*`,
        `follow_status:*:${userId}`,
        `follow_status:${userId}:*`
      ]

      console.log(`🔄 CACHE INVALIDATION: Clearing profile caches for user ${userId}`)

      const invalidationPromises = cachePatterns.map(async (pattern) => {
        try {
          if (pattern.includes('*')) {
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
              await redis.del(...keys)
            }
          } else {
            await redis.del(pattern)
          }
        } catch (error) {
          console.warn(`⚠️ CACHE: Failed to delete profile pattern ${pattern}:`, error)
        }
      })

      await Promise.allSettled(invalidationPromises)
      console.log(`✅ CACHE INVALIDATION: Completed for user profile ${userId}`)

    } catch (error) {
      console.error('❌ PROFILE CACHE INVALIDATION ERROR:', error)
    }
  }

  /**
   * Emergency cache clear for debugging
   */
  static async clearAllFollowCaches(): Promise<void> {
    try {
      console.log('🚨 EMERGENCY: Clearing ALL follow-related caches')
      
      const patterns = [
        'follow_status:*',
        'follow_list:*',
        'stories*:*',
        'batch_follow:*'
      ]

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
          console.log(`🗑️ EMERGENCY CLEAR: Deleted ${keys.length} keys for pattern: ${pattern}`)
        }
      }

      console.log('✅ EMERGENCY: All follow caches cleared')

    } catch (error) {
      console.error('❌ EMERGENCY CACHE CLEAR ERROR:', error)
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats(): Promise<any> {
    try {
      const patterns = [
        'follow_status:*',
        'follow_list:*',
        'stories*:*',
        'batch_follow:*'
      ]

      const stats: any = {}
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        stats[pattern] = keys.length
      }

      return stats

    } catch (error) {
      console.error('❌ CACHE STATS ERROR:', error)
      return {}
    }
  }
}

// Export convenience functions
export const invalidateFollowCaches = CacheInvalidationService.invalidateFollowCaches
export const invalidateStoryCaches = CacheInvalidationService.invalidateStoryCaches
export const invalidateUserProfileCaches = CacheInvalidationService.invalidateUserProfileCaches
export const clearAllFollowCaches = CacheInvalidationService.clearAllFollowCaches
export const getCacheStats = CacheInvalidationService.getCacheStats
