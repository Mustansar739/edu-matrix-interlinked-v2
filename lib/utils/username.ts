/**
 * @fileoverview Username Validation Utilities
 * @module Utils/Username
 * @category Validation
 * @version 1.0.0
 * 
 * ==========================================
 * USERNAME VALIDATION UTILITIES
 * ==========================================
 * 
 * This module provides utilities for validating usernames across the application.
 * It ensures consistent username handling and prevents security issues.
 * 
 * FEATURES:
 * - Username format validation
 * - UUID detection and rejection
 * - Sanitization utilities
 * - Production-ready validation
 * 
 * TECHNICAL NOTES:
 * - Uses TypeScript for type safety
 * - Includes comprehensive error messages
 * - Follows security best practices
 * - Production-ready implementation
 */

// Username validation constants
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * ✅ PRODUCTION: Validates username format and content
 * @param username - The username to validate
 * @returns ValidationResult object with validation status
 */
export function validateUsername(username: string): ValidationResult {
  // Check if username is provided
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username is required and must be a string'
    };
  }

  // Sanitize username
  const sanitized = username.trim().toLowerCase();

  // Check minimum length
  if (sanitized.length < USERNAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters long`
    };
  }

  // Check maximum length
  if (sanitized.length > USERNAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Username must be no more than ${USERNAME_MAX_LENGTH} characters long`
    };
  }

  // Check if username is a UUID (not allowed)
  if (UUID_PATTERN.test(sanitized)) {
    return {
      isValid: false,
      error: 'Username cannot be a UUID format'
    };
  }

  // Check username pattern
  if (!USERNAME_PATTERN.test(sanitized)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, hyphens, and underscores'
    };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'api', 'app', 'system', 'support', 'help',
    'about', 'contact', 'privacy', 'terms', 'settings', 'profile', 'search',
    'notifications', 'messages', 'dashboard', 'home', 'index', 'login', 'logout',
    'register', 'signup', 'signin', 'auth', 'oauth', 'callback', 'error', 'not-found',
    'no-username', 'undefined', 'null', 'anonymous', 'guest'
  ];

  if (reservedUsernames.includes(sanitized)) {
    return {
      isValid: false,
      error: 'This username is reserved and cannot be used'
    };
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * ✅ PRODUCTION: Checks if a string is a UUID
 * @param str - The string to check
 * @returns boolean indicating if the string is a UUID
 */
export function isUUID(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return UUID_PATTERN.test(str.trim());
}

/**
 * ✅ PRODUCTION: Sanitizes username for safe usage
 * @param username - The username to sanitize
 * @returns Sanitized username or null if invalid
 */
export function sanitizeUsername(username: string): string | null {
  const validation = validateUsername(username);
  return validation.isValid ? validation.sanitized! : null;
}

/**
 * ✅ PRODUCTION: Generates a safe username suggestion from email
 * @param email - The email to generate username from
 * @returns Safe username suggestion or null if invalid
 */
export function generateUsernameFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const baseName = email.split('@')[0];
  const sanitized = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  
  // Add random suffix if too short
  if (sanitized.length < USERNAME_MIN_LENGTH) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${sanitized}${randomSuffix}`.substring(0, USERNAME_MAX_LENGTH);
  }

  return sanitized.substring(0, USERNAME_MAX_LENGTH);
}

/**
 * ✅ PRODUCTION: Validates profile URL parameter
 * @param param - The URL parameter to validate
 * @returns ValidationResult for the parameter
 */
export function validateProfileParam(param: string): ValidationResult {
  if (!param || typeof param !== 'string') {
    return {
      isValid: false,
      error: 'Profile parameter is required'
    };
  }

  // Check if it's a UUID (not allowed for profile URLs)
  if (isUUID(param)) {
    return {
      isValid: false,
      error: 'Profile parameter cannot be a UUID'
    };
  }

  // Use standard username validation
  return validateUsername(param);
}
