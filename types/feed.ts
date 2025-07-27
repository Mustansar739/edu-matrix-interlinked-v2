/**
 * @fileoverview Feed Component Types - Comprehensive Type Definitions
 * @module Types/Feed
 * @version 1.0.0
 * 
 * ==========================================
 * FEED COMPONENT TYPE DEFINITIONS
 * ==========================================
 * 
 * This file contains all TypeScript interfaces and types used in feed components.
 * Ensures type safety and consistent data structures across the feed system.
 * 
 * PURPOSE:
 * - Provide type safety for all feed-related components
 * - Ensure consistent data structures
 * - Enable better IDE support and error detection
 * - Facilitate maintenance and refactoring
 * 
 * CATEGORIES:
 * - Educational Context Types
 * - Filter and Sort Types  
 * - Media and Content Types
 * - User Interaction Types
 * - Error and Loading State Types
 * 
 * @author GitHub Copilot
 * @since 2025-07-22
 */

import { 
  EducationalSubject, 
  EducationalLevel, 
  PostVisibility, 
  PostType, 
  SortOption 
} from '@/lib/constants/educational'

// ==========================================
// EDUCATIONAL CONTEXT TYPES
// ==========================================

/**
 * Educational context for posts and content
 * Provides academic context for better content organization
 */
export interface EducationalContext {
  /** Academic subject */
  subject?: EducationalSubject
  /** Educational level */
  level?: EducationalLevel
  /** Specific course or class */
  course?: string
  /** Institution or school */
  institution?: string
  /** Semester or term */
  semester?: string
  /** Additional tags for categorization */
  tags?: string[]
  /** Educational objectives or learning goals */
  objectives?: string[]
}

/**
 * Educational context validation result
 */
export interface EducationalContextValidation {
  /** Whether the context is valid */
  isValid: boolean
  /** Whether the context is complete */
  isComplete: boolean
  /** Missing required fields */
  missingFields: string[]
  /** Validation errors */
  errors: string[]
}

// ==========================================
// FILTER AND SORT TYPES
// ==========================================

/**
 * Feed filter configuration
 * Defines how content should be filtered in the feed
 */
export interface FeedFilters {
  /** Filter by academic subject */
  subject?: EducationalSubject
  /** Filter by educational level */
  level?: EducationalLevel
  /** Filter by specific course */
  course?: string
  /** Filter by institution */
  institution?: string
  /** Sort order for results */
  sortBy: SortOption
  /** Content type filter */
  postType?: PostType
  /** Date range filter */
  dateRange?: {
    start: Date
    end: Date
  }
  /** Search query */
  searchQuery?: string
  /** Author filter */
  authorId?: string
}

/**
 * Filter change event payload
 */
export interface FilterChangeEvent {
  /** Updated filter configuration */
  filters: FeedFilters
  /** Source of the change */
  source: 'user' | 'system' | 'context'
  /** Timestamp of change */
  timestamp: Date
}

/**
 * Quick filter action types
 */
export type QuickFilterAction = 
  | 'contextual'    // Apply user's educational context
  | 'clear'         // Clear all filters
  | 'recent'        // Show recent content
  | 'popular'       // Show popular content
  | 'following'     // Show content from followed users

// ==========================================
// MEDIA AND CONTENT TYPES
// ==========================================

/**
 * Media file interface for uploads and display
 */
export interface MediaFile {
  /** Unique identifier */
  id: string
  /** Media type */
  type: 'image' | 'video' | 'document' | 'audio'
  /** File URL */
  url: string
  /** Original filename */
  name: string
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType?: string
  /** File object for uploads */
  file?: File
  /** Alt text for accessibility */
  altText?: string
  /** Thumbnail URL for videos */
  thumbnailUrl?: string
  /** Duration for video/audio files */
  duration?: number
}

/**
 * Poll option interface
 */
export interface PollOption {
  /** Unique option identifier */
  id: string
  /** Option text */
  text: string
  /** Option image URL */
  imageUrl?: string
  /** Number of votes */
  voteCount: number
  /** Whether current user voted for this option */
  hasVoted: boolean
}

/**
 * Poll configuration interface
 */
export interface Poll {
  /** Unique poll identifier */
  id: string
  /** Poll question */
  question: string
  /** Available options */
  options: PollOption[]
  /** Allow multiple selections */
  allowMultiple: boolean
  /** Total vote count */
  totalVotes: number
  /** Whether current user has voted */
  hasVoted: boolean
  /** User's vote selections */
  userVotes: string[]
  /** Whether this is an educational poll */
  isEducational: boolean
  /** Correct answer(s) for educational polls */
  correctAnswer?: string[]
  /** Explanation for correct answer */
  explanation?: string
  /** Poll expiration date */
  expiresAt?: Date
  /** Anonymous voting */
  isAnonymous: boolean
}

// ==========================================
// USER INTERACTION TYPES
// ==========================================

/**
 * Post action counts interface
 */
export interface PostActionCounts {
  /** Number of likes */
  likes: number
  /** Number of comments */
  comments: number
  /** Number of shares */
  shares: number
  /** Number of views */
  views?: number
  /** Number of bookmarks */
  bookmarks?: number
}

/**
 * User reaction types
 */
export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'

/**
 * User reaction interface
 */
export interface UserReaction {
  /** Unique reaction identifier */
  id: string
  /** Type of reaction */
  type: ReactionType
  /** User who reacted */
  userId: string
  /** Timestamp of reaction */
  createdAt: Date
}

/**
 * Comment interface
 */
export interface SocialComment {
  /** Unique comment identifier */
  id: string
  /** Comment content */
  content: string
  /** Comment author */
  author: {
    id: string
    name: string
    avatar?: string
    isVerified?: boolean
  }
  /** Parent comment ID for replies */
  parentId?: string
  /** Number of likes */
  likeCount: number
  /** Whether current user liked */
  isLiked: boolean
  /** Comment timestamp */
  createdAt: Date
  /** Comment media attachments */
  media?: MediaFile[]
  /** Nested replies */
  replies?: SocialComment[]
}

// ==========================================
// POST AND FEED TYPES
// ==========================================

/**
 * Post author interface
 */
export interface PostAuthor {
  /** User identifier */
  id: string
  /** Display name */
  name: string
  /** Avatar image URL */
  avatar?: string
  /** Verification status */
  isVerified?: boolean
  /** Online status */
  isOnline?: boolean
  /** User's educational context */
  educationalContext?: EducationalContext
}

/**
 * Complete post interface
 */
export interface Post {
  /** Unique post identifier */
  id: string
  /** Post content */
  content: string
  /** Post author */
  author: PostAuthor
  /** Post type */
  type: PostType
  /** Media attachments */
  media?: MediaFile[]
  /** Image URLs (legacy support) */
  imageUrls?: string[]
  /** Video URLs (legacy support) */
  videoUrls?: string[]
  /** Document URLs (legacy support) */
  documentUrls?: string[]
  /** Poll data if post type is POLL */
  poll?: Poll
  /** Educational context */
  educationalContext?: EducationalContext
  /** Post visibility */
  visibility: PostVisibility
  /** Action counts */
  _count: PostActionCounts
  /** Whether current user liked */
  isLiked: boolean
  /** Whether current user bookmarked */
  isBookmarked: boolean
  /** Current user's reaction */
  userReaction?: UserReaction
  /** Post creation timestamp */
  createdAt: Date
  /** Post update timestamp */
  updatedAt: Date
  /** Whether post is pinned */
  isPinned?: boolean
  /** Whether post is archived */
  isArchived?: boolean
}

/**
 * Feed pagination interface
 */
export interface FeedPagination {
  /** Current page number */
  page: number
  /** Items per page */
  limit: number
  /** Total number of posts */
  totalPosts: number
  /** Total number of pages */
  totalPages: number
  /** Whether there's a next page */
  hasNextPage: boolean
  /** Whether there's a previous page */
  hasPreviousPage: boolean
}

/**
 * Feed data response interface
 */
export interface FeedResponse {
  /** Array of posts */
  posts: Post[]
  /** Pagination information */
  pagination: FeedPagination
  /** Applied filters */
  appliedFilters: FeedFilters
  /** Response metadata */
  metadata: {
    /** Response timestamp */
    timestamp: Date
    /** Response time in milliseconds */
    responseTime: number
    /** Data source */
    source: 'cache' | 'database' | 'realtime'
  }
}

// ==========================================
// ERROR AND LOADING STATE TYPES
// ==========================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Application error interface
 */
export interface AppError {
  /** Error identifier */
  id: string
  /** Error message */
  message: string
  /** Error code */
  code?: string
  /** Error severity */
  severity: ErrorSeverity
  /** Error timestamp */
  timestamp: Date
  /** Error context */
  context?: Record<string, any>
  /** Whether error is recoverable */
  recoverable: boolean
  /** Retry information */
  retry?: {
    /** Number of retry attempts */
    attempts: number
    /** Maximum retries allowed */
    maxRetries: number
    /** Next retry timestamp */
    nextRetry: Date
  }
}

/**
 * Loading state interface
 */
export interface LoadingState {
  /** Whether content is loading */
  isLoading: boolean
  /** Loading type */
  type: 'initial' | 'pagination' | 'refresh' | 'filter'
  /** Loading message */
  message?: string
  /** Progress percentage */
  progress?: number
}

/**
 * Real-time connection state
 */
export interface RealtimeConnectionState {
  /** Whether connected to real-time server */
  isConnected: boolean
  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  /** Last connection timestamp */
  lastConnected?: Date
  /** Connection error */
  error?: AppError
  /** Reconnection attempts */
  reconnectAttempts: number
}

// ==========================================
// COMPONENT PROP TYPES
// ==========================================

/**
 * Filter bar component props
 */
export interface FilterBarProps {
  /** Current filter configuration */
  filters: FeedFilters
  /** Filter change callback */
  onChange: (event: FilterChangeEvent) => void
  /** User's educational context */
  context?: EducationalContext
  /** Custom CSS classes */
  className?: string
  /** Whether filters are loading */
  isLoading?: boolean
  /** Whether filters are disabled */
  disabled?: boolean
  /** Error state */
  error?: AppError
}

/**
 * News feed component props
 */
export interface NewsFeedProps {
  /** Current user identifier */
  userId: string
  /** Initial filter configuration */
  initialFilters?: Partial<FeedFilters>
  /** Custom CSS classes */
  className?: string
  /** Maximum posts per page */
  postsPerPage?: number
  /** Whether to enable real-time updates */
  enableRealtime?: boolean
  /** Custom error boundary */
  errorBoundary?: React.ComponentType<any>
}

/**
 * Post card component props
 */
export interface PostCardProps {
  /** Post data */
  post: Post
  /** Whether to show full content */
  showFullContent?: boolean
  /** Like callback */
  onLike?: (postId: string) => void
  /** Comment callback */
  onComment?: (postId: string) => void
  /** Share callback */
  onShare?: (postId: string) => void
  /** Bookmark callback */
  onBookmark?: (postId: string) => void
  /** Post update callback */
  onUpdate?: (updatedPost: Post) => void
  /** Custom CSS classes */
  className?: string
  /** Whether actions are disabled */
  actionsDisabled?: boolean
}

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Component size variants
 */
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Component variant types
 */
export type ComponentVariant = 'default' | 'compact' | 'detailed' | 'minimal'

/**
 * Event handler types
 */
export type EventHandler<T = void> = (event: T) => void | Promise<void>

/**
 * Async operation result
 */
export interface AsyncResult<T> {
  /** Operation success status */
  success: boolean
  /** Result data */
  data?: T
  /** Error information */
  error?: AppError
  /** Operation metadata */
  metadata?: Record<string, any>
}
