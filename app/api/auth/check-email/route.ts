// ==========================================
// EMAIL CHECK API ROUTE - NEXTAUTH.JS V5 COMPATIBLE
// ==========================================
// Official Next.js 15 API route for checking email existence and verification status

import { prisma } from '@/lib/prisma'
import { authRateLimit } from '@/lib/auth-rate-limit'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email input
    if (!email || typeof email !== 'string') {
      return Response.json(
        { 
          exists: false, 
          verified: false,
          message: 'Email is required' 
        },
        { status: 400 }
      )
    }

    // Check rate limiting using the auth rate limit utility
    const rateLimit = authRateLimit.checkLoginLimit(email)
    
    if (!rateLimit.allowed) {
      return Response.json(
        { 
          exists: false, 
          verified: false,
          message: 'Too many attempts. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isVerified: true,
        password: true,
        emailVerificationExpires: true
      }
    })

    if (!user || !user.password) {
      return Response.json({
        exists: false,
        verified: false,
        message: 'This email is not registered in the system. Please sign up first.'
      })
    }

    if (!user.isVerified) {
      // Check if verification token is expired
      const isTokenExpired = !user.emailVerificationExpires || 
                           new Date() > user.emailVerificationExpires

      return Response.json({
        exists: true,
        verified: false,
        tokenExpired: isTokenExpired,
        message: isTokenExpired 
          ? 'Your email verification has expired. A new verification email will be sent when you attempt to sign in.'
          : 'Please verify your email address before signing in. Check your inbox for the verification email.'
      })
    }

    return Response.json({
      exists: true,
      verified: true,
      message: 'Email is registered and verified'
    })
  } catch (error) {
    console.error('[Check Email API] Error:', error)
    
    // Provide user-friendly error message instead of generic server error
    return Response.json(
      { 
        exists: false, 
        verified: false,
        message: 'Unable to verify email at this time. You can still try signing in.' 
      },
      { status: 500 }
    )
  }
}
