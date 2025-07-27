"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

// NextAuth 5 official error messages
const ERROR_MESSAGES = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  CredentialsSignin: "Invalid email or password. Please check your credentials and try again.",
  Signin: "Invalid email or password. Please check your credentials and try again.",
  OAuthSignin: "Try signing in with a different account.",
  OAuthCallback: "Try signing in with a different account.",
  OAuthCreateAccount: "Try signing in with a different account.",
  EmailCreateAccount: "Try signing in with a different account.",
  Callback: "Try signing in with a different account.",
  OAuthAccountNotLinked: "To confirm your identity, sign in with the same account you used originally.",
  EmailSignin: "The email could not be sent.",
  CallbackRouteError: "Authentication failed. Please try again.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An error occurred during authentication.",
}

export function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error") as keyof typeof ERROR_MESSAGES || "Default"
  const message = searchParams?.get("message") || ""
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4 dark:from-red-950 dark:to-orange-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-200">
            Authentication Error
          </CardTitle>
          <CardDescription>
            Something went wrong during authentication
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {message || ERROR_MESSAGES[error] || ERROR_MESSAGES.Default}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                Try Sign In Again
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                Go to Home
              </Link>
            </Button>
            
            <Button variant="ghost" asChild className="w-full">
              <Link href="/auth/register">
                Create New Account
              </Link>
            </Button>
          </div>
          
          {/* Help text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>If you continue to experience issues, please contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
