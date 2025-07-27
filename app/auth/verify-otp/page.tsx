import { Suspense } from 'react';
import { OTPVerificationForm } from '@/components/auth/otp-verification-form';
import { Loader2 } from 'lucide-react';

/**
 * OTP Verification Page - Production-Ready Email Verification System
 * 
 * Purpose: Provides a secure 6-digit OTP verification interface for various authentication flows
 * 
 * Features:
 * - Supports multiple verification purposes (registration, login, password-reset, 2fa-setup)
 * - Automatic purpose detection from URL parameters
 * - Responsive design with error handling
 * - Fallback loading states and proper Suspense boundaries
 * 
 * URL Parameters:
 * - email: User's email address (required)
 * - purpose: Verification purpose (defaults to 'registration')
 * 
 * Usage Examples:
 * /auth/verify-otp?email=user@example.com&purpose=registration
 * /auth/verify-otp?email=user@example.com&purpose=login
 * 
 * Fix: Properly handles URL parameters within Suspense boundary for Next.js 15
 */

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function OTPVerificationContent({ searchParams }: PageProps) {
  // Extract email and purpose from URL parameters
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';
  const purpose = typeof params.purpose === 'string' ? params.purpose : 'registration';

  console.log('🔍 OTP Page URL Parameters:', { email, purpose, params });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      {/* Pass URL parameters directly to OTP Form */}
      <OTPVerificationForm 
        email={email}
        purpose={purpose as 'registration' | 'login' | 'password-reset' | '2fa-setup'}
      />
    </div>
  );
}

export default function OTPVerificationPage({ searchParams }: PageProps) {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OTPVerificationContent searchParams={searchParams} />
    </Suspense>
  );
}
