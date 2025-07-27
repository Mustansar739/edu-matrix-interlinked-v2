import { Suspense } from 'react';
import { AuthSuccessContent } from '@/components/auth/auth-success';
import { Loader2 } from 'lucide-react';
import { Metadata } from 'next';

/**
 * Authentication Success Page - Production-Ready Generic Success Page
 * 
 * Purpose: Displays success messages for various authentication flows
 * including email verification, password reset completion, 2FA setup, etc.
 * 
 * Features:
 * - Generic success page that adapts based on URL parameters
 * - Professional success confirmation with clear next steps
 * - Responsive design with proper accessibility
 * - SEO-optimized with dynamic metadata
 * - Support for multiple success scenarios
 * 
 * Supported Success Types:
 * - email-verified: After email verification
 * - password-reset: After password reset completion  
 * - 2fa-enabled: After 2FA setup completion
 * - profile-updated: After profile changes
 * 
 * URL Parameters:
 * - type: Success type (required)
 * - email: User's email (optional, for personalization)
 * - next: Next page to redirect to (optional)
 * 
 * Usage Examples:
 * /auth/success?type=email-verified&email=user@example.com
 * /auth/success?type=password-reset&next=/dashboard
 */

export const metadata: Metadata = {
  title: "Success | Edu Matrix Interlinked",
  description: "Action completed successfully. Welcome to Edu Matrix Interlinked!",
};

function AuthSuccessContentWrapper() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <AuthSuccessContent />
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AuthSuccessContentWrapper />
    </Suspense>
  );
}
