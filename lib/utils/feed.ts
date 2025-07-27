/**
 * @fileoverview Feed Utilities - Shared Utility Functions
 * @module Utils/Feed
 * @version 1.0.0
 * 
 * ==========================================
 * FEED UTILITY FUNCTIONS
 * ==========================================
 * 
 * This module contains shared utility functions used across feed components.
 * Centralizing these utilities prevents code duplication and ensures consistency.
 * 
 * PURPOSE:
 * - Prevent code duplication across feed components
 * - Provide consistent data formatting and validation
 * - Enable easy testing and maintenance
 * - Ensure type safety for common operations
 * 
 * CATEGORIES:
 * - Data Formatting Utilities
 * - Validation Utilities
 * - URL and Media Utilities
 * - Educational Context Utilities
 * - Performance Utilities
 * 
 * @author GitHub Copilot
 * @since 2025-07-22
 */

import { 
  EducationalContext, 
  FeedFilters, 
  MediaFile, 
  Post, 
  AppError,
  ErrorSeverity
} from '@/types/feed'
import { 
  EDUCATIONAL_SUBJECTS, 
  EDUCATIONAL_LEVELS, 
  MEDIA_CONSTRAINTS 
} from '@/lib/constants/educational'

// ==========================================
// DATA FORMATTING UTILITIES
// ==========================================

/**
 * Format large numbers into readable string format
 * Examples: 1234 → "1.2K", 1000000 → "1.0M"
 */
export function formatCount(count: number): string {
  if (!count || count < 0) return '0'
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  if (count < 1000000000) return `${(count / 1000000).toFixed(1)}M`
  return `${(count / 1000000000).toFixed(1)}B`
}

/**
 * Format file size into readable string format
 * Examples: 1024 → "1.0 KB", 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format time ago string
 * Examples: "2 minutes ago", "1 hour ago", "3 days ago"
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
  }
  
  return date.toLocaleDateString('en-US', formatOptions[format])
}

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Validate educational context completeness
 */
export function validateEducationalContext(context: EducationalContext): {
  isValid: boolean
  isComplete: boolean
  missingFields: string[]
  errors: string[]
} {
  const errors: string[] = []
  const missingFields: string[] = []
  
  // Check if subject is valid
  if (context.subject && !EDUCATIONAL_SUBJECTS.includes(context.subject)) {
    errors.push(`Invalid subject: ${context.subject}`)
  } else if (!context.subject) {
    missingFields.push('subject')
  }
  
  // Check if level is valid
  if (context.level && !EDUCATIONAL_LEVELS.some(l => l.value === context.level)) {
    errors.push(`Invalid level: ${context.level}`)
  } else if (!context.level) {
    missingFields.push('level')
  }
  
  // Course is optional but if provided, should not be empty
  if (context.course !== undefined && !context.course.trim()) {
    errors.push('Course cannot be empty if provided')
  }
  
  const isValid = errors.length === 0
  const isComplete = isValid && missingFields.length === 0
  
  return { isValid, isComplete, missingFields, errors }
}

/**
 * Validate file for upload
 */
export function validateMediaFile(file: File): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check file size
  if (file.size > MEDIA_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size is ${formatFileSize(MEDIA_CONSTRAINTS.MAX_FILE_SIZE)}`)
  }
  
  // Check file type
  const isValidImage = MEDIA_CONSTRAINTS.ALLOWED_IMAGE_TYPES.includes(file.type as any)
  const isValidVideo = MEDIA_CONSTRAINTS.ALLOWED_VIDEO_TYPES.includes(file.type as any)
  const isValidDocument = MEDIA_CONSTRAINTS.ALLOWED_DOCUMENT_TYPES.includes(file.type as any)
  
  if (!isValidImage && !isValidVideo && !isValidDocument) {
    errors.push('Invalid file type. Please upload images, videos, or documents only.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate post content
 */
export function validatePostContent(content: string, maxLength: number = 5000): {
  isValid: boolean
  errors: string[]
  characterCount: number
} {
  const errors: string[] = []
  const characterCount = content.length
  
  if (characterCount > maxLength) {
    errors.push(`Content exceeds maximum length of ${maxLength} characters`)
  }
  
  // Check for basic content (not just whitespace)
  if (content.trim().length === 0) {
    errors.push('Content cannot be empty')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    characterCount
  }
}

// ==========================================
// URL AND MEDIA UTILITIES
// ==========================================

/**
 * Generate shareable URL for a post
 */
export function generatePostShareUrl(postId: string): string {
  if (typeof window === 'undefined') {
    return `https://yourdomain.com/students-interlinked/post/${postId}`
  }
  
  const baseUrl = window.location.origin
  return `${baseUrl}/students-interlinked/post/${postId}`
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for non-HTTPS environments
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        return true
      } finally {
        document.body.removeChild(textArea)
      }
    }
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Get media type from URL or file
 */
export function getMediaType(urlOrFile: string | File): 'image' | 'video' | 'document' | 'unknown' {
  let mimeType: string
  
  if (typeof urlOrFile === 'string') {
    // Determine type from URL extension
    const extension = urlOrFile.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image'
      case 'mp4':
      case 'webm':
      case 'ogg':
      case 'mov':
        return 'video'
      case 'pdf':
      case 'doc':
      case 'docx':
        return 'document'
      default:
        return 'unknown'
    }
  } else {
    mimeType = urlOrFile.type
  }
  
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document'
  
  return 'unknown'
}

/**
 * Create object URL with cleanup tracking
 */
export function createManagedObjectURL(file: File): {
  url: string
  cleanup: () => void
} {
  const url = URL.createObjectURL(file)
  
  return {
    url,
    cleanup: () => URL.revokeObjectURL(url)
  }
}

// ==========================================
// EDUCATIONAL CONTEXT UTILITIES
// ==========================================

/**
 * Get educational level display info
 */
export function getEducationalLevelInfo(level: string) {
  return EDUCATIONAL_LEVELS.find(l => l.value === level)
}

/**
 * Get educational context string for display
 */
export function formatEducationalContext(context: EducationalContext): string {
  const parts: string[] = []
  
  if (context.subject) parts.push(context.subject)
  if (context.level) {
    const levelInfo = getEducationalLevelInfo(context.level)
    parts.push(levelInfo?.label || context.level)
  }
  if (context.course) parts.push(context.course)
  if (context.institution) parts.push(context.institution)
  
  return parts.join(' • ')
}

/**
 * Check if two educational contexts match
 */
export function educationalContextsMatch(
  context1: EducationalContext, 
  context2: EducationalContext
): boolean {
  return (
    context1.subject === context2.subject &&
    context1.level === context2.level &&
    context1.course === context2.course &&
    context1.institution === context2.institution
  )
}

// ==========================================
// PERFORMANCE UTILITIES
// ==========================================

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Deep equality check for objects
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (obj1 == null || obj2 == null) return false
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual(obj1[key], obj2[key])) return false
  }
  
  return true
}

// ==========================================
// ERROR UTILITIES
// ==========================================

/**
 * Create standardized error object
 */
export function createAppError(
  message: string,
  code?: string,
  severity: ErrorSeverity = 'medium'
): AppError {
  return {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message,
    code,
    severity,
    timestamp: new Date(),
    recoverable: severity !== 'critical'
  }
}

/**
 * Extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  
  return 'An unexpected error occurred'
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const recoverablePatterns = [
    'NetworkError',
    'fetch',
    'timeout',
    'connection',
    'rate limit'
  ]
  
  return recoverablePatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  )
}

// ==========================================
// FILTER UTILITIES
// ==========================================

/**
 * Check if filters are empty
 */
export function areFiltersEmpty(filters: FeedFilters): boolean {
  return !filters.subject && 
         !filters.level && 
         !filters.course && 
         !filters.institution && 
         !filters.searchQuery && 
         !filters.authorId &&
         !filters.postType &&
         !filters.dateRange
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: FeedFilters): number {
  let count = 0
  
  if (filters.subject) count++
  if (filters.level) count++
  if (filters.course) count++
  if (filters.institution) count++
  if (filters.searchQuery) count++
  if (filters.authorId) count++
  if (filters.postType) count++
  if (filters.dateRange) count++
  
  return count
}

/**
 * Get filter summary string
 */
export function getFilterSummary(filters: FeedFilters): string {
  const activeCount = countActiveFilters(filters)
  if (activeCount === 0) return 'No filters applied'
  if (activeCount === 1) return '1 filter applied'
  return `${activeCount} filters applied`
}
