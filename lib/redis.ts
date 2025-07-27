/**
 * ==========================================
 * EDU MATRIX INTERLINKED - REDIS CLIENT
 * ==========================================
 * Redis client configuration using ioredis
 * Official setup for caching and real-time features
 */

import Redis from 'ioredis';

// ==========================================
// REDIS CLIENT CONFIGURATION
// ==========================================

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  // Connection timeout in milliseconds
  connectTimeout: 10000,
  // Command timeout in milliseconds
  commandTimeout: 5000,
};

// ==========================================
// REDIS CLIENT INSTANCE
// ==========================================

export const redis = new Redis(redisConfig);

// ==========================================
// CONNECTION EVENT HANDLERS
// ==========================================

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for commands');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// ==========================================
// OFFICIAL REDIS SERVICE CLASS
// ==========================================

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = redis;
  }

  // Session Management (NextAuth.js integration)
  async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // User Profile/Resume Caching
  async cacheUserProfile(userId: string, profileData: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`profile:${userId}`, ttl, JSON.stringify(profileData));
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const data = await this.client.get(`profile:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // Course Progress Caching
  async setCourseProgress(userId: string, courseId: string, progress: any): Promise<void> {
    await this.client.hset(`progress:${userId}`, courseId, JSON.stringify(progress));
  }

  async getCourseProgress(userId: string, courseId: string): Promise<any | null> {
    const data = await this.client.hget(`progress:${userId}`, courseId);
    return data ? JSON.parse(data) : null;
  }

  // Institution Data Caching
  async cacheInstitution(institutionId: string, data: any, ttl: number = 7200): Promise<void> {
    await this.client.setex(`institution:${institutionId}`, ttl, JSON.stringify(data));
  }

  async getInstitution(institutionId: string): Promise<any | null> {
    const data = await this.client.get(`institution:${institutionId}`);
    return data ? JSON.parse(data) : null;
  }

  // Real-time Notification Queues
  async pushNotification(userId: string, notification: any): Promise<void> {
    await this.client.lpush(`notifications:${userId}`, JSON.stringify(notification));
    // Keep only latest 100 notifications
    await this.client.ltrim(`notifications:${userId}`, 0, 99);
  }

  async getNotifications(userId: string, limit: number = 10): Promise<any[]> {
    const notifications = await this.client.lrange(`notifications:${userId}`, 0, limit - 1);
    return notifications.map(n => JSON.parse(n));
  }

  // Message Conversation Caching
  async cacheConversation(conversationId: string, messages: any[], ttl: number = 3600): Promise<void> {
    await this.client.setex(`conversation:${conversationId}`, ttl, JSON.stringify(messages));
  }

  async getConversation(conversationId: string): Promise<any[] | null> {
    const data = await this.client.get(`conversation:${conversationId}`);
    return data ? JSON.parse(data) : null;
  }
  // ==========================================
  // ENHANCED SOCIAL MEDIA POSTS CACHING
  // ==========================================

  // Individual Post Caching
  async cachePost(postId: string, postData: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`post:${postId}`, ttl, JSON.stringify(postData));
  }

  async getPost(postId: string): Promise<any | null> {
    const data = await this.client.get(`post:${postId}`);
    return data ? JSON.parse(data) : null;
  }

  // User's Posts Timeline Cache
  async cacheUserPosts(userId: string, posts: any[], ttl: number = 1800): Promise<void> {
    await this.client.setex(`user_posts:${userId}`, ttl, JSON.stringify(posts));
  }

  async getUserPosts(userId: string): Promise<any[] | null> {
    const data = await this.client.get(`user_posts:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // Community/Institution Feed Caching
  async cacheCommunityFeed(communityId: string, posts: any[], ttl: number = 1800): Promise<void> {
    await this.client.setex(`community_feed:${communityId}`, ttl, JSON.stringify(posts));
  }

  async getCommunityFeed(communityId: string): Promise<any[] | null> {
    const data = await this.client.get(`community_feed:${communityId}`);
    return data ? JSON.parse(data) : null;
  }

  // Main User Feed (Facebook-style)
  async cacheFeed(userId: string, posts: any[], ttl: number = 1800): Promise<void> {
    await this.client.setex(`feed:${userId}`, ttl, JSON.stringify(posts));
  }

  async getFeed(userId: string): Promise<any[] | null> {
    const data = await this.client.get(`feed:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // Post Interactions (Likes, Comments, Shares)
  async cachePostInteractions(postId: string, interactions: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`interactions:${postId}`, ttl, JSON.stringify(interactions));
  }

  async getPostInteractions(postId: string): Promise<any | null> {
    const data = await this.client.get(`interactions:${postId}`);
    return data ? JSON.parse(data) : null;
  }

  // Trending Posts Cache
  async cacheTrendingPosts(category: string, posts: any[], ttl: number = 900): Promise<void> {
    await this.client.setex(`trending:${category}`, ttl, JSON.stringify(posts));
  }

  async getTrendingPosts(category: string): Promise<any[] | null> {
    const data = await this.client.get(`trending:${category}`);
    return data ? JSON.parse(data) : null;
  }

  // Post Search Results Cache
  async cacheSearchResults(query: string, results: any[], ttl: number = 1800): Promise<void> {
    const searchKey = `search:${Buffer.from(query).toString('base64')}`;
    await this.client.setex(searchKey, ttl, JSON.stringify(results));
  }

  async getSearchResults(query: string): Promise<any[] | null> {
    const searchKey = `search:${Buffer.from(query).toString('base64')}`;
    const data = await this.client.get(searchKey);
    return data ? JSON.parse(data) : null;
  }

  // Job/Freelancing Listings Cache
  async cacheJobListings(category: string, listings: any[], ttl: number = 3600): Promise<void> {
    await this.client.setex(`jobs:${category}`, ttl, JSON.stringify(listings));
  }

  async getJobListings(category: string): Promise<any[] | null> {
    const data = await this.client.get(`jobs:${category}`);
    return data ? JSON.parse(data) : null;
  }

  // Platform Statistics Cache
  async cacheStats(type: string, stats: any, ttl: number = 600): Promise<void> {
    await this.client.setex(`stats:${type}`, ttl, JSON.stringify(stats));
  }

  async getStats(type: string): Promise<any | null> {
    const data = await this.client.get(`stats:${type}`);
    return data ? JSON.parse(data) : null;
  }

  // Health check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // ==========================================
  // FEED CACHING PUBLIC METHODS
  // ==========================================

  // Get cached feed data
  async getFeedCache(cacheKey: string): Promise<any | null> {
    const data = await this.client.get(cacheKey);
    return data ? JSON.parse(data) : null;
  }

  // Set feed cache with TTL
  async setFeedCache(cacheKey: string, feedData: any, ttl: number = 300): Promise<void> {
    await this.client.setex(cacheKey, ttl, JSON.stringify(feedData));
  }

  // Delete cache by pattern
  async deleteCachePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Generic cache operations
  async setCache(key: string, data: any, ttl: number): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(data));
  }

  async getCache(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// Export singleton instance (official pattern)
export const redisService = new RedisService();

redis.on('close', () => {
  console.log('🔄 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get Redis client instance (alias for compatibility)
 */
export function getRedisClient(): Redis {
  return redis;
}

/**
 * Get Redis client (alternative export name)
 */
export const getRedis = () => redis;

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const response = await redis.ping();
    return response === 'PONG';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    console.log('✅ Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
}

// ==========================================
// CACHE HELPER FUNCTIONS
// ==========================================

/**
 * Set cache with expiration (in seconds)
 */
export async function setCache(key: string, value: any, expireInSeconds: number = 3600): Promise<boolean> {
  try {
    const serializedValue = JSON.stringify(value);
    await redis.setex(key, expireInSeconds, serializedValue);
    return true;
  } catch (error) {
    console.error('Redis setCache error:', error);
    return false;
  }
}

/**
 * Get cache value
 */
export async function getCache(key: string): Promise<any | null> {
  try {
    const value = await redis.get(key);
    if (value === null) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error('Redis getCache error:', error);
    return null;
  }
}

/**
 * Delete cache key
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    console.error('Redis deleteCache error:', error);
    return false;
  }
}

/**
 * Check if cache key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis cacheExists error:', error);
    return false;
  }
}

export default redis;
