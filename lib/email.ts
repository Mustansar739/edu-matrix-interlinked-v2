// ==========================================
// EMAIL CONFIGURATION - RESEND INTEGRATION
// Production-Ready Email Service with Resend Default Domain
// Handles API key validation and client initialization with production settings
// ==========================================

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { EmailVerificationTemplate } from '@/components/emails/email-verification'
import { PasswordResetTemplate } from '@/components/emails/password-reset'
import { WelcomeTemplate } from '@/components/emails/welcome'
import { OTPTemplate } from '@/components/emails/otp'

// ==========================================
// ENVIRONMENT CONFIGURATION & VALIDATION
// Comprehensive validation for production-ready operation
// ==========================================

/**
 * Email service configuration interface
 * Defines all required environment variables for production-ready operation
 */
interface EmailConfig {
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  RESEND_FROM_NAME: string
  NEXTAUTH_URL: string
}

/**
 * Validates and configures email service environment for production-ready operation
 * Ensures all required environment variables are present and properly configured
 * @returns EmailConfig object with validated settings
 */
function validateEmailConfig(): EmailConfig {
  const requiredEnvVars = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME: process.env.RESEND_FROM_NAME,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  }

  // Check for missing environment variables - all are required for production-ready operation
  const missing = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error(`❌ Missing required email environment variables: ${missing.join(', ')}`)
    throw new Error(`Email service requires all environment variables: ${missing.join(', ')}. Please configure these in your .env file.`)
  }

  // Validate Resend API key format
  const apiKey = requiredEnvVars.RESEND_API_KEY

  if (apiKey && !apiKey.startsWith('re_')) {
    console.warn('⚠️  RESEND_API_KEY does not appear to be in correct format (should start with "re_")')
  }

  // Check for placeholder values that need to be replaced
  // Allow override for development/testing with RESEND_SKIP_VALIDATION=true
  const skipValidation = process.env.RESEND_SKIP_VALIDATION === 'true'
  
  if (!skipValidation && (
      apiKey?.includes('REPLACE_WITH_ACTUAL_API_KEY') || 
      apiKey?.includes('PLACEHOLDER') ||
      apiKey === 're_aA9VrVLa_9aKAwB4QGBcArZZ2NS8AWuJf'
  )) {
    console.error('❌ Please replace RESEND_API_KEY with your actual API key from https://resend.com/api-keys')
    console.error('   Current key appears to be a placeholder. Get your real API key at: https://resend.com/api-keys')
    console.error('   Temporary bypass: Set RESEND_SKIP_VALIDATION=true in .env to test with placeholder key')
    throw new Error('Email service requires valid RESEND_API_KEY - placeholder detected')
  }
  
  if (skipValidation && (
      apiKey?.includes('REPLACE_WITH_ACTUAL_API_KEY') || 
      apiKey?.includes('PLACEHOLDER') ||
      apiKey === 're_aA9VrVLa_9aKAwB4QGBcArZZ2NS8AWuJf'
  )) {
    console.warn('⚠️  WARNING: Using placeholder API key with validation bypass!')
    console.warn('   This will likely fail when making actual API calls to Resend')
    console.warn('   Get your real API key at: https://resend.com/api-keys')
  }

  // Validate email configuration for production use
  const fromEmail = requiredEnvVars.RESEND_FROM_EMAIL!
  
  // Ensure we're using a valid sending domain
  if (!fromEmail.includes('@')) {
    throw new Error('RESEND_FROM_EMAIL must be a valid email address')
  }

  // Log configuration for debugging
  console.log('📧 Email service configuration:')
  console.log(`   From: ${requiredEnvVars.RESEND_FROM_NAME} <${fromEmail}>`)
  console.log(`   API Key: ${apiKey?.substring(0, 8)}...`)
  
  // Recommend using Resend's default domain for unlimited sending
  if (fromEmail.endsWith('@resend.dev')) {
    console.log('✅ Using Resend default domain - can send to any recipient without restrictions')
  } else {
    console.log('ℹ️  Using custom domain - ensure it\'s verified in your Resend dashboard')
  }

  // Return configuration with production-ready settings (all values guaranteed to exist)
  return {
    RESEND_API_KEY: apiKey!,
    RESEND_FROM_EMAIL: fromEmail,
    RESEND_FROM_NAME: requiredEnvVars.RESEND_FROM_NAME!,
    NEXTAUTH_URL: requiredEnvVars.NEXTAUTH_URL!
  }
}

const emailConfig = validateEmailConfig()

// ==========================================
// RESEND CLIENT INITIALIZATION
// Production-ready initialization without development mode restrictions
// ==========================================

/**
 * Initialize Resend client for production-ready email service
 * Handles API key validation and client initialization
 */
let resend: Resend
let emailServiceStatus: 'healthy' | 'error' = 'error' as 'healthy' | 'error'

try {
  resend = new Resend(emailConfig.RESEND_API_KEY)
  emailServiceStatus = 'healthy'
  console.log('✅ Resend email service initialized successfully')
} catch (error) {
  emailServiceStatus = 'error'
  console.error('❌ Failed to initialize Resend email service:', error)
  throw new Error(`Email service initialization failed: ${(error as Error).message}. Please check your RESEND_API_KEY.`)
}

// ==========================================
// EMAIL SERVICE UTILITIES & ERROR HANDLING
// Comprehensive error categorization and retry logic
// ==========================================

/**
 * Enhanced email error interface with detailed categorization
 */
interface EmailError {
  statusCode?: number
  message: string
  name?: string
  type?: 'rate_limit' | 'network' | 'configuration' | 'unknown'
}

/**
 * Categorizes email errors for appropriate handling
 * @param error - The error object from Resend API
 * @returns Categorized error type
 */
function categorizeEmailError(error: any): EmailError {
  const categorizedError: EmailError = {
    statusCode: error.statusCode,
    message: error.message || 'Unknown error',
    name: error.name
  }

  // Domain verification and configuration errors (403)
  if (error.statusCode === 403) {
    categorizedError.type = 'configuration'
    // Provide specific message for 403 errors
    if (error.message === 'Unknown error' || !error.message) {
      categorizedError.message = 'Invalid API key or insufficient permissions. Please check your RESEND_API_KEY.'
    }
  }
  // Rate limiting errors
  else if (error.statusCode === 429) {
    categorizedError.type = 'rate_limit'
  }
  // Network/connectivity errors
  else if (
    error.message?.includes('network') ||
    error.message?.includes('timeout') ||
    error.message?.includes('Unable to fetch data') ||
    error.message?.includes('request could not be resolved') ||
    error.message?.includes('ENOTFOUND') ||
    error.message?.includes('ECONNRESET') ||
    error.message?.includes('ETIMEDOUT')
  ) {
    categorizedError.type = 'network'
  }
  // Configuration errors
  else if (
    error.message?.includes('API key') ||
    error.message?.includes('unauthorized') ||
    error.statusCode === 400 ||
    error.statusCode === 401
  ) {
    categorizedError.type = 'configuration'
  }
  // Default to unknown
  else {
    categorizedError.type = 'unknown'
  }

  return categorizedError
}

/**
 * Determines if an error should be retried based on its type
 * @param error - Categorized email error
 * @returns Whether the error is retryable
 */
function isRetryableError(error: EmailError): boolean {
  // Only retry network errors and server errors (5xx)
  return (
    error.type === 'network' ||
    (error.statusCode && error.statusCode >= 500) ||
    error.name === 'application_error'
  )
}

/**
 * Generates user-friendly error messages based on error type for production environment
 * @param error - Categorized email error
 * @returns User-friendly error message
 */
function generateUserFriendlyMessage(error: EmailError): string {
  switch (error.type) {
    case 'rate_limit':
      return 'Too many email requests. Please wait a few minutes before trying again.'
    
    case 'network':
      return 'Network connectivity issue. Please check your internet connection and try again.'
    
    case 'configuration':
      if (error.statusCode === 403) {
        return 'Email service authentication failed. Please check the API key configuration and try again.'
      }
      return 'Email service configuration error. Please contact support for assistance.'
    
    default:
      return 'Email service temporarily unavailable. Please try again later or contact support.'
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Add timeout wrapper for API calls
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000 // 30 second timeout
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Enhanced retry logic with exponential backoff
 * Only retries appropriate error types and provides detailed logging
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay for exponential backoff
 * @returns Result of the operation
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const categorizedError = categorizeEmailError(error)
      lastError = error as Error
      
      console.log(`📧 Email attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        error: categorizedError.message,
        type: categorizedError.type,
        statusCode: categorizedError.statusCode,
        name: categorizedError.name
      })
      
      if (attempt === maxRetries) {
        console.error(`📧 All ${maxRetries + 1} email attempts failed. Final error type: ${categorizedError.type}`)
        break
      }

      if (!isRetryableError(categorizedError)) {
        console.log(`📧 Error type '${categorizedError.type}' is not retryable, throwing immediately`)
        throw error
      }

      const delayMs = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.log(`📧 Retrying in ${Math.round(delayMs)}ms...`)
      await delay(delayMs)
    }
  }

  throw lastError
}

// ==========================================
// EMAIL SERVICE INTERFACES & TYPES
// Comprehensive type definitions for email operations
// ==========================================

interface SendEmailVerificationProps {
  email: string
  name: string
  verificationToken: string
}

interface SendPasswordResetProps {
  email: string
  name: string
  resetToken: string
}

interface SendWelcomeEmailProps {
  email: string
  name: string
}

interface SendOTPEmailProps {
  email: string
  name: string
  otp: string
  purpose: 'login' | 'registration' | 'password-reset' | '2fa-setup'
}

/**
 * Enhanced email result interface with detailed status information
 * Production-ready interface for consistent error handling
 */
interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  userMessage?: string
  errorType?: 'rate_limit' | 'network' | 'configuration' | 'unknown'
}

export const emailService = {
  // ==========================================
  // EMAIL SERVICE STATUS & HEALTH CHECK
  // Comprehensive service monitoring and diagnostics
  // ==========================================
  
  /**
   * Get current email service status for production-ready system
   * @returns Current service status and configuration details
   */
  getStatus(): { 
    status: 'healthy' | 'error'
    canSendEmails: boolean
    recommendations: string[]
  } {
    const recommendations: string[] = []
    const currentStatus = emailServiceStatus
    
    if (currentStatus !== 'healthy') {
      recommendations.push('Check RESEND_API_KEY environment variable')
      recommendations.push('Ensure API key is valid and has proper permissions')
      recommendations.push('Verify domain configuration at https://resend.com/domains')
    }

    return {
      status: currentStatus,
      canSendEmails: currentStatus === 'healthy',
      recommendations
    }
  },

  /**
   * Health check for production-ready email service
   * @returns Comprehensive health status and recommendations
   */
  async healthCheck(): Promise<{ 
    status: 'healthy' | 'unhealthy'
    details: string
    recommendations: string[]
    canSendEmails: boolean
  }> {
    const recommendations: string[] = []
    
    try {
      // Check email service status
      if (emailServiceStatus === 'healthy') {
        return {
          status: 'healthy',
          details: 'Email service is fully operational',
          recommendations: [],
          canSendEmails: true
        }
      }

      // Service has errors
      recommendations.push('Check RESEND_API_KEY environment variable')
      recommendations.push('Ensure API key is valid and has proper permissions')
      
      return {
        status: 'unhealthy',
        details: 'Email service configuration error',
        recommendations,
        canSendEmails: false
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Health check failed: ${(error as Error).message}`,
        recommendations: ['Check email service configuration', 'Verify API credentials'],
        canSendEmails: false
      }
    }
  },
  // ==========================================
  // SEND EMAIL VERIFICATION
  // Production-ready email service without restrictions
  // ==========================================
  
  /**
   * Send email verification with comprehensive error handling
   * Production-ready email service - sends real emails to any recipient
   * @param props - Email verification parameters
   * @returns Promise with detailed email result
   */
  async sendEmailVerification({ email, name, verificationToken }: SendEmailVerificationProps): Promise<EmailResult> {
    const verificationUrl = `${emailConfig.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
    const subject = 'Verify your Edu Matrix Interlinked account'
    
    return retryWithBackoff(async () => {
      try {
        const emailHtml = await render(EmailVerificationTemplate({ 
          name, 
          verificationUrl 
        }))

        // Send email to any recipient without restrictions
        const emailSendPromise = resend.emails.send({
          from: `${emailConfig.RESEND_FROM_NAME} <${emailConfig.RESEND_FROM_EMAIL}>`,
          to: [email],
          subject,
          html: emailHtml
        })

        const { data, error } = await withTimeout(emailSendPromise, 25000)

        if (error) {
          const categorizedError = categorizeEmailError(error)
          const userMessage = generateUserFriendlyMessage(categorizedError)
          
          console.error('📧 Email verification error:', {
            error: categorizedError.message,
            type: categorizedError.type,
            statusCode: categorizedError.statusCode,
            email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
          })
          
          return {
            success: false,
            error: categorizedError.message,
            userMessage,
            errorType: categorizedError.type
          }
        }

        console.log('✅ Verification email sent successfully:', {
          messageId: data?.id,
          recipient: email.replace(/(.{2}).*(@.*)/, '$1***$2')
        })
        
        return {
          success: true,
          messageId: data?.id
        }
      } catch (error) {
        console.error('📧 Email verification process error:', error)
        return {
          success: false,
          error: (error as Error).message,
          userMessage: 'Failed to send verification email. Please try again later.',
          errorType: 'unknown'
        }
      }
    })
  },
  // ==========================================
  // SEND PASSWORD RESET EMAIL
  // ==========================================
  // SEND PASSWORD RESET EMAIL
  // Production-ready email service without restrictions
  // ==========================================
  
  /**
   * Send password reset email with comprehensive error handling
   * Production-ready email service - sends real emails to any recipient
   * @param props - Password reset email parameters
   * @returns Promise with detailed email result
   */
  async sendPasswordReset({ email, name, resetToken }: SendPasswordResetProps): Promise<EmailResult> {
    const resetUrl = `${emailConfig.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    const subject = 'Reset your Edu Matrix Interlinked password'
    
    return retryWithBackoff(async () => {
      try {
        const emailHtml = await render(PasswordResetTemplate({ 
          name, 
          resetUrl 
        }))

        // Send email to any recipient without restrictions
        const { data, error } = await resend.emails.send({
          from: `${emailConfig.RESEND_FROM_NAME} <${emailConfig.RESEND_FROM_EMAIL}>`,
          to: [email],
          subject,
          html: emailHtml
        })

        if (error) {
          const categorizedError = categorizeEmailError(error)
          const userMessage = generateUserFriendlyMessage(categorizedError)
          
          console.error('📧 Password reset email error:', {
            error: categorizedError.message,
            type: categorizedError.type,
            statusCode: categorizedError.statusCode
          })
          
          return {
            success: false,
            error: categorizedError.message,
            userMessage,
            errorType: categorizedError.type
          }
        }

        console.log('✅ Password reset email sent successfully:', {
          messageId: data?.id
        })
        
        return {
          success: true,
          messageId: data?.id
        }
      } catch (error) {
        console.error('📧 Password reset email process error:', error)
        return {
          success: false,
          error: (error as Error).message,
          userMessage: 'Failed to send password reset email. Please try again later.',
          errorType: 'unknown'
        }
      }
    })
  },
  // ==========================================
  // SEND WELCOME EMAIL
  // Production-ready email service without restrictions
  // ==========================================
  
  /**
   * Send welcome email with comprehensive error handling
   * Production-ready email service - sends real emails to any recipient
   * @param props - Welcome email parameters
   * @returns Promise with detailed email result
   */
  async sendWelcomeEmail({ email, name }: SendWelcomeEmailProps): Promise<EmailResult> {
    const subject = 'Welcome to Edu Matrix Interlinked!'
    
    return retryWithBackoff(async () => {
      try {
        const emailHtml = await render(WelcomeTemplate({ name }))

        // Send email to any recipient without restrictions
        const emailSendResult = await resend.emails.send({
          from: `${emailConfig.RESEND_FROM_NAME} <${emailConfig.RESEND_FROM_EMAIL}>`,
          to: [email],
          subject,
          html: emailHtml
        })

        const { data, error } = emailSendResult

        if (error) {
          const categorizedError = categorizeEmailError(error)
          const userMessage = generateUserFriendlyMessage(categorizedError)
          
          console.error('📧 Welcome email error:', {
            error: categorizedError.message,
            type: categorizedError.type,
            statusCode: categorizedError.statusCode
          })
          
          return {
            success: false,
            error: categorizedError.message,
            userMessage,
            errorType: categorizedError.type
          }
        }

        console.log('✅ Welcome email sent successfully:', {
          messageId: data?.id
        })
        
        return {
          success: true,
          messageId: data?.id
        }
      } catch (error) {
        console.error('📧 Welcome email process error:', error)
        return {
          success: false,
          error: (error as Error).message,
          userMessage: 'Failed to send welcome email. Please try again later.',
          errorType: 'unknown'
        }
      }
    })
  },
  // ==========================================
  // SEND OTP EMAIL
  // Production-ready email service without restrictions
  // ==========================================
  
  /**
   * Send OTP email with comprehensive error handling
   * Production-ready email service - sends real emails to any recipient
   * @param email - Recipient email address
   * @param otp - One-time password code
   * @param purpose - Purpose of the OTP (login, registration, etc.)
   * @param name - Recipient name (optional)
   * @returns Promise with detailed email result including user-friendly messages
   */
  async sendOTPEmail(email: string, otp: string, purpose: string, name?: string): Promise<EmailResult> {
    const getPurposeText = (purpose: string) => {
      switch (purpose) {
        case 'login':
          return 'complete your login'
        case 'registration':
          return 'verify your email address'
        case 'password-reset':
          return 'reset your password'
        case '2fa-setup':
          return 'set up two-factor authentication'
        default:
          return 'verify your identity'
      }
    }

    const subject = `Your Edu Matrix Interlinked verification code - ${otp}`
    const purposeText = getPurposeText(purpose)

    return retryWithBackoff(async () => {
      try {
        const emailHtml = await render(OTPTemplate({ 
          name: name || 'User',
          otp,
          purpose: purposeText
        }))

        // Send email to any recipient without restrictions
        const emailSendPromise = resend.emails.send({
          from: `${emailConfig.RESEND_FROM_NAME} <${emailConfig.RESEND_FROM_EMAIL}>`,
          to: [email],
          subject,
          html: emailHtml
        })

        const emailSendResult = await withTimeout(emailSendPromise, 25000)
        const { data, error } = emailSendResult

        if (error) {
          const categorizedError = categorizeEmailError(error)
          const userMessage = generateUserFriendlyMessage(categorizedError)
          
          console.error('📧 OTP email error:', {
            error: categorizedError.message,
            type: categorizedError.type,
            statusCode: categorizedError.statusCode,
            email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
            purpose
          })
          
          return {
            success: false,
            error: categorizedError.message,
            userMessage,
            errorType: categorizedError.type
          }
        }

        console.log('✅ OTP email sent successfully:', {
          messageId: data?.id,
          recipient: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          purpose
        })
        
        return {
          success: true,
          messageId: data?.id,
          userMessage: `OTP email sent successfully to ${email}`
        }
      } catch (error) {
        console.error('📧 OTP email process error:', error)
        
        // Enhanced error with user-friendly message
        const userMessage = 'Failed to send verification email. Please try again later.'
        const enhancedError = new Error(userMessage)
        ;(enhancedError as any).originalError = error
        ;(enhancedError as any).type = 'unknown'
        ;(enhancedError as any).userMessage = userMessage
        ;(enhancedError as any).isEmailServiceError = true
        
        throw enhancedError
      }
    })
  },

  /**
   * Handle domain verification issues by using alternative sending configuration
   * This function is called when the primary sending attempt fails due to domain restrictions
   * @param email - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - Email HTML content
   * @param textContent - Email text content (optional)
   * @returns Promise with detailed email result
   */
  async handleDomainVerificationFallback(
    email: string, 
    subject: string, 
    htmlContent: string, 
    textContent?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🔄 Attempting fallback email send with simplified configuration...')
      
      // Use the most basic configuration possible
      const fallbackResult = await resend.emails.send({
        from: emailConfig.RESEND_FROM_EMAIL, // Use exact domain from config
        to: [email],
        subject,
        html: htmlContent,
        text: textContent || `Please check your email for: ${subject}`
      })

      if (fallbackResult.error) {
        console.error('❌ Fallback email send also failed:', fallbackResult.error)
        return {
          success: false,
          error: fallbackResult.error.message || 'Fallback email send failed'
        }
      }

      console.log('✅ Fallback email sent successfully:', fallbackResult.data?.id)
      return {
        success: true,
        messageId: fallbackResult.data?.id
      }
    } catch (fallbackError) {
      console.error('❌ Fallback email attempt failed:', fallbackError)
      return {
        success: false,
        error: (fallbackError as Error).message
      }
    }
  }
}
