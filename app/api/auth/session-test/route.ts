import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Also check cookies directly
    const cookies = request.cookies.getAll()
    const sessionCookie = cookies.find(cookie => 
      cookie.name.includes('session-token') || 
      cookie.name.includes('auth')
    )
    
    return NextResponse.json({
      hasSession: !!session,
      sessionData: session ? {
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name
      } : null,
      cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      sessionCookie: sessionCookie ? {
        name: sessionCookie.name,
        hasValue: !!sessionCookie.value
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Session Test] Error:', error)
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
