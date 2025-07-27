import { NextRequest, NextResponse } from 'next/server'

/**
 * Development Inspection Endpoint
 * Provides debugging information for development environment
 * Only available in development mode
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      error: 'Development endpoint not available in production'
    }, { status: 404 })
  }

  try {
    const inspectionData = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextVersion: process.env.npm_package_dependencies_next || 'unknown',
        timestamp: new Date().toISOString()
      },
      services: {
        database: {
          url: process.env.DATABASE_URL ? 'configured' : 'not configured',
          status: 'unknown'
        },
        redis: {
          url: process.env.REDIS_URL ? 'configured' : 'not configured',
          status: 'unknown'
        },
        socketio: {
          port: process.env.SOCKET_IO_PORT || '3001',
          host: process.env.SOCKET_IO_HOST || 'localhost',
          status: 'unknown'
        }
      },
      debugging: {
        devtools: true,
        sourceMaps: true,
        hotReload: true
      },
      network: {
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin')
      }
    }

    return NextResponse.json(inspectionData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Inspection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
