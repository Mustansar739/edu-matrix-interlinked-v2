/**
 * REGISTRATION API ENDPOINT - PRODUCTION-READY USER REGISTRATION WITH OTP VERIFICATION
 * 
 * Purpose: Handle new user registration for the Edu Matrix Interlinked platform using
 * a secure 6-digit OTP email verification system instead of traditional verification links.
 * 
 * Features:
 * - Comprehensive input validation using Zod schema
 * - Duplicate user detection with intelligent conflict resolution
 * - Secure password hashing using industry-standard bcrypt
 * - Intelligent username generation with user preference support
 * - OTP-based email verification for enhanced security and UX
 * - Detailed error handling and logging for debugging and monitoring
 * - Graceful handling of email service failures
 * 
 * Registration Flow:
 * 1. Validate all input data (email, username, password, names)
 * 2. Check for existing users and handle unverified account conflicts
 * 3. Generate unique username if needed using intelligent algorithms
 * 4. Securely hash user password using bcrypt
 * 5. Create user account in database with all required fields
 * 6. Generate and store 6-digit OTP code with expiration
 * 7. Send OTP via email using professional templates
 * 8. Return success response with OTP verification instructions
 * 
 * Database Schema: Uses auth_schema.User model with complete profile fields
 * Security: Passwords hashed, email verification required, rate limiting applied
 * Error Handling: Comprehensive logging and user-friendly error messages
 * 
 * Response Format: Includes next steps for frontend to redirect to OTP verification
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password-utils"
import { generateUsernameWithPreference } from "@/lib/username-generator"
import { generateVerificationToken, generateTokenExpiration } from "@/lib/verification-utils"
import { emailService } from "@/lib/email"
import { otpService } from "@/lib/otp"
import { setCache } from "@/lib/cache"
import { z } from "zod"

// Validation schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Registration API endpoint called")
    
    // Parse and validate request body
    let body
    try {
      body = await request.json()
      console.log("📥 Request body received:", { ...body, password: '[HIDDEN]' })
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError)
      return NextResponse.json(
        { 
          message: "Invalid JSON in request body",
          error: "INVALID_JSON"
        },
        { status: 400 }
      )
    }
    
    // Validate input using Zod schema
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      console.error("❌ Validation failed:", validation.error.flatten().fieldErrors)
      return NextResponse.json(
        { 
          message: "Validation failed", 
          errors: validation.error.flatten().fieldErrors,
          error: "VALIDATION_FAILED"
        },
        { status: 400 }
      )
    }

    const { email, username, password, firstName, lastName } = validation.data
    console.log("✅ Input validation passed for user:", email)

    // Check database connection
    try {
      await prisma.$connect()
      console.log("✅ Database connection established")
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError)
      return NextResponse.json(
        { 
          message: "Database connection failed. Please try again later.",
          error: "DATABASE_CONNECTION_FAILED"
        },
        { status: 500 }
      )
    }    // Check if user already exists with enhanced error handling
    let existingUser
    try {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      })
      console.log("✅ User existence check completed")
    } catch (dbQueryError) {
      console.error("❌ Database query error during user check:", dbQueryError)
      return NextResponse.json(
        { 
          message: "Database query failed. Please try again later.",
          error: "DATABASE_QUERY_FAILED"
        },
        { status: 500 }
      )
    }

    if (existingUser) {
      // Handle unverified accounts
      if (!existingUser.isVerified) {
        const now = new Date()
        const verificationExpired = existingUser.emailVerificationExpires && existingUser.emailVerificationExpires < now
        const accountOld = (now.getTime() - existingUser.createdAt.getTime()) > (7 * 24 * 60 * 60 * 1000) // 7 days

        // If the unverified account is expired or old, delete it and continue with registration
        if (verificationExpired || accountOld) {
          console.log(`Cleaning up expired unverified account: ${existingUser.email}`)
          await prisma.user.delete({
            where: { id: existingUser.id }
          })
          // Continue with registration (don't return, let it proceed)
        } else {
          // Unverified account exists and hasn't expired yet
          const timeRemaining = existingUser.emailVerificationExpires 
            ? Math.max(0, Math.floor((existingUser.emailVerificationExpires.getTime() - Date.now()) / (1000 * 60)))
            : 0

          return NextResponse.json({
            status: "unverified_account_found",
            message: "An unverified account exists with this email or username",
            email: existingUser.email,
            username: existingUser.username,
            name: existingUser.name,
            timeRemainingMinutes: timeRemaining,
            options: {
              resendVerification: {
                action: "resend_verification",
                endpoint: "/api/auth/resend-verification",
                description: "Resend verification email to complete registration"
              },
              replaceAccount: {
                action: "replace_account", 
                endpoint: "/api/auth/replace-unverified",
                description: "Delete the unverified account and create a new one"
              },
              continueWithExisting: {
                action: "continue_with_existing",
                description: "Sign in with the existing account if you remember the password"
              }
            }
          }, { status: 200 })
        }
      } else {
        // User exists and is verified
        if (existingUser.email.toLowerCase() === email.toLowerCase()) {
          return NextResponse.json(
            { message: "An account with this email already exists" },
            { status: 409 }
          )
        }
        
        if (existingUser.username.toLowerCase() === username.toLowerCase()) {
          return NextResponse.json(
            { message: "Username is already taken" },
            { status: 409 }
          )
        }
      }    }// Generate final username (prefer user's choice if available)
    const finalUsername = await generateUsernameWithPreference(
      firstName || '', 
      lastName || '', 
      email,
      username
    )

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = generateTokenExpiration(24 * 60) // 24 hours    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: finalUsername,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        isVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })    // Send OTP email instead of verification link
    try {
      // Generate and store OTP
      const otp = otpService.generateOTP()
      await setCache(`otp:${newUser.email}:registration`, {
        code: otp,
        attempts: 0,
        createdAt: Date.now(),
        userId: newUser.id
      }, 600) // 10 minutes expiration for registration

      // Store OTP in database as backup
      await otpService.storeOTP(newUser.id, otp, 'registration')

      // Send OTP via email with production-ready error handling
      const emailResult = await emailService.sendOTPEmail(
        newUser.email,
        otp,
        'registration',
        newUser.name
      )

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error)
        
        // Provide user-friendly error message based on email service response
        const userMessage = emailResult.userMessage || 
          "Account created but verification email failed to send. Please request a new verification code."
        
        return NextResponse.json(
          { 
            message: userMessage,
            userId: newUser.id,
            emailSent: false,
            nextStep: {
              action: "retry_verification",
              redirectTo: `/auth/verify-otp?email=${encodeURIComponent(newUser.email)}&purpose=registration`,
              description: "Request a new verification code"
            }
          },
          { status: 202 }
        )
      }

      console.log("✅ OTP email sent successfully:", emailResult.messageId)
    } catch (emailError: any) {
      console.error("Failed to send OTP email:", emailError)
      
      // Extract user-friendly message from enhanced error
      const userMessage = emailError.userMessage || 
        emailError.message || 
        "Account created but verification email failed to send."
      
      return NextResponse.json(
        { 
          message: `${userMessage} Please request a new verification code.`,
          userId: newUser.id,
          emailSent: false,
          isEmailServiceError: emailError.isEmailServiceError || false,
          errorType: emailError.type || 'unknown',
          nextStep: {
            action: "retry_verification",
            redirectTo: `/auth/verify-otp?email=${encodeURIComponent(newUser.email)}&purpose=registration`,
            description: "You can request a new verification code from the verification page"
          }
        },
        { status: 202 }
      )
    }    return NextResponse.json({
      message: "Registration successful! Please check your email for a 6-digit verification code.",
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        name: newUser.name,
        isVerified: newUser.isVerified
      },
      nextStep: {
        action: "verify_otp",
        redirectTo: `/auth/verify-otp?email=${encodeURIComponent(newUser.email)}&purpose=registration`,
        description: "Enter the 6-digit code sent to your email"
      }
    }, { status: 201 })

  } catch (error: any) {
    // Enhanced error logging and handling
    console.error("❌ Registration API - Unexpected error occurred:")
    console.error("❌ Error type:", typeof error)
    console.error("❌ Error name:", error?.name)
    console.error("❌ Error message:", error?.message)
    console.error("❌ Error stack:", error?.stack)
    console.error("❌ Full error object:", error)
    
    // Handle different types of errors
    if (error?.name === 'PrismaClientKnownRequestError') {
      console.error("❌ Prisma known request error:", error.code, error.meta)
      return NextResponse.json(
        { 
          message: "Database operation failed. Please try again.",
          error: "DATABASE_OPERATION_FAILED",
          code: error.code
        },
        { status: 500 }
      )
    } else if (error?.name === 'PrismaClientUnknownRequestError') {
      console.error("❌ Prisma unknown request error")
      return NextResponse.json(
        { 
          message: "Unknown database error. Please try again.",
          error: "DATABASE_UNKNOWN_ERROR"
        },
        { status: 500 }
      )
    } else if (error?.name === 'PrismaClientValidationError') {
      console.error("❌ Prisma validation error")
      return NextResponse.json(
        { 
          message: "Database validation error. Please check your data.",
          error: "DATABASE_VALIDATION_ERROR"
        },
        { status: 400 }
      )
    } else {
      console.error("❌ Unexpected server error")
      return NextResponse.json(
        { 
          message: "Internal server error. Please try again later.",
          error: "INTERNAL_SERVER_ERROR"
        },
        { status: 500 }
      )
    }
  }
}
