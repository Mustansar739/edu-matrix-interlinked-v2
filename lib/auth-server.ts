/**
 * =============================================================================
 * AUTH SERVER UTILITIES - NODE.JS RUNTIME ONLY
 * =============================================================================
 * 
 * PURPOSE:
 * Server-side authentication utilities that require Node.js runtime.
 * This file contains all Node.js specific imports and functions that
 * cannot run in Edge Runtime environments.
 * 
 * ARCHITECTURE:
 * - Only runs in Node.js runtime (not Edge Runtime)
 * - Contains bcryptjs and other Node.js API dependencies
 * - Used by auth callbacks and API routes that run server-side
 * 
 * FEATURES:
 * - User registration with validation
 * - Password verification and hashing
 * - Email verification workflows
 * - Rate limiting checks
 * - User database operations
 * 
 * SECURITY:
 * - Secure password hashing with bcrypt
 * - Email verification tokens
 * - Comprehensive input validation
 * - Rate limiting protection
 * 
 * LAST UPDATED: 2025-01-06
 * =============================================================================
 */

import { hashPassword, verifyPassword } from "@/lib/password-utils"
import { generateVerificationToken, generateTokenExpiration } from "@/lib/verification-utils"
import { emailService } from "@/lib/email"
import { authLogger } from "@/lib/auth-logger"
import { authRateLimit } from "@/lib/auth-rate-limit"
import { prisma } from "@/lib/prisma"

/**
 * Simple username generator for registration
 */
async function generateUsernameFromName(name: string, email: string): Promise<string> {
  const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  
  // Try different patterns
  const patterns = [
    baseName,
    emailPrefix,
    `${baseName}${Date.now().toString().slice(-3)}`,
    `user${Date.now().toString().slice(-6)}`
  ]
  
  for (const pattern of patterns) {
    if (pattern.length >= 3) {
      const existing = await prisma.user.findUnique({
        where: { username: pattern }
      })
      if (!existing) {
        return pattern
      }
    }
  }
  
  // Fallback
  return `user${Date.now().toString().slice(-6)}`
}

/**
 * REGISTRATION FLOW - SERVER SIDE ONLY
 * Handles complete user registration with validation and verification
 */
export async function handleUserRegistration(email: string, password: string, name: string) {
  try {
    // Validate input
    if (!email || !password || !name) {
      throw new Error('Missing required fields')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Rate limiting check
    const registrationLimit = authRateLimit.checkRateLimit(email, 'registration')
    if (!registrationLimit.allowed) {
      const resetMinutes = registrationLimit.resetTime ? 
        Math.ceil((registrationLimit.resetTime.getTime() - Date.now()) / 1000 / 60) : 15
      throw new Error(`Too many registration attempts. Try again in ${resetMinutes} minutes`)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Generate unique username
    const username = await generateUsernameFromName(name, email)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = generateTokenExpiration(24) // 24 hours

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        username,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        isVerified: false,
        profileVisibility: 'PUBLIC'
      }
    })

    // Send verification email
    try {
      await emailService.sendEmailVerification({
        email: newUser.email,
        name: newUser.name,
        verificationToken
      })
      
      authLogger.logAuthEvent({
        type: 'registration_attempt',
        email: email
      })
    } catch (emailError) {
      authLogger.logAuthEvent({
        type: 'registration_failure',
        email: email,
        error: 'Email sending failed'
      })
      console.error('Failed to send verification email:', emailError)
    }

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        isVerified: newUser.isVerified
      }
    }

  } catch (error) {
    authLogger.logAuthEvent({
      type: 'registration_failure',
      email: email,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

/**
 * LOGIN VERIFICATION - SERVER SIDE ONLY
 * Handles password verification and user authentication
 */
export async function handleUserLogin(email: string, password: string) {
  try {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Rate limiting check
    const loginLimit = authRateLimit.checkRateLimit(email, 'login')
    if (!loginLimit.allowed) {
      const resetMinutes = loginLimit.resetTime ? 
        Math.ceil((loginLimit.resetTime.getTime() - Date.now()) / 1000 / 60) : 15
      throw new Error(`Too many login attempts. Try again in ${resetMinutes} minutes`)
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        password: true,
        isVerified: true,
        profilePictureUrl: true
      }
    })

    if (!user) {
      authLogger.logAuthEvent({
        type: 'login_failure',
        email: email,
        error: 'User not found'
      })
      throw new Error('Invalid credentials')
    }

    if (!user.password) {
      authLogger.logAuthEvent({
        type: 'login_failure',
        email: email,
        error: 'No password set'
      })
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      authLogger.logAuthEvent({
        type: 'login_failure',
        email: email,
        error: 'Invalid password'
      })
      throw new Error('Invalid credentials')
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    authLogger.logAuthEvent({
      type: 'login_attempt',
      email: email
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      isVerified: user.isVerified,
      image: user.profilePictureUrl
    }

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Authentication failed')
  }
}

/**
 * EMAIL VERIFICATION - SERVER SIDE ONLY
 * Handles email verification token validation
 */
export async function handleEmailVerification(token: string) {
  try {
    if (!token) {
      throw new Error('Verification token is required')
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      throw new Error('Invalid or expired verification token')
    }

    // Mark user as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: true
      }
    }

  } catch (error) {
    throw error
  }
}

/**
 * RESEND VERIFICATION EMAIL - SERVER SIDE ONLY
 * Generates new verification token and resends email
 */
export async function handleResendVerification(email: string) {
  try {
    if (!email) {
      throw new Error('Email is required')
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.isVerified) {
      throw new Error('Email is already verified')
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = generateTokenExpiration(24) // 24 hours

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      }
    })

    // Send verification email
    await emailService.sendEmailVerification({
      email: user.email,
      name: user.name,
      verificationToken
    })

    return { success: true }

  } catch (error) {
    throw error
  }
}
