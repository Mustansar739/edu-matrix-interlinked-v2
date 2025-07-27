import { NextRequest, NextResponse } from 'next/server';

// Official Next.js 15 liveness probe (Kubernetes-style)
// This endpoint checks if the application is alive and should be restarted if it fails
export async function GET(request: NextRequest) {
  try {
    // Basic liveness checks - minimal and fast
    const isAlive = {
      process: process.uptime() > 0,
      memory: process.memoryUsage().heapUsed > 0,
      timestamp: Date.now() > 0
    };

    const alive = Object.values(isAlive).every(check => check === true);

    const response = {
      status: alive ? 'alive' : 'dead',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api',
      uptime: process.uptime()
    };

    const statusCode = alive ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      service: 'edu-matrix-api',
      error: error instanceof Error ? error.message : 'Liveness check failed'
    }, { status: 503 });
  }
}
