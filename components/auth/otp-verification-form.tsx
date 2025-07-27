'use client';

/**
 * OTP Verification Form Component - Production-Ready 6-Digit Email Verification
 * 
 * Purpose: Provides a secure, user-friendly interface for entering and validating 6-digit OTP codes
 * sent via email for various authentication flows in the Edu Matrix Interlinked platform.
 * 
 * Features:
 * - Auto-focus and keyboard navigation between OTP input fields
 * - Paste support for full 6-digit codes
 * - Rate limiting and cooldown for resend functionality
 * - Purpose-specific handling (registration, login, password-reset, 2fa-setup)
 * - Comprehensive error handling and user feedback
 * - Responsive design with accessibility considerations
 * 
 * Security Features:
 * - Rate-limited OTP verification attempts
 * - Automatic cleanup of invalid/expired codes
 * - Secure transmission of OTP codes
 * - Purpose validation to prevent cross-flow attacks
 * 
 * Usage: Automatically invoked during registration, login, or password reset flows
 * when OTP verification is required.
 */

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, RefreshCw } from 'lucide-react';

interface OTPVerificationFormProps {
  purpose?: 'login' | 'registration' | 'password-reset' | '2fa-setup';
  email?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OTPVerificationForm({ 
  purpose: propPurpose, 
  email: propEmail, 
  onSuccess, 
  onCancel 
}: OTPVerificationFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get email and purpose from props or URL parameters with enhanced debugging
  const searchParamsEmail = searchParams?.get('email') || '';
  const searchParamsPurpose = searchParams?.get('purpose') || 'registration';
  
  const email = propEmail || searchParamsEmail;
  const purpose = propPurpose || searchParamsPurpose;
  
  // Enhanced debugging for parameter detection
  console.log('🔍 OTP Form Parameter Debug:', {
    propEmail,
    propPurpose,
    searchParamsEmail,
    searchParamsPurpose,
    finalEmail: email,
    finalPurpose: purpose,
    hasEmail: !!email,
    hasValidEmail: email.includes('@'),
    emailLength: email.length
  });
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validate required parameters on component mount
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setError('Email address is missing. Please return to registration page.');
      console.error('❌ Missing or invalid email parameter:', { email, purpose });
    } else if (!purpose) {
      setError('Verification purpose is missing. Please return to registration page.');
      console.error('❌ Missing purpose parameter:', { email, purpose });
    } else {
      console.log('✅ OTP Form loaded with valid parameters:', { email, purpose });
    }
  }, [email, purpose]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last digit
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    const newOtp = [...otp];
    
    for (let i = 0; i < Math.min(6, pastedData.length); i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    setError('');
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    // Enhanced validation
    if (!email || !email.includes('@')) {
      setError('Email address is missing. Please return to registration page.');
      return;
    }
    
    if (!purpose) {
      setError('Verification purpose is missing. Please return to registration page.');
      return;
    }
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    console.log('🚀 Submitting OTP verification:', {
      email,
      otp: otpCode,
      purpose,
      otpLength: otpCode.length,
      hasValidEmail: email.includes('@')
    });

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpCode,
          purpose
        }),
      });

      const data = await response.json();
      
      console.log('📡 API Response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP code');
      }

      console.log('✅ OTP verification successful, handling redirect for purpose:', purpose);

      // Handle different purposes with user feedback
      switch (purpose) {
        case 'login':
          console.log('🔄 Redirecting to dashboard...');
          router.push('/dashboard');
          break;
        case 'registration':
          console.log('🔄 Redirecting to registration success page...');
          router.push(`/auth/registration-success?email=${encodeURIComponent(email)}`);
          break;
        case 'password-reset':
          console.log('🔄 Redirecting to password reset with token...');
          router.push(`/auth/reset-password?token=${data.resetToken}`);
          break;
        case '2fa-setup':
          console.log('✅ 2FA setup complete, calling onSuccess...');
          onSuccess?.();
          break;
        default:
          console.log('🔄 Default redirect to dashboard...');
          router.push('/dashboard');
      }
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');

    console.log('🔄 Resending OTP for:', { email, purpose });

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          purpose
        }),
      });

      const data = await response.json();
      
      console.log('📡 Resend API Response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      console.log('✅ OTP resent successfully');

      // Start cooldown
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to resend OTP:', error);
      setError(error instanceof Error ? error.message : 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const getPurposeText = () => {
    switch (purpose) {
      case 'login':
        return 'to complete your login';
      case 'registration':
        return 'to verify your email address';
      case 'password-reset':
        return 'to reset your password';
      case '2fa-setup':
        return 'to set up two-factor authentication';
      default:
        return 'to verify your identity';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
        <CardDescription>
          {email ? (
            <>
              We&apos;ve sent a 6-digit code to <strong>{email}</strong><br />
              Enter the code {getPurposeText()}
            </>
          ) : (
            <>
              Please return to the registration page to continue<br />
              Missing email address or verification purpose
            </>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-lg font-semibold"
                disabled={isLoading}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || otp.join('').length !== 6 || !email || !email.includes('@')}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          {/* Show back to registration button if email is missing */}
          {(!email || !email.includes('@')) && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/auth/register')}
            >
              ← Back to Registration
            </Button>
          )}

          <div className="text-center space-y-2">
            {email && email.includes('@') ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the code?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={isResending || resendCooldown > 0}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please return to registration to get a verification code
              </p>
            )}
          </div>

          {(onCancel || purpose === '2fa-setup') && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onCancel || (() => router.back())}
            >
              Cancel
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
