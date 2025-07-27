import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Official Next.js 15 Redis health check with IORedis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function GET(request: NextRequest) {
  try {
    const start = Date.now();
    
    // Ensure Redis connection
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }
    
    // Test basic ping
    const pingResult = await redisClient.ping();
    
    // Test write/read operations
    const testKey = `health_check_${Date.now()}`;
    await redisClient.setex(testKey, 10, 'test_value'); // Expires in 10 seconds
    const testValue = await redisClient.get(testKey);
    await redisClient.del(testKey);
    
    // Get Redis info
    const info = await redisClient.info();
    const memory = await redisClient.info('memory');
    const clients = await redisClient.info('clients');
    
    const responseTime = Date.now() - start;

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

    const memoryInfo = parseRedisInfo(memory);
    const clientInfo = parseRedisInfo(clients);
    const serverInfo = parseRedisInfo(info);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'redis',
      type: 'Redis',
      responseTime: `${responseTime}ms`,
      connection: {
        ping: pingResult,
        writeTest: testValue === 'test_value' ? 'passed' : 'failed',
        version: serverInfo.redis_version,
        mode: serverInfo.redis_mode,
        uptime: `${Math.floor(parseInt(serverInfo.uptime_in_seconds || '0') / 3600)}h`
      },
      metrics: {
        connectedClients: clientInfo.connected_clients,
        usedMemory: memoryInfo.used_memory_human,
        maxMemory: memoryInfo.maxmemory_human || 'unlimited',
        memoryUsage: memoryInfo.used_memory_rss_human,
        keyspaceHits: serverInfo.keyspace_hits,
        keyspaceMisses: serverInfo.keyspace_misses
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Redis health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'redis',
      type: 'Redis',
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    }, { status: 503 });
  }
}
