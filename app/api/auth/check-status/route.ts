/**
 * Authentication Status Check Route
 * 
 * This route provides endpoint to check current authentication status
 * for the edu-matrix-interlinked application. It verifies if a user 
 * is properly authenticated and returns their session data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get current session using NextAuth
    const session = await auth()

    // Return authentication status and user data if authenticated
    if (session?.user) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          username: session.user.username,
          isVerified: session.user.isVerified
        }
      })
    }

    // Return unauthenticated status
    return NextResponse.json({
      success: true,
      authenticated: false,
      user: null
    })

  } catch (error) {
    console.error('[Auth Check Status] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check authentication status',
        authenticated: false
      },
      { status: 500 }
    )
  }
}