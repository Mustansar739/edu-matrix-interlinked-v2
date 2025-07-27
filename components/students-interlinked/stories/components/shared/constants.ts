/**
 * ==========================================
 * STORIES SYSTEM - CONSTANTS & CONFIGURATION
 * ==========================================
 * 
 * Production-ready constants and configuration values
 * Used across all story-related components for consistency
 * 
 * Features:
 * ✅ File upload limits and validation rules
 * ✅ Story timing and duration settings
 * ✅ UI configuration and theme colors
 * ✅ API endpoints and error messages
 * ✅ Keyboard shortcuts and accessibility
 * ✅ Real-time update intervals
 */

import { BackgroundColorOption, FileValidationRules, KeyboardShortcuts, VisibilitySettings } from './types'

/**
 * Story timing configuration
 * Controls auto-advance and progress tracking
 */
export const STORY_TIMING = {
  DEFAULT_DURATION: 5000, // 5 seconds for images
  VIDEO_AUTO_DURATION: 15000, // 15 seconds max for videos
  PROGRESS_UPDATE_INTERVAL: 100, // Update progress every 100ms
  AUTO_ADVANCE_DELAY: 500, // Delay before advancing to next story
} as const

/**
 * File upload validation rules
 * Production-ready limits for media uploads
 */
export const FILE_VALIDATION: FileValidationRules = {
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  maxFiles: 5, // Maximum 5 files per story
  allowedImageTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ],
  allowedVideoTypes: [
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/avi'
  ],
  maxDuration: 60, // 60 seconds max for videos
}

/**
 * Story content limits
 * Prevents abuse and ensures good UX
 */
export const CONTENT_LIMITS = {
  MAX_STORY_TEXT_LENGTH: 1000,
  MAX_REPLY_TEXT_LENGTH: 1000,
  MIN_CONTENT_LENGTH: 1,
} as const

/**
 * Background color palette for text stories
 * Accessibility-compliant colors with proper contrast
 */
export const BACKGROUND_COLORS: BackgroundColorOption[] = [
  { color: '#3b82f6', name: 'Blue' },
  { color: '#ef4444', name: 'Red' },
  { color: '#10b981', name: 'Green' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#84cc16', name: 'Lime' },
  { color: '#f97316', name: 'Orange' },
  { color: '#6366f1', name: 'Indigo' },
  { color: '#14b8a6', name: 'Teal' },
  { color: '#eab308', name: 'Yellow' },
]

/**
 * Story visibility options with metadata
 * Used in story creator for privacy settings
 */
export const VISIBILITY_OPTIONS: VisibilitySettings[] = [
  {
    type: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can see this story',
    icon: 'Globe',
  },
  {
    type: 'FOLLOWERS',
    label: 'Followers',
    description: 'Only your followers can see this story',
    icon: 'Users',
  },
  {
    type: 'PRIVATE',
    label: 'Private',
    description: 'Only you can see this story',
    icon: 'Lock',
  },
]

/**
 * Keyboard shortcuts for accessibility
 * Enables full keyboard navigation of story interface
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  nextStory: ['ArrowRight', ' '], // Right arrow or spacebar
  previousStory: ['ArrowLeft'],
  togglePlay: ['p', 'P'],
  toggleMute: ['m', 'M'],
  toggleLike: ['l', 'L'],
  closeViewer: ['Escape'],
}

/**
 * API endpoints for story operations
 * Centralized endpoint management
 */
export const API_ENDPOINTS = {
  UPLOAD_STORIES: '/api/upload/imagekit/stories',
  CREATE_STORY: '/api/stories/create',
  VIEW_STORY: '/api/stories/view',
  REPLY_STORY: '/api/stories/reply',
  LIKE_STORY: '/api/stories/like',
  DELETE_STORY: '/api/stories/delete',
} as const

/**
 * Error messages for user feedback
 * Consistent, user-friendly error messaging
 */
export const ERROR_MESSAGES = {
  UPLOAD: {
    FILE_TOO_LARGE: 'File size exceeds 10MB limit',
    TOO_MANY_FILES: 'Maximum 5 files allowed per story',
    INVALID_FILE_TYPE: 'File type not supported',
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    NETWORK_ERROR: 'Network error during upload',
    TIMEOUT: 'Upload timeout - please try again with smaller files',
  },
  STORY: {
    CONTENT_REQUIRED: 'Please add some content or media to your story',
    CONTENT_TOO_LONG: 'Story content must be 1000 characters or less',
    CREATION_FAILED: 'Failed to create story',
    VIEW_FAILED: 'Failed to load story',
    DELETE_FAILED: 'Failed to delete story',
  },
  REPLY: {
    CONTENT_REQUIRED: 'Please enter a reply message',
    CONTENT_TOO_LONG: 'Reply must be 1000 characters or less',
    CANNOT_REPLY_OWN: 'You cannot reply to your own story',
    REPLIES_DISABLED: 'The author has disabled replies for this story',
    SEND_FAILED: 'Failed to send reply',
  },
  GENERAL: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNKNOWN_ERROR: 'An unexpected error occurred',
  },
} as const

/**
 * Success messages for user feedback
 * Consistent, encouraging success messaging
 */
export const SUCCESS_MESSAGES = {
  STORY: {
    CREATED: 'Story created successfully! 📸',
    DELETED: 'Story deleted successfully',
    LIKED: 'Story liked! ❤️',
    UNLIKED: 'Story unliked',
  },
  UPLOAD: {
    SINGLE_FILE: 'File uploaded successfully! ✅',
    MULTIPLE_FILES: (count: number) => `${count} files uploaded successfully! ✅`,
  },
  REPLY: {
    SENT: (authorName: string) => `Reply sent to ${authorName}! 📩`,
  },
} as const

/**
 * Loading states and messages
 * Consistent loading UX across components
 */
export const LOADING_MESSAGES = {
  STORIES: 'Loading stories...',
  CREATING: 'Creating story...',
  UPLOADING: 'Uploading files...',
  SENDING: 'Sending reply...',
  PROCESSING: 'Processing...',
} as const

/**
 * Animation and transition durations (in milliseconds)
 * Consistent timing for smooth UX
 */
export const ANIMATIONS = {
  STORY_TRANSITION: 200,
  HOVER_SCALE: 200,
  FADE_IN: 150,
  FADE_OUT: 100,
  PROGRESS_SMOOTH: 200,
  DIALOG_ENTER: 150,
  DIALOG_EXIT: 100,
} as const

/**
 * Story dimensions and layout
 * Responsive design constants
 */
export const STORY_LAYOUT = {
  PREVIEW_WIDTH: 80, // pixels
  PREVIEW_HEIGHT: 128, // pixels
  VIEWER_MAX_WIDTH: 400, // pixels
  VIEWER_HEIGHT: 600, // pixels
  PROGRESS_BAR_HEIGHT: 4, // pixels
} as const

/**
 * Real-time update intervals
 * Controls frequency of live updates
 */
export const REALTIME_CONFIG = {
  STORY_REFRESH_INTERVAL: 30000, // 30 seconds
  INTERACTION_DEBOUNCE: 300, // 300ms
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 5000, // 5 seconds
} as const

/**
 * Cache configuration
 * Redis and browser caching settings
 */
export const CACHE_CONFIG = {
  STORY_LIST_TTL: 300, // 5 minutes
  STORY_CONTENT_TTL: 3600, // 1 hour
  USER_STORIES_TTL: 600, // 10 minutes
  STORY_STATS_TTL: 60, // 1 minute
} as const

/**
 * Accessibility configuration
 * WCAG 2.1 AA compliance settings
 */
export const ACCESSIBILITY = {
  FOCUS_RING_WIDTH: 2,
  MIN_TOUCH_TARGET: 44, // pixels (WCAG guideline)
  SCREEN_READER_DELAY: 100, // milliseconds
  KEYBOARD_NAVIGATION_DELAY: 200, // milliseconds
} as const

/**
 * Story expiration settings
 * Controls how long stories remain visible
 */
export const STORY_EXPIRATION = {
  DEFAULT_HOURS: 24, // Stories expire after 24 hours
  GRACE_PERIOD_HOURS: 1, // 1 hour grace period for viewing
  CHECK_INTERVAL_MINUTES: 30, // Check for expired stories every 30 minutes
} as const
