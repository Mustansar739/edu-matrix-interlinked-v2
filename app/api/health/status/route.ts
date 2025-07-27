import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Official Next.js 15 application status endpoint
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get system information
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get Next.js and environment info
    const nextVersion = process.env.npm_package_dependencies_next || 'unknown';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Calculate memory usage in MB
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Format uptime
    const uptimeSeconds = process.uptime();
    const uptimeFormatted = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`;
    
    const responseTime = Date.now() - startTime;

    const status = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-application',
      responseTime: `${responseTime}ms`,
      application: {
        name: 'Edu Matrix Interlinked',
        version: '1.0.0',
        environment: nodeEnv,
        nextVersion,
        uptime: uptimeFormatted,
        startTime: new Date(Date.now() - uptimeSeconds * 1000).toISOString()
      },
      system: {
        nodeVersion,
        platform,
        architecture: arch,
        processId: process.pid,
        parentProcessId: process.ppid
      },
      performance: {
        memory: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          heapUtilization: `${Math.round((heapUsedMB / heapTotalMB) * 100)}%`,
          rss: `${rssMB}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: `${Math.round(cpuUsage.user / 1000)}ms`,
          system: `${Math.round(cpuUsage.system / 1000)}ms`
        }
      },
      features: {
        authentication: 'NextAuth.js 5.0',
        database: 'PostgreSQL + Prisma',
        cache: 'Redis',
        realtime: 'Socket.IO',
        messaging: 'Apache Kafka',
        ui: 'Next.js 15 + React 19 + Tailwind',
        stateManagement: 'Redux Toolkit + Redux Persist'
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Application status check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-application',
      error: error instanceof Error ? error.message : 'Unknown application error'
    }, { status: 500 });
  }
}
