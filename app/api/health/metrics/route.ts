import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Official Next.js 15 system metrics endpoint
const prisma = new PrismaClient();
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Get database metrics
async function getDatabaseMetrics() {
  try {    const [
      userCount,
      sessionCount,
      totalConnections
    ] = await Promise.all([
      prisma.user.count(),
      prisma.session.count(),
      prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity`.then(result => result as any[])
    ]);

    return {
      status: 'healthy',
      users: userCount,
      sessions: sessionCount,
      activeConnections: parseInt(totalConnections[0]?.count || '0')
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database metrics error'
    };
  }
}

// Get Redis metrics
async function getRedisMetrics() {
  try {
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }

    const info = await redisClient.info();
    const keyspace = await redisClient.info('keyspace');
    
    // Parse Redis info
    const parseRedisInfo = (infoString: string) => {
      const lines = infoString.split('\r\n');
      const result: Record<string, string> = {};
      lines.forEach(line => {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = value;
        }
      });
      return result;
    };

    const serverInfo = parseRedisInfo(info);
    const keyspaceInfo = parseRedisInfo(keyspace);

    return {
      status: 'healthy',
      connectedClients: parseInt(serverInfo.connected_clients || '0'),
      totalKeys: Object.keys(keyspaceInfo).length,
      memoryUsage: serverInfo.used_memory_human,
      hitRate: serverInfo.keyspace_hits && serverInfo.keyspace_misses 
        ? Math.round((parseInt(serverInfo.keyspace_hits) / (parseInt(serverInfo.keyspace_hits) + parseInt(serverInfo.keyspace_misses))) * 100)
        : 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Redis metrics error'
    };
  }
}

// Get Socket.IO metrics
async function getSocketIOMetrics() {
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`Socket.IO health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'healthy',
      connections: data.connections || 0,
      activeRooms: data.activeRooms || 0,
      activeCalls: data.activeCalls || 0,
      uptime: data.uptime || 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Socket.IO metrics error'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get all metrics in parallel
    const [dbMetrics, redisMetrics, socketMetrics] = await Promise.allSettled([
      getDatabaseMetrics(),
      getRedisMetrics(),
      getSocketIOMetrics()
    ]);

    const dbResult = dbMetrics.status === 'fulfilled' ? dbMetrics.value : { status: 'error', error: 'Failed to fetch' };
    const redisResult = redisMetrics.status === 'fulfilled' ? redisMetrics.value : { status: 'error', error: 'Failed to fetch' };
    const socketResult = socketMetrics.status === 'fulfilled' ? socketMetrics.value : { status: 'error', error: 'Failed to fetch' };

    // Calculate overall health
    const allHealthy = dbResult.status === 'healthy' && redisResult.status === 'healthy' && socketResult.status === 'healthy';
    
    const responseTime = Date.now() - startTime;

    const metrics = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbResult,
        redis: redisResult,
        socketio: socketResult
      },
      system: {
        uptime: process.uptime(),
        memory: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
        },
        environment: process.env.NODE_ENV || 'development'
      }
    };

    const statusCode = allHealthy ? 200 : 207; // 207 Multi-Status for partial success

    return NextResponse.json(metrics, { status: statusCode });
  } catch (error) {
    console.error('System metrics error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown metrics error'
    }, { status: 500 });
  }
}
