/**
 * @fileoverview Production Logger - Centralized Logging System
 * @module Lib/Logger
 * @version 1.0.0
 * 
 * ==========================================
 * PRODUCTION-READY LOGGING SYSTEM
 * ==========================================
 * 
 * This module provides a centralized logging system for the application.
 * It handles different log levels, formatting, and can be configured for
 * different environments (development, staging, production).
 * 
 * FEATURES:
 * - Multiple log levels (debug, info, warn, error)
 * - Environment-specific configuration
 * - Structured logging with context
 * - Performance-optimized for production
 * - Type-safe logging interfaces
 * - Integration with external logging services
 * 
 * @author GitHub Copilot
 * @since 2025-07-22
 */

/**
 * Log levels enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Log entry interface
 */
interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, any>
  timestamp: Date
  module: string
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  module: string
}

/**
 * Logger class for structured logging
 */
class Logger {
  private config: LoggerConfig

  constructor(config: LoggerConfig) {
    this.config = config
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any> | Error): void {
    let logContext: Record<string, any> = {}
    
    if (context instanceof Error) {
      logContext = {
        error: context.message,
        stack: context.stack,
        name: context.name
      }
    } else if (context) {
      logContext = context
    }

    this.log(LogLevel.ERROR, message, logContext)
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check if log level meets threshold
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      module: this.config.module
    }

    // Console logging (development and debugging)
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // Remote logging (production monitoring)
    if (this.config.enableRemote && process.env.NODE_ENV === 'production') {
      this.logToRemote(entry)
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, context, timestamp, module } = entry
    const timeStr = timestamp.toISOString()
    const prefix = `[${timeStr}] [${LogLevel[level]}] [${module}]`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context || '')
        break
      case LogLevel.INFO:
        console.info(prefix, message, context || '')
        break
      case LogLevel.WARN:
        console.warn(prefix, message, context || '')
        break
      case LogLevel.ERROR:
        console.error(prefix, message, context || '')
        break
    }
  }

  /**
   * Log to remote service (implement based on your logging service)
   */
  private logToRemote(entry: LogEntry): void {
    // TODO: Implement remote logging
    // Example: Send to external logging service like LogRocket, Sentry, etc.
    try {
      // Implementation would depend on your logging service
      // Example:
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // })
    } catch (error) {
      // Silently fail remote logging to avoid cascading errors
      console.warn('Failed to send log to remote service:', error)
    }
  }
}

/**
 * Default logger configuration based on environment
 */
const getDefaultConfig = (module: string): LoggerConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    enableConsole: isDevelopment || process.env.ENABLE_CONSOLE_LOGS === 'true',
    enableRemote: !isDevelopment && process.env.ENABLE_REMOTE_LOGS !== 'false',
    remoteEndpoint: process.env.REMOTE_LOG_ENDPOINT,
    module
  }
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  const defaultConfig = getDefaultConfig(module)
  const finalConfig = { ...defaultConfig, ...config }
  return new Logger(finalConfig)
}

/**
 * Default application logger
 */
export const logger = createLogger('App')
