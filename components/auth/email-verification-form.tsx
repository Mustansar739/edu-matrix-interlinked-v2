"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import axios from "axios"

// Define the verification states for better state management
type VerificationState = 'idle' | 'verifying' | 'verified' | 'failed' | 'resending'

export function EmailVerificationForm() {
  const [state, setState] = useState<VerificationState>('idle')
  const [error, setError] = useState("")
  const [resendEmail, setResendEmail] = useState("")
  const [resendSuccess, setResendSuccess] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token")

  // Verify email with token - Define before useEffect to avoid dependency issues
  const verifyEmailWithToken = useCallback(async (verificationToken: string) => {
    setError("")
    console.log('[EmailVerification] Starting verification process with token...')

    try {
      const response = await axios.post("/api/auth/verify-email", {
        token: verificationToken
      })

      console.log('[EmailVerification] Verification successful:', response.data)
      setState('verified')
      
      // Redirect after showing success message
      setTimeout(() => {
        console.log('[EmailVerification] Redirecting to signin...')
        router.push("/auth/signin?message=Email verified successfully! Please sign in.")
      }, 2000)

    } catch (error: any) {
      console.error('[EmailVerification] Verification failed:', error.response?.data || error.message)
      
      setState('failed')
      
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || "Verification failed"
        
        if (errorMessage.includes('already verified')) {
          // User is already verified, redirect them to signin
          console.log('[EmailVerification] User already verified, redirecting...')
          setState('verified')
          setTimeout(() => {
            router.push("/auth/signin?message=Your email is already verified. Please sign in.")
          }, 1500)
        } else if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          setError("This verification link has expired or is invalid. Please request a new one below.")
        } else {
          setError(errorMessage)
        }
      } else {
        setError("Failed to verify email. Please try again or request a new verification link.")
      }
    }
  }, [router])

  // Auto-verify when component mounts if token is present
  useEffect(() => {
    if (token) {
      console.log('[EmailVerification] Token detected, starting auto-verification:', token)
      setState('verifying')
      verifyEmailWithToken(token)
    }
  }, [token, verifyEmailWithToken]) // Include token and verifyEmailWithToken dependencies

  // Resend verification email
  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return

    setState('resending')
    setError("")
    setResendSuccess(false)

    try {
      await axios.post("/api/auth/resend-verification", {
        email: resendEmail
      })

      setResendSuccess(true)
      setResendEmail("")
      setState('idle')
      
    } catch (error: any) {
      setState('failed')
      if (error.response?.data?.message) {
        setError(error.response.data.message)
      } else {
        setError("Failed to resend verification email. Please try again.")
      }
    }
  }
  // Render different states
  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-500" />
                  <h2 className="text-2xl font-bold">Verifying Your Email...</h2>
                  <p className="text-muted-foreground">
                    Processing your verification link. Please wait...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'verified':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                  <h2 className="text-2xl font-bold text-green-800">Email Verified!</h2>
                  <p className="text-muted-foreground">
                    Your email has been successfully verified. Welcome to Edu Matrix Interlinked!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to sign in page...
                  </p>
                  <div className="pt-4">
                    <Link href="/auth/signin">
                      <Button className="w-full">
                        Continue to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'failed':
      case 'idle':
      case 'resending':
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  {state === 'failed' && token ? (
                    <>
                      <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                      Verification Failed
                    </>
                  ) : (
                    <>
                      <Mail className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                      Verify Your Email
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-center">
                  {state === 'failed' && token 
                    ? "There was a problem verifying your email address."
                    : "Check your email for a verification link, or request a new one below."
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {resendSuccess && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Verification email sent successfully! Please check your inbox and spam folder.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                      {state === 'failed' && token 
                        ? "Request a New Verification Link" 
                        : "Didn't receive the email?"
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {state === 'failed' && token 
                        ? "The verification link may have expired. Enter your email below to get a new one."
                        : "Enter your email address and we'll send you a new verification link."
                      }
                    </p>
                  </div>

                  <form onSubmit={handleResendVerification} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resend-email">Email Address</Label>
                      <Input
                        id="resend-email"
                        type="email"
                        placeholder="Enter your email"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        required
                        disabled={state === 'resending'}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={state === 'resending' || !resendEmail}>
                      {state === 'resending' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Send Verification Email
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>

              <div className="px-6 pb-6">
                <div className="text-sm text-center text-muted-foreground">
                  Remember your password?{" "}
                  <Link
                    href="/auth/signin"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )
    }
  }

  return renderContent()
}
