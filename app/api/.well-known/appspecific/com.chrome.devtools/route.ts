import { NextRequest, NextResponse } from 'next/server'

/**
 * Chrome DevTools Integration Endpoint
 * This endpoint provides debugging information for Chrome DevTools
 * Handles: GET /.well-known/appspecific/com.chrome.devtools.json
 */
export async function GET(request: NextRequest) {
  try {
    // Chrome DevTools configuration for web app inspection
    const devtoolsConfig = {
      version: "1.0",
      app: {
        name: "Edu Matrix Interlinked",
        version: process.env.npm_package_version || "1.0.0",
        description: "Educational Platform with Real-time Features"
      },
      endpoints: {
        inspect: {
          url: process.env.NODE_ENV === 'development' 
            ? "http://localhost:3000/__dev/inspect"
            : null,
          enabled: process.env.NODE_ENV === 'development'
        },
        health: {
          url: "/api/health",
          enabled: true
        },
        websocket: {
          url: process.env.NODE_ENV === 'development'
            ? "ws://localhost:3001"
            : null,
          enabled: process.env.NODE_ENV === 'development'
        }
      },
      features: {
        debugging: process.env.NODE_ENV === 'development',
        performance: true,
        network: true,
        console: true
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(devtoolsConfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Chrome DevTools endpoint error:', error)
    
    return NextResponse.json({
      error: 'Chrome DevTools configuration unavailable',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error'
        : 'Internal server error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
