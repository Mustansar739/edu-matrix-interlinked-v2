/**
 * ==========================================
 * STORIES SYSTEM - UTILITY FUNCTIONS
 * ==========================================
 * 
 * Production-ready utility functions for story operations
 * Includes file validation, time formatting, and error handling
 * 
 * Features:
 * ✅ File upload validation and processing
 * ✅ Time and date formatting utilities
 * ✅ Story content validation
 * ✅ Error handling and logging
 * ✅ Media type detection and processing
 * ✅ Accessibility helpers
 */

import { FILE_VALIDATION, CONTENT_LIMITS, ERROR_MESSAGES } from './constants'
import { UploadedFile, Story, StoryMediaType } from './types'

/**
 * Validates file size against production limits
 * @param file - File to validate
 * @returns boolean indicating if file size is valid
 */
export const isValidFileSize = (file: File): boolean => {
  return file.size <= FILE_VALIDATION.maxFileSize
}

/**
 * Validates file type for story uploads
 * @param file - File to validate
 * @returns boolean indicating if file type is allowed
 */
export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    ...FILE_VALIDATION.allowedImageTypes,
    ...FILE_VALIDATION.allowedVideoTypes
  ]
  return allowedTypes.includes(file.type)
}

/**
 * Determines if file is a video based on MIME type
 * @param file - File to check
 * @returns boolean indicating if file is video
 */
export const isVideoFile = (file: File): boolean => {
  return FILE_VALIDATION.allowedVideoTypes.includes(file.type)
}

/**
 * Determines if file is an image based on MIME type
 * @param file - File to check
 * @returns boolean indicating if file is image
 */
export const isImageFile = (file: File): boolean => {
  return FILE_VALIDATION.allowedImageTypes.includes(file.type)
}

/**
 * Validates multiple files for story upload
 * @param files - FileList to validate
 * @param existingCount - Number of already uploaded files
 * @returns object with validation result and error message
 */
export const validateFiles = (
  files: FileList, 
  existingCount: number = 0
): { isValid: boolean; error?: string; oversizedFiles?: File[] } => {
  const fileArray = Array.from(files)
  
  // Check total file count
  if (existingCount + fileArray.length > FILE_VALIDATION.maxFiles) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.UPLOAD.TOO_MANY_FILES
    }
  }

  // Check individual file sizes
  const oversizedFiles = fileArray.filter(file => !isValidFileSize(file))
  if (oversizedFiles.length > 0) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.UPLOAD.FILE_TOO_LARGE,
      oversizedFiles
    }
  }

  // Check file types
  const invalidTypeFiles = fileArray.filter(file => !isValidFileType(file))
  if (invalidTypeFiles.length > 0) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.UPLOAD.INVALID_FILE_TYPE
    }
  }

  return { isValid: true }
}

/**
 * Formats file size for human-readable display
 * @param bytes - Size in bytes
 * @returns formatted string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Validates story content length
 * @param content - Story text content
 * @returns boolean indicating if content length is valid
 */
export const isValidContentLength = (content: string): boolean => {
  const trimmed = content.trim()
  return trimmed.length <= CONTENT_LIMITS.MAX_STORY_TEXT_LENGTH
}

/**
 * Validates reply content length
 * @param content - Reply text content
 * @returns boolean indicating if content length is valid
 */
export const isValidReplyLength = (content: string): boolean => {
  const trimmed = content.trim()
  return trimmed.length > 0 && trimmed.length <= CONTENT_LIMITS.MAX_REPLY_TEXT_LENGTH
}

/**
 * Formats time elapsed since story creation
 * @param createdAt - ISO date string
 * @returns formatted time string (e.g., "2h ago", "5m ago")
 */
export const formatTimeAgo = (createdAt: string): string => {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}

/**
 * Checks if story has expired (older than 24 hours)
 * @param createdAt - ISO date string
 * @returns boolean indicating if story is expired
 */
export const isStoryExpired = (createdAt: string): boolean => {
  const now = new Date()
  const created = new Date(createdAt)
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  return diffHours > 24
}

/**
 * Determines story media type based on content
 * @param story - Story object
 * @returns story media type
 */
export const getStoryMediaType = (story: Story): StoryMediaType => {
  if (!story.mediaUrls || story.mediaUrls.length === 0) {
    return 'text'
  }
  
  const firstMediaUrl = story.mediaUrls[0]
  if (firstMediaUrl.includes('video') || firstMediaUrl.endsWith('.mp4')) {
    return 'video'
  }
  
  return 'image'
}

/**
 * Generates accessible alt text for story media
 * @param story - Story object
 * @returns alt text string
 */
export const generateAltText = (story: Story): string => {
  const mediaType = getStoryMediaType(story)
  const authorName = story.author.name
  
  switch (mediaType) {
    case 'image':
      return `${authorName}'s story image`
    case 'video':
      return `${authorName}'s story video`
    case 'text':
      return `${authorName}'s text story`
    default:
      return `${authorName}'s story`
  }
}

/**
 * Generates accessible aria-label for story interactions
 * @param action - Action type (like, reply, share, etc.)
 * @param story - Story object
 * @returns aria-label string
 */
export const generateAriaLabel = (action: string, story: Story): string => {
  const authorName = story.author.name
  
  switch (action) {
    case 'like':
      return `Like ${authorName}'s story`
    case 'reply':
      return `Reply to ${authorName}'s story`
    case 'share':
      return `Share ${authorName}'s story`
    case 'view':
      return `View ${authorName}'s story`
    default:
      return `Interact with ${authorName}'s story`
  }
}

/**
 * Safely extracts filename from URL
 * @param url - File URL
 * @returns filename or fallback
 */
export const extractFilename = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || 'unknown-file'
    return filename
  } catch {
    return 'unknown-file'
  }
}

/**
 * Debounces function calls for performance optimization
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttles function calls for performance optimization
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Creates a production-ready console logger with context
 * @param component - Component name for logging context
 * @returns logger object with different log levels
 */
export const createLogger = (component: string) => ({
  info: (message: string, data?: any) => {
    console.log(`📋 [${component}] ${message}`, data ? data : '')
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [${component}] ${message}`, error ? error : '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [${component}] ${message}`, data ? data : '')
  },
  success: (message: string, data?: any) => {
    console.log(`✅ [${component}] ${message}`, data ? data : '')
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🐛 [${component}] ${message}`, data ? data : '')
    }
  }
})

/**
 * Handles API errors with user-friendly messages
 * @param error - Error object
 * @returns user-friendly error message
 */
export const handleApiError = (error: any): string => {
  if (error?.response?.status === 401) {
    return ERROR_MESSAGES.GENERAL.UNAUTHORIZED
  }
  
  if (error?.response?.status >= 500) {
    return ERROR_MESSAGES.GENERAL.SERVER_ERROR
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return ERROR_MESSAGES.GENERAL.NETWORK_ERROR
  }
  
  return error?.message || ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
}

/**
 * Truncates text with ellipsis for display
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Validates story content before submission
 * @param content - Story text content
 * @param mediaUrls - Array of media URLs
 * @returns validation result with error message if invalid
 */
export const validateStoryContent = (content: string, mediaUrls: string[] = []): { isValid: boolean; error?: string } => {
  // Story must have either content or media
  if (!content?.trim() && (!mediaUrls || mediaUrls.length === 0)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.STORY.CONTENT_REQUIRED
    }
  }

  // Check content length if provided
  if (content && content.length > CONTENT_LIMITS.MAX_STORY_TEXT_LENGTH) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.STORY.CONTENT_TOO_LONG
    }
  }

  // Check media count limits
  if (mediaUrls && mediaUrls.length > FILE_VALIDATION.maxFiles) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.UPLOAD.TOO_MANY_FILES
    }
  }

  return { isValid: true }
}

/**
 * Validates reply content before submission
 * @param content - Reply text content
 * @returns validation result with error message if invalid
 */
export const validateReplyContent = (content: string): { isValid: boolean; error?: string } => {
  // Reply must have content
  if (!content?.trim()) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.REPLY.CONTENT_REQUIRED
    }
  }

  // Check content length
  if (content.length > CONTENT_LIMITS.MAX_REPLY_TEXT_LENGTH) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.REPLY.CONTENT_TOO_LONG
    }
  }

  return { isValid: true }
}

/**
 * Generates unique ID for components
 * @param prefix - Optional prefix for the ID
 * @returns unique string ID
 */
export const generateId = (prefix?: string): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}

/**
 * Checks if user has viewed a specific story
 * @param story - Story object
 * @param userId - User ID to check
 * @returns boolean indicating if user has viewed the story
 */
export const hasUserViewedStory = (story: Story, userId: string): boolean => {
  return story.views?.some(view => view.userId === userId) || false
}

/**
 * Checks if user owns a specific story
 * @param story - Story object
 * @param userId - User ID to check
 * @returns boolean indicating if user owns the story
 */
export const isUserStoryOwner = (story: Story, userId: string): boolean => {
  return story.authorId === userId
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns parsed object or fallback
 */
export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return fallback
  }
}
