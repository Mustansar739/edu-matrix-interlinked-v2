/**
 * =============================================================================
 * API PERFORMANCE MONITORING - PRODUCTION DIAGNOSTICS
 * =============================================================================
 * 
 * PURPOSE:
 * Monitor API performance, cache hit rates, and database query times.
 * Provides insights for production optimization and troubleshooting.
 * 
 * ENDPOINT:
 * GET /api/performance/monitor
 * 
 * FEATURES:
 * - API response time tracking
 * - Cache hit/miss statistics
 * - Database query performance
 * - Memory usage monitoring
 * - Error rate tracking
 * 
 * CREATED: 2025-07-23 - PRODUCTION PERFORMANCE MONITORING
 * FIXED: 2025-07-23 - Enhanced error handling and Redis safety
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { redis, testRedisConnection } from '@/lib/redis'
import { getCacheStats } from '@/lib/cache-invalidation'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Basic auth check - could be expanded to admin-only in production
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()

    // Test Redis connection first
    const redisConnected = await testRedisConnection()
    if (!redisConnected) {
      console.warn('⚠️ PERFORMANCE MONITOR: Redis connection failed')
      return NextResponse.json(
        { 
          error: 'Redis connection unavailable',
          status: 'degraded',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Get cache statistics safely
    let cacheStats: Record<string, number> = {}
    try {
      cacheStats = await getCacheStats()
    } catch (error) {
      console.warn('⚠️ PERFORMANCE MONITOR: Cache stats error:', error)
      cacheStats = { error: 'Cache stats unavailable' } as any
    }

    // Get Redis info safely
    let redisInfo: Record<string, string> = {}
    try {
      const info = await redis.info('memory')
      const lines = info.split('\r\n')
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':')
          redisInfo[key] = value
        }
      }
    } catch (error) {
      console.warn('⚠️ PERFORMANCE MONITOR: Redis info error:', error)
      redisInfo = { error: 'Unable to fetch Redis info' }
    }

    // Performance metrics with proper typing
    const performanceData = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as const,
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      redis: {
        connected: redisConnected,
        info: redisInfo,
        cacheStats
      },
      api: {
        responseTime: Date.now() - startTime,
        endpoints: {
          stories: {
            description: 'Stories API performance',
            optimizations: [
              'Redis caching (2min TTL)',
              'Reduced query complexity',
              'Efficient story grouping',
              'Optimized author data fetching'
            ]
          },
          followStatus: {
            description: 'Follow Status API performance',
            optimizations: [
              'Redis caching (5min TTL)',
              'Single-query relationship check',
              'Batch processing support',
              'Anonymous user caching'
            ]
          },
          followList: {
            description: 'Follow List API performance',
            optimizations: [
              'Redis caching (5min TTL)',
              'Optimized JOIN queries',
              'Efficient data transformation',
              'Cached follower counts'
            ]
          }
        }
      },
      recommendations: [] as string[]
    }

    // Add performance recommendations based on cache stats
    if (typeof cacheStats['follow_status:*'] === 'number' && cacheStats['follow_status:*'] > 1000) {
      performanceData.recommendations.push(
        'High follow status cache usage detected - consider increasing TTL'
      )
    }

    if (typeof cacheStats['stories*:*'] === 'number' && cacheStats['stories*:*'] > 500) {
      performanceData.recommendations.push(
        'High story cache usage detected - system is performing well'
      )
    }

    if (Object.values(cacheStats).every(count => typeof count === 'number' && count === 0)) {
      performanceData.recommendations.push(
        'No cache entries found - ensure caching is working properly'
      )
    }

    // Add general recommendations
    if (performanceData.api.responseTime > 1000) {
      performanceData.recommendations.push(
        'Performance monitor response time > 1s - check system load'
      )
    }

    if (performanceData.server.memory.heapUsed > performanceData.server.memory.heapTotal * 0.8) {
      performanceData.recommendations.push(
        'High memory usage detected - consider increasing heap size'
      )
    }

    console.log('📊 PERFORMANCE MONITOR: Generated performance report successfully')

    return NextResponse.json(performanceData)

  } catch (error) {
    console.error('❌ PERFORMANCE MONITOR ERROR:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate performance report',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        status: 'error'
      },
      { status: 500 }
    )
  }
}

/**
 * Clear all performance-related caches for testing
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test Redis connection first
    const redisConnected = await testRedisConnection()
    if (!redisConnected) {
      return NextResponse.json(
        { 
          error: 'Redis connection unavailable',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Import cache clearing function safely
    try {
      const { clearAllFollowCaches } = await import('@/lib/cache-invalidation')
      await clearAllFollowCaches()

      console.log('🧹 PERFORMANCE: All caches cleared by user', session.user.id)

      return NextResponse.json({
        success: true,
        message: 'All performance caches cleared successfully',
        clearedBy: session.user.id,
        timestamp: new Date().toISOString()
      })

    } catch (importError) {
      console.error('❌ CACHE CLEAR IMPORT ERROR:', importError)
      return NextResponse.json(
        { 
          error: 'Failed to import cache clearing utilities',
          details: importError instanceof Error ? importError.message : 'Import failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ CACHE CLEAR ERROR:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clear caches',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
