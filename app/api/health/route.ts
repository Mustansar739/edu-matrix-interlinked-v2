import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Kafka } from 'kafkajs';

// Official Next.js 15 health check implementation
const prisma = new PrismaClient();

// Redis client for health checks using ioredis (official package in your project)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

// Kafka client for health checks - using external port for host-to-container communication
const kafka = new Kafka({
  clientId: 'health-check-client',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
  connectionTimeout: 3000,
  requestTimeout: 5000,
});

// Health check for database connection
async function checkDatabase(): Promise<{ status: boolean; responseTime: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: true, responseTime: Date.now() - start };
  } catch (error) {
    return { status: false, responseTime: Date.now() - start };
  }
}

// Health check for Redis connection
async function checkRedis(): Promise<{ status: boolean; responseTime: number }> {
  const start = Date.now();
  try {
    // For ioredis, use ping() directly - it handles connection automatically
    await redisClient.ping();
    return { status: true, responseTime: Date.now() - start };
  } catch (error) {
    return { status: false, responseTime: Date.now() - start };
  }
}

// Health check for Socket.IO server
async function checkSocketIO(): Promise<{ status: boolean; responseTime: number }> {
  const start = Date.now();
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return { 
      status: response.ok, 
      responseTime: Date.now() - start 
    };
  } catch (error) {
    return { status: false, responseTime: Date.now() - start };
  }
}

// Health check for Kafka connection
async function checkKafka(): Promise<{ status: boolean; responseTime: number }> {
  const start = Date.now();
  let admin;
  try {
    admin = kafka.admin();
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return { status: true, responseTime: Date.now() - start };
  } catch (error) {
    if (admin) {
      try { await admin.disconnect(); } catch (e) {}
    }
    return { status: false, responseTime: Date.now() - start };
  }
}

export async function GET(request: NextRequest) {
  try {
    const socketServerHeader = request.headers.get('X-Socket-Server');
    const internalApiKey = request.headers.get('X-Internal-API-Key');
    
    // Perform parallel health checks
    const [dbHealth, redisHealth, socketHealth, kafkaHealth] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkSocketIO(),
      checkKafka()
    ]);

    const dbResult = dbHealth.status === 'fulfilled' ? dbHealth.value : { status: false, responseTime: 0 };
    const redisResult = redisHealth.status === 'fulfilled' ? redisHealth.value : { status: false, responseTime: 0 };
    const socketResult = socketHealth.status === 'fulfilled' ? socketHealth.value : { status: false, responseTime: 0 };
    const kafkaResult = kafkaHealth.status === 'fulfilled' ? kafkaHealth.value : { status: false, responseTime: 0 };

    // Determine overall health status
    const allHealthy = dbResult.status && redisResult.status && kafkaResult.status;
    const overallStatus = allHealthy ? 'healthy' : 'unhealthy';

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      isInternal: !!socketServerHeader,
      services: {
        database: {
          status: dbResult.status ? 'healthy' : 'unhealthy',
          responseTime: `${dbResult.responseTime}ms`,
          type: 'PostgreSQL'
        },
        redis: {
          status: redisResult.status ? 'healthy' : 'unhealthy',
          responseTime: `${redisResult.responseTime}ms`,
          type: 'Redis'
        },
        socketio: {
          status: socketResult.status ? 'healthy' : 'unhealthy',
          responseTime: `${socketResult.responseTime}ms`,
          type: 'Socket.IO'
        },
        kafka: {
          status: kafkaResult.status ? 'healthy' : 'unhealthy',
          responseTime: `${kafkaResult.responseTime}ms`,
          type: 'Kafka'
        }
      },
      memory: {
        usage: process.memoryUsage(),
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    };

    const statusCode = allHealthy ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api'
    }, { status: 500 });
  }
}
