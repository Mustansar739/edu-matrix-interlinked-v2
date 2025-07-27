import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Official Next.js 15 database health check
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const start = Date.now();
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test database version and status
    const dbInfo = await prisma.$queryRaw`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port
    ` as any[];

    // Test table accessibility
    const userCount = await prisma.user.count();
    
    const responseTime = Date.now() - start;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'database',
      type: 'PostgreSQL',
      responseTime: `${responseTime}ms`,
      connection: {
        database: dbInfo[0]?.database,
        user: dbInfo[0]?.user,
        host: dbInfo[0]?.host,
        port: dbInfo[0]?.port,
        version: dbInfo[0]?.version?.split(' ')[0] // Extract just version number
      },      metrics: {
        userCount,
        connectionStatus: 'active'
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'database',
      type: 'PostgreSQL',
      error: error instanceof Error ? error.message : 'Unknown database error'
    }, { status: 503 });
  }
}
