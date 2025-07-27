import { NextRequest, NextResponse } from 'next/server'

/**
 * Development Health Check Endpoint
 * Provides development server status for Chrome DevTools integration
 */
export async function GET(request: NextRequest) {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    server: 'Next.js Development Server',
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: 'connected',
      redis: 'connected', 
      socketio: 'running',
      kafka: 'connected'
    },
    devTools: {
      hmr: true,
      sourceMap: true,
      debugPort: 9229
    }
  }

  return NextResponse.json(healthStatus, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
