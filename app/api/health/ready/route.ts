import { NextRequest, NextResponse } from 'next/server';

// Official Next.js 15 readiness probe (Kubernetes-style)
// This endpoint checks if the application is ready to receive traffic
export async function GET(request: NextRequest) {
  try {
    // Basic readiness checks
    const checks = {
      server: process.uptime() > 5, // Server has been up for at least 5 seconds
      memory: process.memoryUsage().heapUsed < process.memoryUsage().heapTotal * 0.9, // Less than 90% memory usage
      environment: !!process.env.DATABASE_URL // Required environment variables are set
    };

    const allReady = Object.values(checks).every(check => check === true);

    const response = {
      status: allReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api',
      checks: {
        server: checks.server ? 'ready' : 'not-ready',
        memory: checks.memory ? 'ready' : 'not-ready',
        environment: checks.environment ? 'ready' : 'not-ready'
      }
    };

    const statusCode = allReady ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json({
      status: 'not-ready',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api',
      error: error instanceof Error ? error.message : 'Readiness check failed'
    }, { status: 503 });
  }
}
