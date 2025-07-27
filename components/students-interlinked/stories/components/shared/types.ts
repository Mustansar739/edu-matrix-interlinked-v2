/**
 * ==========================================
 * STORIES SYSTEM - SHARED TYPES & INTERFACES
 * ==========================================
 * 
 * Production-ready TypeScript definitions for the Stories system
 * Used across all story-related components for type safety and consistency
 * 
 * Features:
 * ✅ Comprehensive type definitions
 * ✅ Strict TypeScript support
 * ✅ JSDoc documentation for better IntelliSense
 * ✅ Production-ready error types
 * ✅ Real-time interaction types
 * ✅ Media upload types with validation
 */

import { Session } from 'next-auth'

/**
 * Base story interface from API/Database
 * Represents a complete story object with all related data
 * PRODUCTION FIX: Updated to match hook interface for type compatibility
 */
export interface Story {
  id: string
  content?: string
  mediaUrls?: string[]
  mediaTypes?: ('image' | 'video')[]
  backgroundColor?: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'
  allowReplies: boolean
  allowReactions: boolean
  createdAt: string
  updatedAt?: string // PRODUCTION FIX: Made optional to match hook interface
  expiresAt?: string // PRODUCTION FIX: Added to match hook interface
  authorId: string
  author: {
    id: string
    name: string
    email?: string // PRODUCTION FIX: Made optional
    image?: string
    username?: string
    profile?: { // PRODUCTION FIX: Added profile support from hook
      profession?: string
      headline?: string
      major?: string
      academicLevel?: string
      institutionId?: string
    }
  }
  views?: Array<{
    id: string
    userId?: string // PRODUCTION FIX: Made optional to support different view formats
    viewedAt: string
  }>
  reactions?: Array<{
    id: string
    userId?: string // PRODUCTION FIX: Made optional
    reaction?: string // PRODUCTION FIX: Added reaction field
    type?: string // PRODUCTION FIX: Keep type for backward compatibility
    createdAt: string
  }>
  _count?: {
    views: number
    reactions: number
    replies: number
  }
}

/**
 * Props interface for the main StoriesSection component
 */
export interface StoriesSectionProps {
  userId: string
  className?: string
}

/**
 * Uploaded file interface for media management
 * Used during story creation and file upload process
 */
export interface UploadedFile {
  url: string
  fileId: string
  fileName: string
  type: string
  mediaType: 'image' | 'video'
  thumbnailUrl?: string
  originalName: string
  size: number
}

/**
 * Story interaction tracking interface
 * Used for analytics and real-time updates
 */
export interface StoryInteraction {
  type: 'like' | 'view' | 'reply' | 'share'
  timestamp: Date
  userId: string
}

/**
 * Story creation data interface
 * Used when creating new stories via API
 */
export interface StoryCreationData {
  content?: string
  mediaUrls?: string[]
  mediaTypes?: ('image' | 'video')[]
  backgroundColor?: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'
  allowReplies: boolean
  allowReactions: boolean
}

/**
 * Story reply data interface
 * Used when replying to stories
 */
export interface StoryReplyData {
  storyId: string
  content: string
  mediaUrls?: string[]
}

/**
 * Background color option interface
 * Used in story creator color picker
 */
export interface BackgroundColorOption {
  color: string
  name: string
}

/**
 * Story viewer state interface
 * Manages story viewing dialog state
 */
export interface StoryViewerState {
  isOpen: boolean
  selectedStory: Story | null
  currentIndex: number
  isPlaying: boolean
  isMuted: boolean
  progress: number
}

/**
 * Story creation state interface
 * Manages story creation dialog state
 */
export interface StoryCreationState {
  isOpen: boolean
  content: string
  uploadedFiles: UploadedFile[]
  backgroundColor: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
}

/**
 * Story reply state interface
 * Manages story reply dialog state
 */
export interface StoryReplyState {
  isOpen: boolean
  content: string
  mediaUrls: string[]
  isSubmitting: boolean
}

/**
 * API response interfaces for better error handling
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

export interface UploadResponse {
  success: boolean
  uploadedFiles?: UploadedFile[]
  error?: string
  warnings?: string[]
}

/**
 * Story navigation direction
 * Used for keyboard and gesture navigation
 */
export type NavigationDirection = 'next' | 'previous'

/**
 * Story media type discrimination
 * Used for type-safe media handling
 */
export type StoryMediaType = 'image' | 'video' | 'text'

/**
 * Error boundary state interface
 * Used for production-ready error handling
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * Story loading states
 * Used for proper loading UX across components
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Keyboard shortcut mapping
 * Used for accessibility and navigation
 */
export interface KeyboardShortcuts {
  nextStory: string[]
  previousStory: string[]
  togglePlay: string[]
  toggleMute: string[]
  toggleLike: string[]
  closeViewer: string[]
}

/**
 * Utility type for component props with children
 */
export interface ComponentWithChildren {
  children: React.ReactNode
  className?: string
}

/**
 * Session user type (extended from NextAuth)
 * Used for user authentication and permissions
 */
export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  username?: string | null
}

/**
 * Story statistics interface
 * Used for analytics and displaying story metrics
 */
export interface StoryStats {
  totalStories: number
  totalUsers: number
  viewCount: number
  likeCount: number
  replyCount: number
}

/**
 * File validation rules interface
 * Used for production-ready file upload validation
 */
export interface FileValidationRules {
  maxFileSize: number // in bytes
  maxFiles: number
  allowedImageTypes: string[]
  allowedVideoTypes: string[]
  maxDuration?: number // for videos in seconds
}

/**
 * Story visibility settings interface
 * Used for privacy controls
 */
export interface VisibilitySettings {
  type: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'
  label: string
  description: string
  icon: string
}

/**
 * Story group interface for organizing stories by user
 * Used in story feeds and collections
 */
export interface StoryGroup {
  userId: string
  stories: Story[]
  hasUnviewedStories: boolean
  lastStoryAt: string
}

/**
 * Stories data response interface
 * Used for API responses containing story groups
 */
export interface StoriesData {
  storyGroups: StoryGroup[]
  totalStories: number
  totalGroups: number
}

/**
 * Story session user interface for authenticated user context
 * Used throughout the stories system for user permissions and display
 */
export interface StorySessionUser {
  id: string
  name: string
  email: string
  image?: string
  username?: string
}
