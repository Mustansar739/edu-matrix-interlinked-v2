import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/lib/otp';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken } from '@/lib/auth-utils';
import { getCache, setCache, deleteCache, checkRateLimit } from '@/lib/cache';

/**
 * OTP Verification API Route - Production-Ready Email Verification System
 * 
 * Purpose: Validates 6-digit OTP codes and handles post-verification actions
 * 
 * Features:
 * - Dual verification (Redis + traditional database)
 * - Rate limiting to prevent brute force attacks (5 attempts per 15 minutes)
 * - Purpose-specific post-verification actions
 * - Comprehensive attempt tracking and logging
 * - Automatic cleanup of expired/invalid codes
 * 
 * Security Features:
 * - Maximum 3 attempts per OTP before invalidation
 * - Rate limiting per email address
 * - Secure token generation for password resets
 * - Audit logging of all attempts
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456",
 *   "purpose": "registration" | "login" | "password-reset" | "2fa-setup"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = 'registration' } = await request.json();

    // Enhanced validation with detailed error messages
    if (!email || !otp || !purpose) {
      console.log('❌ Validation failed:', { email: !!email, otp: !!otp, purpose: !!purpose });
      return NextResponse.json(
        { error: 'Email, OTP, and purpose are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. Please enter 6 digits.' },
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

    // Rate limit OTP verification attempts with Redis
    const rateLimit = await checkRateLimit(`otp-verify:${email}`, 5, 900); // 5 attempts per 15 minutes
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
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
    }    // Check OTP from Redis first with enhanced debugging
    const otpCacheKey = `otp:${email}:${purpose}`;
    const otpData = await getCache<{code: string, attempts: number, expires: number}>(otpCacheKey);
    
    console.log('🔍 OTP Verification Debug:', {
      email,
      purpose,
      otpReceived: otp,
      cacheKey: otpCacheKey,
      otpDataExists: !!otpData,
      storedCode: otpData?.code || 'NOT_FOUND',
      attempts: otpData?.attempts || 0
    });
    
    if (!otpData || typeof otpData !== 'object' || !otpData.code) {
      console.log('❌ OTP not found in cache for key:', otpCacheKey);
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 400 }
      );
    }

    // Check if too many attempts
    if (otpData.attempts >= 3) {
      await deleteCache(`otp:${email}:${purpose}`);
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP with enhanced logging
    if (otpData.code !== otp) {
      console.log('❌ OTP mismatch:', {
        stored: otpData.code,
        received: otp,
        match: otpData.code === otp
      });
      
      // Increment attempts
      const updatedOtpData = { ...otpData, attempts: otpData.attempts + 1 };
      await setCache(otpCacheKey, updatedOtpData, 300);
      
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    console.log('✅ OTP verification successful for:', { email, purpose });

    // OTP is valid - remove from Redis
    await deleteCache(otpCacheKey);

    // Also verify with traditional service for compatibility
    const isValid = await otpService.verifyOTP(user.id, otp, purpose);
    
    if (!isValid) {
      console.log('❌ Traditional OTP verification failed for:', { userId: user.id, purpose });
      
      // Log failed attempt
      await prisma.authAttempt.create({
        data: {
          userId: user.id,
          email: user.email,
          status: 'FAILED',
          userAgent: request.headers.get('user-agent') || ''
        }
      });

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    console.log('✅ Both Redis and traditional OTP verification successful');

    // Log successful attempt
    await prisma.authAttempt.create({
      data: {
        userId: user.id,
        email: user.email,
        status: 'SUCCESS',
        userAgent: request.headers.get('user-agent') || ''
      }
    });

    // Handle different purposes with enhanced success tracking
    let responseData: any = { 
      message: 'Verification successful',
      purpose: purpose,
      nextStep: getNextStepMessage(purpose)
    };

    switch (purpose) {
      case 'registration':
        // Mark email as verified (using correct field name)
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true }
        });
        console.log('✅ User email verified for registration:', user.email);
        break;

      case 'password-reset':
        // Generate password reset token (using correct model)
        const resetToken = generatePasswordResetToken();
        await prisma.passwordReset.create({
          data: {
            userId: user.id,
            token: resetToken,
            expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
          }
        });
        responseData.resetToken = resetToken;
        console.log('✅ Password reset token generated for:', user.email);
        break;

      case 'login':
        // This would typically be handled by the login flow
        console.log('✅ Login OTP verified for:', user.email);
        break;

      case '2fa-setup':
        // This is handled by the 2FA setup process
        console.log('✅ 2FA setup OTP verified for:', user.email);
        break;
    }

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get next step message for user guidance
 */
function getNextStepMessage(purpose: string): string {
  switch (purpose) {
    case 'registration':
      return 'You can now sign in to your account';
    case 'password-reset':
      return 'You will be redirected to reset your password';
    case 'login':
      return 'You will be redirected to your dashboard';
    case '2fa-setup':
      return 'Two-factor authentication is now enabled';
    default:
      return 'Verification complete';
  }
}
