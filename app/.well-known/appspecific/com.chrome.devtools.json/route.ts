import { NextRequest, NextResponse } from 'next/server'

/**
 * Chrome DevTools Integration Endpoint
 * This endpoint provides Chrome DevTools with development server information
 * for enhanced debugging and development experience.
 */
export async function GET(request: NextRequest) {
  // Only serve this in development mode
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 })
  }

  const devToolsConfig = {
    // Chrome DevTools configuration for Next.js development server
    version: "1.0",
    app: {
      id: "edu-matrix-interlinked",
      name: "Edu Matrix Interlinked",
      version: "0.1.0",
      description: "Educational platform with real-time features"
    },
    debuggingPort: 9229, // Node.js debugging port
    inspectorUrl: "chrome-devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=localhost:9229",
    sourceMapUrl: "/_next/static/chunks",
    hotReload: true,
    features: {
      sourceMapping: true,
      hotReload: true,
      networkInspection: true,
      performanceMonitoring: true
    },
    endpoints: {
      websocket: "ws://localhost:3000/_next/webpack-hmr",
      health: "/api/health",
      status: "/api/health/status"
    }
  }

  return NextResponse.json(devToolsConfig, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}
