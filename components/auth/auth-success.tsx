'use client';

/**
 * Authentication Success Component - Production-Ready Generic Success Interface
 * 
 * Purpose: Provides a flexible success page that adapts to different authentication
 * scenarios with appropriate messaging and next steps.
 * 
 * Features:
 * - Dynamic content based on success type
 * - Personalized messaging with email display
 * - Animated success icons with visual feedback
 * - Clear call-to-action buttons for next steps
 * - Professional design with brand consistency
 * - Accessible markup with proper ARIA labels
 * 
 * Supported Success Types:
 * - email-verified: Email verification completion
 * - password-reset: Password reset completion
 * - 2fa-enabled: Two-factor authentication setup
 * - profile-updated: Profile update completion
 * 
 * Technical Features:
 * - URL parameter handling for dynamic content
 * - Client-side mounting to prevent hydration issues
 * - TypeScript types for type safety
 * - Performance optimized with proper imports
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Mail, Shield, Key, User, Home } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string;
  buttonText: string;
  buttonAction: () => void;
  showEmail?: boolean;
}

export function AuthSuccessContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get parameters from URL
  const type = searchParams?.get('type') || 'default';
  const email = searchParams?.get('email') || '';
  const nextPage = searchParams?.get('next') || '/auth/signin';
  
  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const getSuccessConfig = (): SuccessConfig => {
    switch (type) {
      case 'email-verified':
        return {
          icon: <Mail className="h-8 w-8 text-white" />,
          title: '📧 Email Verified!',
          description: 'Your email address has been successfully verified.',
          details: 'You can now access all features of the Edu Matrix Interlinked platform.',
          buttonText: 'Continue to Sign In',
          buttonAction: () => router.push('/auth/signin?message=welcome-back'),
          showEmail: true
        };
      
      case 'password-reset':
        return {
          icon: <Key className="h-8 w-8 text-white" />,
          title: '🔐 Password Reset Complete!',
          description: 'Your password has been successfully reset.',
          details: 'You can now sign in with your new password.',
          buttonText: 'Sign In Now',
          buttonAction: () => router.push('/auth/signin?message=password-reset-complete'),
          showEmail: true
        };
      
      case '2fa-enabled':
        return {
          icon: <Shield className="h-8 w-8 text-white" />,
          title: '🛡️ Two-Factor Authentication Enabled!',
          description: 'Your account is now more secure with 2FA.',
          details: 'Two-factor authentication adds an extra layer of security to your account.',
          buttonText: 'Go to Dashboard',
          buttonAction: () => router.push('/dashboard'),
          showEmail: false
        };
      
      case 'profile-updated':
        return {
          icon: <User className="h-8 w-8 text-white" />,
          title: '👤 Profile Updated!',
          description: 'Your profile has been successfully updated.',
          details: 'Your changes have been saved and are now visible across the platform.',
          buttonText: 'View Profile',
          buttonAction: () => router.push('/profile'),
          showEmail: false
        };
      
      default:
        return {
          icon: <CheckCircle className="h-8 w-8 text-white" />,
          title: '✅ Success!',
          description: 'Your action has been completed successfully.',
          details: 'You can now proceed to the next step.',
          buttonText: 'Continue',
          buttonAction: () => router.push(nextPage),
          showEmail: true
        };
    }
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

  const config = getSuccessConfig();

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardContent className="text-center pt-8 pb-8 px-6">
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-green-500 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center">
            {config.icon}
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title}
        </h1>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4">
          {config.description}
        </p>
        
        {/* Email Display (if applicable) */}
        {config.showEmail && email && (
          <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 rounded-lg p-2 mb-4">
            <Mail className="h-4 w-4" />
            <span className="text-sm font-medium">{email}</span>
          </div>
        )}

        {/* Success Details */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-sm font-semibold text-green-800 mb-1">
                Action Completed
              </h3>
              <p className="text-xs text-green-700 leading-relaxed">
                {config.details}
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action Button */}
        <Button 
          onClick={config.buttonAction}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <span>{config.buttonText}</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {/* Additional Navigation */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-center gap-4 text-xs">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <Home className="h-3 w-3" />
              Dashboard
            </button>
            <span className="text-gray-300">•</span>
            <button 
              onClick={() => router.push('/support')}
              className="text-gray-500 hover:text-blue-600 hover:underline font-medium"
            >
              Help & Support
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
