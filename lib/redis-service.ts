/**
 * Redis Service Export
 * Provides a unified interface for Redis operations
 */

import { redis as redisClient } from "@/lib/redis"

// Export the redis instance
export const redis = redisClient

// Also export as redisService for compatibility
export const redisService = redis

export default redis
