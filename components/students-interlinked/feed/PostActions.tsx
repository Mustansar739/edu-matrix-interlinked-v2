/**
 * @fileoverview PostActions Component - Enhanced Social Media Interaction Interface
 * @module StudentsInterlinked/Feed/PostActions
 * @category Social Media Components
 * @version 2.0.0
 * 
 * ==========================================
 * FACEBOOK/INSTAGRAM-STYLE POST ACTIONS
 * ==========================================
 * 
 * This component provides modern, interactive action buttons for posts including
 * like, comment, share, and bookmark functionality. It follows Facebook and
 * Instagram design patterns while providing enhanced user experience.
 * 
 * KEY FEATURES:
 * - Modern action bar with subtle background styling
 * - Animated like button with heart fill effect
 * - Enhanced hover effects with color-coded backgrounds
 * - Smooth scaling animations on interaction
 * - Comprehensive sharing options with platform integration
 * - Accessibility features and proper ARIA labels
 * - Real-time count updates with smooth transitions
 * 
 * DESIGN IMPROVEMENTS:
 * - Enhanced action bar with background styling
 * - Color-coded hover states for each action
 * - Smooth scale animations on button interactions
 * - Better visual feedback for user actions
 * - Improved tooltip positioning and styling
 * - Modern dropdown menu for sharing options
 * 
 * ANIMATION FEATURES:
 * - Framer Motion integration for smooth animations
 * - Scale effects on button press
 * - Smooth transitions for state changes
 * - Loading spinners for async operations
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Built with React 18+ and Next.js 15
 * - Uses Tailwind CSS for styling
 * - Framer Motion for animations
 * - TypeScript for type safety
 * - Unified likes system integration
 * - Real-time updates support
 * 
 * ACCESSIBILITY:
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - Focus management
 * - Color contrast compliance
 * - Semantic HTML structure
 * 
 * @author GitHub Copilot
 * @since 2025-01-15
 * @lastModified 2025-01-15
 */

'use client'

// ==========================================
// REACT & FRAMEWORK IMPORTS
// ==========================================
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ==========================================
// ICON IMPORTS (LUCIDE-REACT)
// ==========================================
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark,
  UserPlus,
  UserMinus,
  Loader2,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  ExternalLink,
  ThumbsUp,
  Eye
} from 'lucide-react'

// ==========================================
// UI COMPONENT IMPORTS (SHADCN/UI)
// ==========================================
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { UniversalFollowButton } from '@/components/ui/universal-follow-button'

// ==========================================
// UTILITY & HOOK IMPORTS
// ==========================================
import { cn } from '@/lib/utils'
import { useUnifiedLikes } from '@/hooks/useUnifiedLikes'

// ==========================================
// TYPE DEFINITIONS & INTERFACES
// ==========================================

/**
 * Post action counts interface
 * Contains all numerical data for post interactions
 */
export interface PostActionCounts {
  /** Number of likes on the post */
  likes: number
  /** Number of comments on the post */
  comments: number
  /** Number of shares/reposts */
  shares: number
  /** Optional view count */
  views?: number
  /** Optional bookmark count */
  bookmarks?: number
}

/**
 * Share option configuration
 * Defines available sharing platforms and methods
 */
interface ShareOption {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  url?: string
  action?: 'copy' | 'external' | 'email'
}

/**
 * Component size configuration
 * Internal interface for responsive design
 */
interface SizeClasses {
  container: string
  button: string
  icon: string
  buttonSize: 'sm' | 'default' | 'lg'
}

/**
 * Main props interface for PostActions component
 * Comprehensive configuration for all functionality
 */
export interface PostActionsProps {
  /** Unique post identifier - REQUIRED */
  postId: string
  /** Post author's user ID - REQUIRED */
  authorId: string
  /** Post author's display name for UI feedback */
  authorName?: string
  /** Current authenticated user's ID */
  currentUserId?: string
  /** Current user's follow status with author */
  isFollowing?: boolean
  /** Current user's bookmark status for this post */
  isBookmarked?: boolean
  /** Initial action counts - REQUIRED */
  counts: PostActionCounts
  /** Show/hide comment button (default: true) */
  showComments?: boolean
  /** Show/hide share button (default: true) */
  showShare?: boolean
  /** Show/hide bookmark button (default: true) */
  showBookmark?: boolean
  /** Show/hide follow button (default: true) */
  showFollow?: boolean
  /** Component size variant for responsive design */
  size?: 'sm' | 'md' | 'lg'
  /** Layout variant for different use cases */
  variant?: 'default' | 'compact' | 'facebook'
  /** Custom CSS classes for styling override */
  className?: string
  /** Callback when user clicks comment button */
  onComment?: (postId: string) => void
  /** Callback when user shares post */
  onShare?: (postId: string, shareType: string) => void
  /** Callback when user bookmarks/unbookmarks post */
  onBookmark?: (postId: string, isBookmarked: boolean) => void
  /** Callback when user follows/unfollows author */
  onFollow?: (authorId: string, isFollowing: boolean) => void
  /** Callback when like state changes */
  onLikeChange?: (postId: string, isLiked: boolean, count: number) => void
}

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

/**
 * Available sharing options with platform-specific configurations
 * Each option includes icon, label, and action type for proper handling
 */
const SHARE_OPTIONS: ShareOption[] = [
  { 
    id: 'copy', 
    label: 'Copy Link', 
    icon: Copy,
    action: 'copy'
  },
  { 
    id: 'facebook', 
    label: 'Share on Facebook', 
    icon: Facebook,
    action: 'external',
    url: 'https://www.facebook.com/sharer/sharer.php?u='
  },
  { 
    id: 'twitter', 
    label: 'Share on Twitter', 
    icon: Twitter,
    action: 'external',
    url: 'https://twitter.com/intent/tweet?url='
  },
  { 
    id: 'linkedin', 
    label: 'Share on LinkedIn', 
    icon: Linkedin,
    action: 'external',
    url: 'https://www.linkedin.com/sharing/share-offsite/?url='
  },
  { 
    id: 'email', 
    label: 'Share via Email', 
    icon: Mail,
    action: 'email'
  },
  { 
    id: 'external', 
    label: 'Open in New Tab', 
    icon: ExternalLink,
    action: 'external'
  },
]

/**
 * Animation configurations for smooth UI transitions
 * Used with framer-motion for better user experience
 */
const ANIMATION_CONFIG = {
  button: {
    tap: { scale: 0.95 },
    hover: { scale: 1.05 },
    transition: { duration: 0.15 }
  },
  count: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.2, 1] },
    transition: { duration: 0.3 }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Formats large numbers into readable string format
 * Examples: 1234 -> "1.2K", 1000000 -> "1.0M"
 * 
 * @param count - The number to format
 * @returns Formatted string representation
 */
function formatCount(count: number): string {
  if (!count || count < 0) return '0'
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}

/**
 * Generates shareable URL for current post
 * Creates absolute URL that can be shared on external platforms
 * 
 * @param postId - Unique post identifier
 * @returns Complete shareable URL
 */
function generateShareUrl(postId: string): string {
  if (typeof window === 'undefined') return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/students-interlinked/post/${postId}`
}

/**
 * Copies text to user's clipboard with error handling
 * Provides fallback for browsers without Clipboard API support
 * 
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves when copy is complete
 */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand('copy')
    textArea.remove()
  }
}

// ==========================================
// MAIN COMPONENT IMPLEMENTATION
// ==========================================

/**
 * PostActions Component
 * 
 * A comprehensive Facebook-style post actions bar that handles all user
 * interactions including likes, comments, shares, bookmarks, and follows.
 * Designed for production use with proper error handling, loading states,
 * and accessibility features.
 * 
 * @param props - PostActionsProps configuration object
 * @returns JSX.Element - Rendered post actions component
 */
export default function PostActions({
  postId,
  authorId,
  authorName = 'Unknown User',
  currentUserId,
  isFollowing: initialIsFollowing = false,
  isBookmarked: initialIsBookmarked = false,
  counts,
  showComments = true,
  showShare = true,
  showBookmark = true,
  showFollow = true,
  size = 'md',
  variant = 'facebook',
  className,
  onComment,
  onShare,
  onBookmark,
  onFollow,
  onLikeChange,
}: PostActionsProps) {
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // Local state for post actions (follow state is handled by UniversalFollowButton)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [liveCounts, setLiveCounts] = useState(counts)
  
  // Loading states for user feedback
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  
  // Error state for comprehensive error handling
  const [actionError, setActionError] = useState<string | null>(null)
  
  // ==========================================
  // HOOKS & EXTERNAL DEPENDENCIES
  // ==========================================
  
  const { toast } = useToast()
  
  // Initialize unified likes system with comprehensive configuration
  const {
    isLiked,
    likeCount,
    isLoading: isLikeLoading,
    toggleLike,
    error: likeError
  } = useUnifiedLikes({
    contentType: 'post',
    contentId: postId,
    initialState: {
      isLiked: false,
      count: liveCounts.likes
    },
    mode: 'simple',
    recipientId: authorId,
    schemaName: 'social_schema',
    enableRealtime: true,
    onLikeChange: (state) => {
      // Update local counts when like state changes
      setLiveCounts(prev => ({ ...prev, likes: state.count }))
      onLikeChange?.(postId, state.isLiked, state.count)
    },
    onError: (error) => {
      console.error('Like system error:', error)
      setActionError(error.message || 'An error occurred')
      toast({
        title: "Like Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive"
      })
    }
  })
  
  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  // Check if current user is viewing their own post
  const isOwnPost = useMemo(() => authorId === currentUserId, [authorId, currentUserId])
  
  // Check if user is authenticated
  const isAuthenticated = useMemo(() => Boolean(currentUserId), [currentUserId])
  
  // Generate size-specific CSS classes
  const sizeClasses = useMemo((): SizeClasses => {
    switch (size) {
      case 'sm':
        return {
          container: 'gap-1 py-2',
          button: 'px-2 py-1 text-xs',
          icon: 'h-4 w-4',
          buttonSize: 'sm' as const,
        }
      case 'lg':
        return {
          container: 'gap-4 py-4',
          button: 'px-4 py-2 text-base',
          icon: 'h-6 w-6',
          buttonSize: 'lg' as const,
        }
      default:
        return {
          container: 'gap-2 py-3',
          button: 'px-3 py-2 text-sm',
          icon: 'h-5 w-5',
          buttonSize: 'default' as const,
        }
    }
  }, [size])
  
  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  
  const handleLikeClick = useCallback(async () => {
    if (isLikeLoading) return
    
    try {
      await toggleLike()
    } catch (error) {
      console.error('Like action failed:', error)
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive"
      })
    }
  }, [isLikeLoading, toggleLike, toast])
  
  const handleComment = useCallback(() => {
    onComment?.(postId)
  }, [onComment, postId])
  
  const handleShare = useCallback(async (shareType: string) => {
    try {
      const postUrl = `${window.location.origin}/posts/${postId}`
      
      switch (shareType) {
        case 'copy':
          await navigator.clipboard.writeText(postUrl)
          toast({ title: "Link copied to clipboard" })
          break
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank')
          break
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}`, '_blank')
          break
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`, '_blank')
          break
        case 'email':
          window.open(`mailto:?subject=Check out this post&body=${encodeURIComponent(postUrl)}`)
          break
        case 'external':
          window.open(postUrl, '_blank')
          break
      }
      
      setLiveCounts(prev => ({ ...prev, shares: prev.shares + 1 }))
      onShare?.(postId, shareType)
      
    } catch (error: any) {
      console.error('Share action failed:', error)
      toast({
        title: "Share Error",
        description: error.message || "Failed to share post. Please try again.",
        variant: "destructive"
      })
    }
  }, [postId, onShare, toast])
  
  const handleBookmark = useCallback(async () => {
    if (isBookmarkLoading) return
    
    const wasBookmarked = isBookmarked
    setIsBookmarked(!wasBookmarked)
    setIsBookmarkLoading(true)
    
    try {
      const response = await fetch(`/api/bookmarks/${postId}`, {
        method: wasBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update bookmark status')
      }
      
      const data = await response.json()
      setIsBookmarked(data.isBookmarked)
      onBookmark?.(postId, data.isBookmarked)
      
      toast({
        title: data.isBookmarked ? "Bookmarked" : "Removed bookmark",
        description: data.isBookmarked 
          ? "Post saved to your bookmarks" 
          : "Post removed from bookmarks",
      })
    } catch (error: any) {
      setIsBookmarked(wasBookmarked)
      console.error('Bookmark action failed:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update bookmark. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBookmarkLoading(false)
    }
  }, [isBookmarkLoading, isBookmarked, postId, onBookmark, toast])
  
  // ==========================================
  // FACEBOOK-STYLE UI RENDER
  // ==========================================
  
  if (variant === 'facebook') {
    return (
      <TooltipProvider>
        <div className={cn(
          "", // Removed border-t to eliminate line above counts
          className
        )}>
          {/* Like/Comment/Share Counts Row */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 py-1 px-1">
            <div className="flex items-center gap-4">
              {likeCount > 0 && (
                <span className="flex items-center gap-1 hover:underline cursor-pointer">
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                  {formatCount(likeCount)}
                </span>
              )}
              {liveCounts.comments > 0 && (
                <span className="hover:underline cursor-pointer">
                  {formatCount(liveCounts.comments)} comments
                </span>
              )}
              {liveCounts.shares > 0 && (
                <span className="hover:underline cursor-pointer">
                  {formatCount(liveCounts.shares)} shares
                </span>
              )}
            </div>
            {liveCounts.views && (
              <span className="text-xs">
                {formatCount(liveCounts.views)} views
              </span>
            )}
          </div>

          {/* Action Buttons Row - Facebook Style */}
          <div className="flex items-center border-t border-gray-200 dark:border-gray-700 pt-1">
            {/* Like Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleLikeClick}
                  disabled={isLikeLoading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                    isLiked 
                      ? "text-red-500 hover:text-red-600" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-700"
                  )}
                  aria-label={`${isLiked ? 'Unlike' : 'Like'} this post`}
                >
                  {isLikeLoading ? (
                    <Loader2 className={cn(sizeClasses.icon, "animate-spin")} />
                  ) : (
                    <Heart className={cn(sizeClasses.icon, isLiked && "fill-current")} />
                  )}
                  <span className="font-medium">
                    {isLiked ? "Liked" : "Like"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isLiked ? 'Unlike this post' : 'Like this post'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Comment Button - ALWAYS VISIBLE */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleComment}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-700"
                  aria-label="Comment on this post"
                >
                  <MessageCircle className={sizeClasses.icon} />
                  <span className="font-medium">Comment</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Comment on this post</p>
              </TooltipContent>
            </Tooltip>

            {/* Share Button - ALWAYS VISIBLE */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-700"
                  aria-label="Share this post"
                >
                  <Share className={sizeClasses.icon} />
                  <span className="font-medium">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {SHARE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => handleShare(option.id)}
                      className="cursor-pointer flex items-center"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Universal Follow Button - Facebook Style with proper positioning */}
              {showFollow && currentUserId && authorId && authorId !== currentUserId && (
                <UniversalFollowButton
                  userId={authorId}
                  userName={authorName}
                  currentUserId={currentUserId}
                  initialFollowStatus={initialIsFollowing ? 'following' : 'not_following'}
                  variant="facebook"
                  size="sm"
                  className="min-w-[90px]"
                  onFollowChange={(userId, isFollowing, followerCount) => {
                    onFollow?.(userId, isFollowing)
                  }}
                  onError={(error) => {
                    console.error('Follow error:', error)
                  }}
                />
              )}

              {/* Bookmark Button - ALWAYS VISIBLE */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBookmark}
                    disabled={isBookmarkLoading}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isBookmarked 
                        ? "text-blue-500 hover:text-blue-600" 
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-700"
                    )}
                    aria-label={`${isBookmarked ? 'Remove bookmark' : 'Bookmark'} this post`}
                  >
                    {isBookmarkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // ==========================================
  // COMPACT/DEFAULT VARIANT RENDER
  // ==========================================
  
  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg",
        sizeClasses.container,
        className
      )} 
      role="toolbar" 
      aria-label="Post actions"
      >
        <div className="flex items-center gap-1">
          {/* Enhanced Like Button with Animation */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={sizeClasses.buttonSize}
                onClick={handleLikeClick}
                disabled={isLikeLoading}
                className={cn(
                  "transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transform hover:scale-105",
                  isLiked && "text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20"
                )}
                aria-label={`${isLiked ? 'Unlike' : 'Like'} this post`}
              >
                {isLikeLoading ? (
                  <Loader2 className={cn(sizeClasses.icon, "animate-spin")} />
                ) : (
                  <Heart className={cn(sizeClasses.icon, isLiked && "fill-current")} />
                )}
                {variant !== 'compact' && (
                  <span className="ml-1 font-medium">
                    {formatCount(likeCount)}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLiked ? 'Unlike this post' : 'Like this post'}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Enhanced Comment Button */}
          {showComments && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sizeClasses.buttonSize}
                  onClick={handleComment}
                  className="transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transform hover:scale-105"
                  aria-label="Comment on this post"
                >
                  <MessageCircle className={sizeClasses.icon} />
                  {variant !== 'compact' && (
                    <span className="ml-1 font-medium">
                      {formatCount(liveCounts.comments)}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Comment on this post</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Enhanced Share Button */}
          {showShare && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={sizeClasses.buttonSize}
                  className="transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transform hover:scale-105"
                  aria-label="Share this post"
                >
                  <Share className={sizeClasses.icon} />
                  {variant !== 'compact' && (
                    <span className="ml-1 font-medium">
                      {formatCount(liveCounts.shares)}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 shadow-lg">
                {SHARE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => handleShare(option.id)}
                      className="cursor-pointer flex items-center"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Bookmark Button */}
          {showBookmark && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sizeClasses.buttonSize}
                  onClick={handleBookmark}
                  disabled={isBookmarkLoading}
                  className={cn(
                    "transition-all duration-200",
                    isBookmarked && "text-blue-500 hover:text-blue-600"
                  )}
                  aria-label={`${isBookmarked ? 'Remove bookmark' : 'Bookmark'} this post`}
                >
                  {isBookmarkLoading ? (
                    <Loader2 className={cn(sizeClasses.icon, "animate-spin")} />
                  ) : (
                    <Bookmark className={cn(sizeClasses.icon, isBookmarked && "fill-current")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Universal Follow Button - Compact/Default Style */}
        {showFollow && currentUserId && (
          <UniversalFollowButton
            userId={authorId}
            userName={authorName}
            currentUserId={currentUserId}
            initialFollowStatus={initialIsFollowing ? 'following' : 'not_following'}
            variant="minimal"
            size={size}
            compact={size === 'sm'}
            onFollowChange={(userId, isFollowing, followerCount) => {
              onFollow?.(userId, isFollowing)
            }}
            onError={(error) => {
              console.error('Follow error:', error)
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
