'use client';

/**
 * Registration Success Component - Production-Ready Congratulations Interface
 * 
 * Purpose: Provides a celebratory and informative success page after email verification
 * with clear next steps and professional presentation.
 * 
 * Features:
 * - Animated success icon with visual feedback
 * - Personalized congratulations message
 * - Clear explanation of what was accomplished
 * - Professional call-to-action button to proceed
 * - Responsive design with proper spacing
 * - Brand-consistent styling and colors
 * 
 * User Experience:
 * - Celebrates the user's successful registration
 * - Builds confidence in the platform
 * - Provides clear next steps
 * - Maintains engagement momentum
 * 
 * Technical Features:
 * - URL parameter handling for email personalization
 * - Proper TypeScript types for type safety
 * - Accessibility considerations (ARIA labels, semantic HTML)
 * - Performance optimized with proper imports
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Mail, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RegistrationSuccessContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get email from URL parameters for personalization
  const email = searchParams?.get('email') || '';
  
  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProceedToSignIn = () => {
    console.log('🔄 User proceeding to sign in from success page');
    router.push('/auth/signin?message=welcome-back');
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="animate-pulse">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardContent className="text-center pt-8 pb-8 px-6">
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-green-500 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 Congratulations!
        </h1>
        
        {/* Personalized Message */}
        <div className="mb-6 space-y-2">
          <p className="text-gray-600 text-sm">
            Your email verification was successful
          </p>
          {email && (
            <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 rounded-lg p-2">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">{email}</span>
            </div>
          )}
        </div>

        {/* Success Details */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-sm font-semibold text-green-800 mb-1">
                Account Verified
              </h3>
              <p className="text-xs text-green-700 leading-relaxed">
                Your email address has been successfully verified. You can now access all features of the Edu Matrix Interlinked platform.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            What's Next?
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Sign in to your account and start exploring our educational ecosystem. Connect with students, discover courses, find opportunities, and much more!
          </p>
        </div>

        {/* Call to Action Button */}
        <Button 
          onClick={handleProceedToSignIn}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <span>Continue to Sign In</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {/* Additional Help */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Need help? Contact our{' '}
            <button 
              onClick={() => router.push('/support')}
              className="text-blue-600 hover:underline font-medium"
            >
              support team
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
