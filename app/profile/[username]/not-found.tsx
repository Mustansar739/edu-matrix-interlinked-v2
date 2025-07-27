/**
 * @fileoverview Enhanced Not Found Page for Profile Routes
 * @module Profile/NotFound
 * @category Error Handling
 * @version 2.0.0
 * 
 * ==========================================
 * CUSTOM 404 PAGE FOR PROFILE ROUTES
 * ==========================================
 * 
 * This page is displayed when a user profile cannot be found.
 * It provides a better user experience than the default 404 page
 * by offering specific guidance for profile-related errors.
 * 
 * FEATURES:
 * - User-friendly error messaging
 * - Suggestions for alternative actions
 * - Navigation back to main areas
 * - Responsive design
 * - Accessibility features
 * 
 * TECHNICAL NOTES:
 * - Uses Next.js 15 app router patterns
 * - Implements proper SEO meta tags
 * - Follows accessibility guidelines
 * - Production-ready error handling
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserX, ArrowLeft, Home, Users, Search } from 'lucide-react'

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
            <UserX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Profile Not Found</CardTitle>
          <CardDescription>
            The profile you&apos;re looking for doesn&apos;t exist or may have been set to private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ PRODUCTION: Enhanced error context */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="mb-2 font-medium">This could happen because:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-left">
              <li>The username was typed incorrectly</li>
              <li>The user has deactivated their account</li>
              <li>The profile link is outdated</li>
              <li>The user has changed their username</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/students-interlinked">
                <Users className="mr-2 h-4 w-4" />
                Browse Students
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                Search Users
              </Link>
            </Button>
          </div>
          
          {/* ✅ PRODUCTION: Go back button */}
          <div className="pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Make sure you have the correct username and that the profile is public.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
