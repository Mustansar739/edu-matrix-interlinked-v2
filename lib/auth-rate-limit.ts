// ==========================================
// AUTH RATE LIMITING UTILITY - OFFICIAL
// ==========================================
// Official rate limiting for authentication attempts

import { authLogger } from "./auth-logger"

interface RateLimitConfig {
  maxAttempts: number
  timeWindowMs: number
  blockDurationMs: number
}

interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  resetTime?: Date
  blocked: boolean
}

class AuthRateLimit {
  private static instance: AuthRateLimit
  private blockList: Map<string, Date> = new Map()

  // Default configurations
  private readonly configs: Record<string, RateLimitConfig> = {
    login: {
      maxAttempts: 5,
      timeWindowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000 // 30 minutes block
    },
    registration: {
      maxAttempts: 3,
      timeWindowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 60 * 60 * 1000 // 1 hour block
    },
    verification: {
      maxAttempts: 10,
      timeWindowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000 // 2 hours block
    }
  }

  public static getInstance(): AuthRateLimit {
    if (!AuthRateLimit.instance) {
      AuthRateLimit.instance = new AuthRateLimit()
    }
    return AuthRateLimit.instance
  }

  /**
   * Check if action is allowed for email
   */
  public checkRateLimit(email: string, action: keyof typeof this.configs): RateLimitResult {
    const config = this.configs[action]
    const sanitizedEmail = this.sanitizeEmail(email)
    const blockKey = `${action}:${sanitizedEmail}`

    // Check if currently blocked
    const blockEndTime = this.blockList.get(blockKey)
    if (blockEndTime && new Date() < blockEndTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: blockEndTime,
        blocked: true
      }
    }

    // Remove expired blocks
    if (blockEndTime && new Date() >= blockEndTime) {
      this.blockList.delete(blockKey)
    }

    // Get failure count from logger
    const failureCount = authLogger.getFailureCount(email, config.timeWindowMs)
    const remainingAttempts = Math.max(0, config.maxAttempts - failureCount)

    // Check if should be blocked
    if (failureCount >= config.maxAttempts) {
      const blockUntil = new Date(Date.now() + config.blockDurationMs)
      this.blockList.set(blockKey, blockUntil)
      
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: blockUntil,
        blocked: true
      }
    }

    return {
      allowed: true,
      remainingAttempts,
      blocked: false
    }
  }

  /**
   * Check login rate limit
   */
  public checkLoginLimit(email: string): RateLimitResult {
    return this.checkRateLimit(email, 'login')
  }

  /**
   * Check registration rate limit
   */
  public checkRegistrationLimit(email: string): RateLimitResult {
    return this.checkRateLimit(email, 'registration')
  }

  /**
   * Check verification rate limit
   */
  public checkVerificationLimit(email: string): RateLimitResult {
    return this.checkRateLimit(email, 'verification')
  }

  /**
   * Manually block an email (for security purposes)
   */
  public blockEmail(email: string, action: keyof typeof this.configs, durationMs?: number): void {
    const config = this.configs[action]
    const sanitizedEmail = this.sanitizeEmail(email)
    const blockKey = `${action}:${sanitizedEmail}`
    const blockUntil = new Date(Date.now() + (durationMs || config.blockDurationMs))
    
    this.blockList.set(blockKey, blockUntil)
  }

  /**
   * Unblock an email (admin function)
   */
  public unblockEmail(email: string, action: keyof typeof this.configs): void {
    const sanitizedEmail = this.sanitizeEmail(email)
    const blockKey = `${action}:${sanitizedEmail}`
    this.blockList.delete(blockKey)
  }

  /**
   * Get block status for email
   */
  public getBlockStatus(email: string): { action: string; blockedUntil: Date }[] {
    const sanitizedEmail = this.sanitizeEmail(email)
    const blocks: { action: string; blockedUntil: Date }[] = []

    for (const [blockKey, blockTime] of this.blockList.entries()) {
      if (blockKey.includes(sanitizedEmail) && new Date() < blockTime) {
        const action = blockKey.split(':')[0]
        blocks.push({ action, blockedUntil: blockTime })
      }
    }

    return blocks
  }

  /**
   * Clean up expired blocks (maintenance function)
   */
  public cleanupExpiredBlocks(): number {
    const now = new Date()
    let cleaned = 0

    for (const [key, blockTime] of this.blockList.entries()) {
      if (now >= blockTime) {
        this.blockList.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Get rate limit config for action
   */
  public getConfig(action: keyof typeof this.configs): RateLimitConfig {
    return { ...this.configs[action] }
  }

  /**
   * Update rate limit config (admin function)
   */
  public updateConfig(action: keyof typeof this.configs, config: Partial<RateLimitConfig>): void {
    this.configs[action] = { ...this.configs[action], ...config }
  }

  /**
   * Sanitize email for consistent key generation
   */
  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }

  /**
   * Get statistics about current blocks
   */
  public getStats(): {
    totalBlocks: number
    activeBlocks: number
    blocksByAction: Record<string, number>
  } {
    const now = new Date()
    let activeBlocks = 0
    const blocksByAction: Record<string, number> = {}

    for (const [key, blockTime] of this.blockList.entries()) {
      const action = key.split(':')[0]
      blocksByAction[action] = (blocksByAction[action] || 0) + 1

      if (now < blockTime) {
        activeBlocks++
      }
    }

    return {
      totalBlocks: this.blockList.size,
      activeBlocks,
      blocksByAction
    }
  }
}

// Export singleton instance
export const authRateLimit = AuthRateLimit.getInstance()

// Export types
export type { RateLimitConfig, RateLimitResult }
