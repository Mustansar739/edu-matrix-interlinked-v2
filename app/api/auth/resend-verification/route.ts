/**
 * Resend Verification Email API - OTP-Based Email Verification System
 * 
 * Purpose: Handles requests to resend verification codes for unverified user accounts
 * using a secure 6-digit OTP system instead of traditional email verification links.
 * 
 * Features:
 * - Rate limiting to prevent spam (max 3 requests per 5 minutes per email)
 * - Secure OTP generation and storage with expiration
 * - Comprehensive error handling and logging
 * - Support for different verification purposes
 * - Redis caching for improved performance and security
 * 
 * Security Measures:
 * - Input validation using Zod schema
 * - Rate limiting per email address
 * - OTP expiration and attempt tracking
 * - Detailed logging for monitoring and debugging
 * 
 * Usage: Called when users need a new verification code during registration or login flows
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { emailService } from "@/lib/email"
import { otpService } from "@/lib/otp"
import { setCache, checkRateLimit } from "@/lib/cache"
import { z } from "zod"

// Validation schema for email input
const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input using Zod schema
    const validation = resendVerificationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: "Invalid email address", 
          errors: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const normalizedEmail = email.toLowerCase()

    // Rate limit OTP resend requests to prevent spam
    const rateLimit = await checkRateLimit(`otp-resend:${normalizedEmail}`, 3, 300) // 3 requests per 5 minutes
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many verification requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: "No account found with this email address" },
        { status: 404 }
      )
    }

    // Check if user is already verified
    if (user.isVerified) {
      return NextResponse.json(
        { message: "This account is already verified. You can sign in now." },
        { status: 400 }
      )
    }

    console.log(`Rate limiting passed for user: ${user.email}`)

    // Generate and store new OTP code
    const otp = otpService.generateOTP()
    await setCache(`otp:${user.email}:registration`, {
      code: otp,
      attempts: 0,
      createdAt: Date.now(),
      userId: user.id
    }, 600) // 10 minutes expiration

    // Store OTP in database as backup
    await otpService.storeOTP(user.id, otp, 'registration')

    console.log(`Generated new OTP for user: ${user.email}`)

    // Send OTP via email with production-ready error handling
    try {
      console.log(`Attempting to send OTP email to: ${user.email}`)
      
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otp,
        'registration',
        user.name
      )

      if (!emailResult.success) {
        console.error("❌ Failed to send OTP email:", emailResult.error)
        
        const userMessage = emailResult.userMessage || 
          "Failed to send verification email. Please try again later."
        
        return NextResponse.json(
          { 
            message: userMessage,
            error: "EMAIL_SEND_FAILED",
            errorType: emailResult.errorType || 'unknown'
          },
          { status: 500 }
        )
      }

      console.log("✅ OTP email sent successfully:", emailResult.messageId)
      
      return NextResponse.json({
        message: "New verification code sent! Please check your email for a 6-digit code.",
        success: true,
        nextStep: {
          action: "verify_otp",
          redirectTo: `/auth/verify-otp?email=${encodeURIComponent(user.email)}&purpose=registration`,
          description: "Enter the 6-digit code sent to your email"
        }
      }, { status: 200 })

    } catch (emailError: any) {
      console.error("❌ Error during OTP email process:", emailError)
      
      // Extract user-friendly message from enhanced error
      const userMessage = emailError.userMessage || 
        emailError.message || 
        "Failed to send verification email. Please try again later."
      
      return NextResponse.json(
        { 
          message: userMessage,
          error: "EMAIL_SEND_FAILED",
          isEmailServiceError: emailError.isEmailServiceError || false,
          errorType: emailError.type || 'unknown'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("❌ Resend verification error:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown server error"
    console.error(`❌ Detailed error for resend verification:`, errorMessage)
    
    return NextResponse.json(
      { 
        message: "Internal server error. Please try again later.",
        error: "SERVER_ERROR"
      },
      { status: 500 }
    )
  }
}
