// ==========================================
// AUTH ERROR LOGGING UTILITY - OFFICIAL
// ==========================================
// Official error logging utility for NextAuth.js authentication

interface AuthErrorLog {
  timestamp: string
  type: 'login_attempt' | 'login_failure' | 'registration_attempt' | 'registration_failure' | 'verification_failure'
  email?: string
  error?: string
  ip?: string
  userAgent?: string
  sessionId?: string
}

class AuthLogger {
  private static instance: AuthLogger
  private logBuffer: AuthErrorLog[] = []
  private readonly MAX_BUFFER_SIZE = 100

  public static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger()
    }
    return AuthLogger.instance
  }

  /**
   * Log authentication events safely
   */
  public logAuthEvent(event: Omit<AuthErrorLog, 'timestamp'>) {
    const logEntry: AuthErrorLog = {
      ...event,
      timestamp: new Date().toISOString(),
      // Sanitize email for logging (only log domain for privacy)
      email: event.email ? this.sanitizeEmail(event.email) : undefined
    }

    // Add to buffer
    this.logBuffer.push(logEntry)

    // Keep buffer size manageable
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift()
    }

    // Log based on environment
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Event]', logEntry)
    } else {
      // In production, only log errors
      if (event.type.includes('failure')) {
        console.error('[Auth Failure]', {
          type: logEntry.type,
          timestamp: logEntry.timestamp,
          error: logEntry.error,
          emailDomain: logEntry.email
        })
      }
    }
  }

  /**
   * Log login attempts
   */
  public logLoginAttempt(email: string, ip?: string, userAgent?: string) {
    this.logAuthEvent({
      type: 'login_attempt',
      email,
      ip,
      userAgent
    })
  }

  /**
   * Log login failures
   */
  public logLoginFailure(email: string, error: string, ip?: string, userAgent?: string) {
    this.logAuthEvent({
      type: 'login_failure',
      email,
      error,
      ip,
      userAgent
    })
  }

  /**
   * Log registration attempts
   */
  public logRegistrationAttempt(email: string, ip?: string, userAgent?: string) {
    this.logAuthEvent({
      type: 'registration_attempt',
      email,
      ip,
      userAgent
    })
  }

  /**
   * Log registration failures
   */
  public logRegistrationFailure(email: string, error: string, ip?: string, userAgent?: string) {
    this.logAuthEvent({
      type: 'registration_failure',
      email,
      error,
      ip,
      userAgent
    })
  }

  /**
   * Log verification failures
   */
  public logVerificationFailure(email: string, error: string, ip?: string, userAgent?: string) {
    this.logAuthEvent({
      type: 'verification_failure',
      email,
      error,
      ip,
      userAgent
    })
  }

  /**
   * Get recent auth events (for debugging)
   */
  public getRecentEvents(limit: number = 10): AuthErrorLog[] {
    return this.logBuffer.slice(-limit)
  }

  /**
   * Get failure count for email (basic rate limiting info)
   */
  public getFailureCount(email: string, timeWindowMs: number = 300000): number {
    const sanitizedEmail = this.sanitizeEmail(email)
    const cutoffTime = new Date(Date.now() - timeWindowMs)
    
    return this.logBuffer.filter(log => 
      log.email === sanitizedEmail &&
      log.type.includes('failure') &&
      new Date(log.timestamp) > cutoffTime
    ).length
  }

  /**
   * Sanitize email for logging (keep domain, hash local part)
   */
  private sanitizeEmail(email: string): string {
    const [localPart, domain] = email.split('@')
    if (!localPart || !domain) return 'invalid-email'
    
    // Hash the local part for privacy, keep domain for analytics
    const hashedLocal = this.simpleHash(localPart)
    return `${hashedLocal}@${domain}`
  }

  /**
   * Simple hash function for email privacy
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8)
  }

  /**
   * Clear old logs (cleanup utility)
   */
  public clearOldLogs(olderThanMs: number = 86400000): void {
    const cutoffTime = new Date(Date.now() - olderThanMs)
    this.logBuffer = this.logBuffer.filter(log => 
      new Date(log.timestamp) > cutoffTime
    )
  }
}

// Export singleton instance
export const authLogger = AuthLogger.getInstance()

// Export types for external use
export type { AuthErrorLog }
