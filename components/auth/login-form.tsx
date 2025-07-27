"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// NextAuth 5 error types that can appear in URL
const ERROR_MESSAGES = {
  Signin: "Try signing in with a different account.",
  OAuthSignin: "Try signing in with a different account.",
  OAuthCallback: "Try signing in with a different account.",
  OAuthCreateAccount: "Try signing in with a different account.",
  EmailCreateAccount: "Try signing in with a different account.",
  Callback: "Try signing in with a different account.",
  OAuthAccountNotLinked: "To confirm your identity, sign in with the same account you used originally.",
  EmailSignin: "The email could not be sent.",
  CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  default: "Unable to sign in."
}

export function LoginForm() {  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle NextAuth 5 URL parameters on component mount
  useEffect(() => {
    const urlError = searchParams?.get('error')
    
    console.log('[LoginForm] URL Parameters:', {
      error: urlError,
      allParams: Object.fromEntries(searchParams?.entries() || [])
    })
    
    // Check for NextAuth 5 error in URL
    if (urlError) {
      console.log('[LoginForm] NextAuth error detected:', urlError)
      setError(ERROR_MESSAGES[urlError as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default)
    }
    
    // Check for success message (e.g., after email verification)
    const successMessage = searchParams?.get('message')
    const messageType = searchParams?.get('type')
    
    // Handle different types of messages
    if (successMessage) {
      switch (successMessage) {
        case 'welcome-back':
          setSuccess('🎉 Email verified successfully! Please sign in to continue.');
          break;
        case 'registration-complete':
          setSuccess('✅ Registration completed! Please sign in to access your account.');
          break;
        case 'password-reset-complete':
          setSuccess('🔐 Password reset completed! Please sign in with your new password.');
          break;
        default:
          if (messageType === 'success') {
            setSuccess(successMessage);
          }
      }
    }

    // Clear URL parameters after reading them
    if (urlError || successMessage) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('message')
      newUrl.searchParams.delete('type')
      newUrl.searchParams.delete('callbackUrl')
      router.replace(newUrl.pathname, { scroll: false })
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      console.log('[LoginForm] Attempting sign in with:', { email })
      
      // Check if user exists and is verified before attempting sign-in
      try {
        const emailCheckResponse = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
        
        if (emailCheckResponse.ok) {
          const emailCheckResult = await emailCheckResponse.json()
          
          if (!emailCheckResult.exists) {
            setError('This email is not registered. Please create your account first.')
            setIsLoading(false)
            return
          }
          
          if (emailCheckResult.exists && !emailCheckResult.verified) {
            setError('Please verify your email address first. Check your inbox for the verification link.')
            setIsLoading(false)
            return
          }
        } else if (emailCheckResponse.status === 429) {
          setError('Too many attempts. Please try again later.')
          setIsLoading(false)
          return
        } else if (emailCheckResponse.status >= 500) {
          console.warn('Email check API error, proceeding with sign-in')
        }
      } catch (checkError) {
        console.warn('Email check failed due to network error, proceeding with sign-in:', checkError)
      }

      console.log('[LoginForm] Attempting sign in with:', { 
        email, 
        timestamp: new Date().toISOString()
      })      // SIMPLIFIED SOLUTION: Use NextAuth with proper redirect handling
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // Handle redirect manually
      })
      
      console.log('[LoginForm] SignIn result:', result)
      
      if (result?.error) {
        // Handle specific NextAuth errors
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password. Please check your credentials.')
        } else {
          setError(ERROR_MESSAGES[result.error as keyof typeof ERROR_MESSAGES] || 'Authentication failed. Please try again.')
        }
        setIsLoading(false)
      } else if (result?.ok) {
        // SUCCESS: Show redirecting state and then redirect
        console.log('[LoginForm] SignIn successful, redirecting...')
        setIsRedirecting(true)
        
        // Use setTimeout to ensure the redirecting state is shown
        setTimeout(() => {
          // Force a page redirect to ensure clean navigation
          window.location.href = '/dashboard'
        }, 500)
      } else {
        setError('Authentication failed. Please try again.')
        setIsLoading(false)
      }

    } catch (error: any) {
      console.error("Login error:", error)
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }
  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8 text-center">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <div className="text-lg font-medium">Redirecting to dashboard...</div>
                <div className="text-sm text-muted-foreground">Please wait while we log you in</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">        <Card>
          <CardHeader className="space-y-4 text-center">
            {/* Logo */}
            <div className="flex justify-center">
              <Image
                src="/logo-icon.svg"
                alt="Edu Matrix Interlinked"
                width={48}
                height={48}
                className="h-12 w-12"
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Edu Matrix Interlinked
            </CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Success message display */}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Error message display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={isLoading || isRedirecting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New to Edu Matrix Interlinked ?
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild disabled={isLoading || isRedirecting}>
              <Link href="/auth/register">
                Create your account
              </Link>
            </Button>

            {/* Footer */}
            <div className="pt-4 mt-2 border-t text-center">
              <div className="text-xs text-muted-foreground mb-1">
                Edu Matrix Interlinked Platform
              </div>
              <div className="text-xs text-muted-foreground">
                © 2025 All rights reserved.
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
