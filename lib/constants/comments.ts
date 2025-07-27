/**
 * Nested Comments System Configuration
 * 
 * Purpose: Centralized configuration for production-ready comment system
 * Features:
 * - Maximum nesting depth control
 * - Performance optimization settings
 * - UI behavior configuration
 * - Production safety limits
 */

// ==========================================
// COMMENT NESTING CONFIGURATION
// ==========================================

/**
 * Maximum comment nesting depth to prevent:
 * - UI overflow on mobile devices
 * - Database query performance issues
 * - Infinite nesting scenarios
 * - Memory consumption in recursive rendering
 */
export const MAX_COMMENT_DEPTH = 5;

/**
 * Maximum comments to display per page
 * Balances performance with user experience
 */
export const COMMENTS_PER_PAGE = 20;

/**
 * Maximum nested replies to load initially
 * Prevents overwhelming UI with too many nested replies
 */
export const MAX_INITIAL_REPLIES = 3;

/**
 * Maximum replies to load in each "Load more" request
 * Optimizes for network performance and UI responsiveness
 */
export const REPLIES_PER_LOAD = 10;

// ==========================================
// PERFORMANCE CONFIGURATION
// ==========================================

/**
 * Debounce delay for typing indicators (milliseconds)
 * Prevents excessive socket emissions during fast typing
 */
export const TYPING_DEBOUNCE_DELAY = 300;

/**
 * Maximum content length for comments
 * Prevents database bloat and UI overflow
 */
export const MAX_COMMENT_LENGTH = 2000;

/**
 * Cache duration for comment data in Redis (seconds)
 * Balances data freshness with performance
 */
export const COMMENT_CACHE_DURATION = 3600; // 1 hour

/**
 * Maximum images allowed per comment
 * Controls storage costs and UI complexity
 */
export const MAX_IMAGES_PER_COMMENT = 4;

// ==========================================
// UI BEHAVIOR CONFIGURATION
// ==========================================

/**
 * Automatic expansion threshold
 * Comments with fewer replies than this will be auto-expanded
 */
export const AUTO_EXPAND_THRESHOLD = 2;

/**
 * Animation duration for expand/collapse (milliseconds)
 * Provides smooth user experience without being slow
 */
export const ANIMATION_DURATION = 200;

/**
 * Minimum comment length for submission
 * Prevents spam and empty comments
 */
export const MIN_COMMENT_LENGTH = 1;

/**
 * Maximum visible nested indentation levels in UI
 * After this depth, all further nesting uses same indentation
 */
export const MAX_VISUAL_NESTING = 3;

// ==========================================
// REAL-TIME CONFIGURATION
// ==========================================

/**
 * Socket.IO room prefix for comment rooms
 * Ensures consistent room naming across the application
 */
export const COMMENT_ROOM_PREFIX = 'post';

/**
 * Maximum retry attempts for failed real-time operations
 * Balances reliability with performance
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Retry delay multiplier for exponential backoff (milliseconds)
 * Prevents overwhelming the server during outages
 */
export const RETRY_DELAY_BASE = 1000;

// ==========================================
// ERROR HANDLING CONFIGURATION
// ==========================================

/**
 * Maximum error messages to display simultaneously
 * Prevents UI from being overwhelmed with error messages
 */
export const MAX_ERROR_MESSAGES = 3;

/**
 * Error message display duration (milliseconds)
 * Auto-dismisses non-critical errors
 */
export const ERROR_MESSAGE_DURATION = 5000;

/**
 * Critical error types that should not auto-dismiss
 * These require user acknowledgment
 */
export const CRITICAL_ERROR_TYPES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMIT_EXCEEDED',
  'MAX_DEPTH_EXCEEDED'
] as const;

// ==========================================
// ACCESSIBILITY CONFIGURATION
// ==========================================

/**
 * Keyboard navigation configuration
 * Ensures accessible comment system
 */
export const KEYBOARD_SHORTCUTS = {
  SUBMIT_COMMENT: 'Ctrl+Enter',
  CANCEL_EDIT: 'Escape',
  REPLY_TO_COMMENT: 'r',
  EXPAND_COLLAPSE: 'Space'
} as const;

/**
 * Screen reader friendly labels
 * Improves accessibility for visually impaired users
 */
export const ARIA_LABELS = {
  COMMENT_THREAD: 'Comment thread',
  NESTED_REPLIES: 'Nested replies',
  EXPAND_REPLIES: 'Expand replies',
  COLLAPSE_REPLIES: 'Collapse replies',
  REPLY_TO_COMMENT: 'Reply to comment',
  LIKE_COMMENT: 'Like comment',
  EDIT_COMMENT: 'Edit comment',
  DELETE_COMMENT: 'Delete comment'
} as const;

// ==========================================
// PRODUCTION SAFETY LIMITS
// ==========================================

/**
 * Rate limiting configuration
 * Prevents abuse and ensures system stability
 */
export const RATE_LIMITS = {
  COMMENTS_PER_MINUTE: 10,
  LIKES_PER_MINUTE: 30,
  EDITS_PER_MINUTE: 5,
  DELETES_PER_MINUTE: 3
} as const;

/**
 * Content moderation thresholds
 * Automated content filtering for production safety
 */
export const MODERATION_THRESHOLDS = {
  MAX_MENTIONS_PER_COMMENT: 5,
  MAX_LINKS_PER_COMMENT: 2,
  SPAM_DETECTION_THRESHOLD: 0.8
} as const;

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type CommentDepth = 0 | 1 | 2 | 3 | 4 | 5;
export type CriticalErrorType = typeof CRITICAL_ERROR_TYPES[number];
export type KeyboardShortcut = keyof typeof KEYBOARD_SHORTCUTS;
export type AriaLabel = keyof typeof ARIA_LABELS;

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Validate comment depth
 * @param depth - Current comment depth
 * @returns boolean - Whether depth is within limits
 */
export function isValidCommentDepth(depth: number): depth is CommentDepth {
  return depth >= 0 && depth <= MAX_COMMENT_DEPTH;
}

/**
 * Validate comment content length
 * @param content - Comment content
 * @returns boolean - Whether content length is valid
 */
export function isValidCommentLength(content: string): boolean {
  return content.length >= MIN_COMMENT_LENGTH && content.length <= MAX_COMMENT_LENGTH;
}

/**
 * Calculate visual nesting level
 * @param actualDepth - Actual comment depth
 * @returns number - Visual nesting level (capped at MAX_VISUAL_NESTING)
 */
export function getVisualNestingLevel(actualDepth: number): number {
  return Math.min(actualDepth, MAX_VISUAL_NESTING);
}

/**
 * Check if error is critical
 * @param errorType - Error type string
 * @returns boolean - Whether error is critical
 */
export function isCriticalError(errorType: string): errorType is CriticalErrorType {
  return CRITICAL_ERROR_TYPES.includes(errorType as CriticalErrorType);
}

export default {
  MAX_COMMENT_DEPTH,
  COMMENTS_PER_PAGE,
  MAX_INITIAL_REPLIES,
  REPLIES_PER_LOAD,
  TYPING_DEBOUNCE_DELAY,
  MAX_COMMENT_LENGTH,
  COMMENT_CACHE_DURATION,
  MAX_IMAGES_PER_COMMENT,
  AUTO_EXPAND_THRESHOLD,
  ANIMATION_DURATION,
  MIN_COMMENT_LENGTH,
  MAX_VISUAL_NESTING,
  COMMENT_ROOM_PREFIX,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE,
  MAX_ERROR_MESSAGES,
  ERROR_MESSAGE_DURATION,
  CRITICAL_ERROR_TYPES,
  KEYBOARD_SHORTCUTS,
  ARIA_LABELS,
  RATE_LIMITS,
  MODERATION_THRESHOLDS,
  isValidCommentDepth,
  isValidCommentLength,
  getVisualNestingLevel,
  isCriticalError
} as const;
