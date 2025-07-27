import { Suspense } from 'react';
import { RegistrationSuccessContent } from '@/components/auth/registration-success';
import { Loader2 } from 'lucide-react';
import { Metadata } from 'next';

/**
 * Registration Success Page - Production-Ready Success Confirmation
 * 
 * Purpose: Displays a congratulations message after successful email verification
 * and provides clear next steps for the user to complete their journey.
 * 
 * Features:
 * - Professional congratulations message with brand consistency
 * - Clear call-to-action to proceed to sign in
 * - User-friendly design with proper spacing and typography
 * - Responsive layout that works on all devices
 * - Proper SEO metadata for search engines
 * 
 * User Flow Context:
 * Registration → Email Verification → OTP Verification → SUCCESS PAGE → Sign In
 * 
 * URL Parameters:
 * - email: User's email address (optional, for personalization)
 * 
 * Usage Examples:
 * /auth/registration-success?email=user@example.com
 * /auth/registration-success
 */

export const metadata: Metadata = {
  title: "Registration Successful | Edu Matrix Interlinked",
  description: "Your email has been verified successfully. Welcome to the Edu Matrix Interlinked community!",
};

function RegistrationSuccessContentWrapper() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <RegistrationSuccessContent />
    </div>
  );
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RegistrationSuccessContentWrapper />
    </Suspense>
  );
}
