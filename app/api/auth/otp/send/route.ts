import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/lib/otp';
import { emailService } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, setCache } from '@/lib/cache';

/**
 * OTP Send API Route - Production-Ready Email Verification System
 * 
 * Purpose: Generates and sends 6-digit OTP codes via email for various authentication flows
 * 
 * Features:
 * - Rate limiting to prevent abuse (3 requests per 5 minutes per email)
 * - Redis caching for OTP storage with automatic expiration
 * - Dual storage (Redis + traditional) for compatibility
 * - Purpose-specific OTP generation (registration, login, password-reset, 2fa-setup)
 * - Professional email templates with proper branding
 * - Comprehensive error handling and logging
 * 
 * Security Features:
 * - User validation before sending OTP
 * - Rate limiting per email address
 * - Secure OTP generation with expiration
 * - Failed attempt tracking
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "purpose": "registration" | "login" | "password-reset" | "2fa-setup"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { email, purpose = 'registration' } = await request.json();

    // Validate required fields
    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'Email and purpose are required' },
        { status: 400 }
      );
    }

    // Validate purpose parameter
    const validPurposes = ['registration', 'login', 'password-reset', '2fa-setup'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: 'Invalid purpose parameter' },
        { status: 400 }
      );
    }

    // Rate limit OTP requests with Redis
    const rateLimit = await checkRateLimit(`otp-send:${email}`, 3, 300); // 3 requests per 5 minutes
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }    // Generate and store OTP in Redis
    const otp = otpService.generateOTP();
    await setCache(`otp:${email}:${purpose}`, {
      code: otp,
      attempts: 0,
      createdAt: Date.now(),
      userId: user.id
    }, 300); // 5 minutes expiration

    // Also store with traditional service for compatibility
    await otpService.storeOTP(user.id, otp, purpose);

    // Send OTP via email with proper purpose text
    try {
      const purposeText = getPurposeText(purpose);
      await emailService.sendOTPEmail(user.email, otp, purposeText, user.name);
      
      // Log successful send for monitoring
      console.log(`✅ OTP sent successfully to ${email} for ${purpose}`);
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Verification code sent successfully',
        purpose: purpose
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ OTP send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Convert purpose code to human-readable text for email
 */
function getPurposeText(purpose: string): string {
  switch (purpose) {
    case 'registration':
      return 'verify your email address';
    case 'login':
      return 'complete your login';
    case 'password-reset':
      return 'reset your password';
    case '2fa-setup':
      return 'set up two-factor authentication';
    default:
      return 'verify your identity';
  }
}
