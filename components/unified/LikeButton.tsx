/**
 * =============================================================================
 * UNIFIED LIKE BUTTON - PRODUCTION-READY COMPONENT
 * =============================================================================
 * 
 * PURPOSE:
 * Single, consolidated like button component that works across all content types.
 * Replaces multiple inconsistent like button implementations.
 * 
 * FEATURES:
 * ✅ Support for simple likes and Facebook-style reactions
 * ✅ Real-time updates and animations
 * ✅ Optimistic UI updates with error rollback
 * ✅ Accessibility support (ARIA labels, keyboard navigation)
 * ✅ Multiple sizes and variants
 * ✅ Loading states and error handling
 * ✅ Mobile-responsive design
 * ✅ Production-ready performance
 * 
 * MODES:
 * - 'simple': Single heart/like button (❤️ 42)
 * - 'reactions': Facebook-style picker (👍❤️😂😮😢😡)
 * - 'auto': Automatically choose based on content context
 * 
 * USAGE:
 * ```tsx
 * // Simple like button
 * <LikeButton
 *   contentType="post"
 *   contentId="post-123"
 *   mode="simple"
 *   initialState={{ isLiked: false, count: 42 }}
 * />
 * 
 * // Facebook-style reactions
 * <LikeButton
 *   contentType="comment"
 *   contentId="comment-456"
 *   mode="reactions"
 *   initialState={{ isLiked: true, count: 8, userReaction: 'love' }}
 * />
 * ```
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-06
 * LAST UPDATED: 2025-01-06
 * =============================================================================
 */

'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ThumbsUp, Loader2, Smile, Frown, AlertCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  useUnifiedLikes, 
  formatLikeCount, 
  determineReactionMode,
  REACTION_EMOJIS,
  type ContentType, 
  type LikeMode, 
  type ReactionType, 
  type LikeState 
} from '@/hooks/useUnifiedLikes'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface LikeButtonProps {
  /** Type of content being liked */
  contentType: ContentType
  /** Unique identifier for the content */
  contentId: string
  /** Like interaction mode */
  mode?: LikeMode
  /** Initial like state */
  initialState: LikeState
  /** ID of content owner (for profile likes) */
  recipientId?: string
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Button visual variant */
  variant?: 'default' | 'minimal' | 'detailed'
  /** Show like count */
  showCount?: boolean
  /** Disable interactions */
  disabled?: boolean
  /** Custom CSS class */
  className?: string
  /** Callback when like state changes */
  onLikeChange?: (state: LikeState) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

// ==========================================
// REACTION CONFIGURATION
// ==========================================

const REACTION_CONFIG = [
  { 
    type: 'like' as ReactionType, 
    icon: ThumbsUp, 
    emoji: '👍', 
    label: 'Like',
    color: 'text-blue-600' 
  },
  { 
    type: 'love' as ReactionType, 
    icon: Heart, 
    emoji: '❤️', 
    label: 'Love',
    color: 'text-red-600' 
  },
  { 
    type: 'laugh' as ReactionType, 
    icon: Smile, 
    emoji: '😂', 
    label: 'Haha',
    color: 'text-yellow-600' 
  },
  { 
    type: 'wow' as ReactionType, 
    icon: AlertCircle, 
    emoji: '😮', 
    label: 'Wow',
    color: 'text-orange-600' 
  },
  { 
    type: 'sad' as ReactionType, 
    icon: Frown, 
    emoji: '😢', 
    label: 'Sad',
    color: 'text-gray-600' 
  },
  { 
    type: 'helpful' as ReactionType, 
    icon: Star, 
    emoji: '⭐', 
    label: 'Helpful',
    color: 'text-green-600' 
  }
]

// ==========================================
// SIZE CONFIGURATIONS
// ==========================================

const SIZE_CONFIG = {
  sm: {
    button: 'h-8 px-2 text-sm',
    icon: 'h-3 w-3',
    text: 'text-xs',
    reactionIcon: 'h-4 w-4'
  },
  md: {
    button: 'h-9 px-3 text-sm',
    icon: 'h-4 w-4',
    text: 'text-sm',
    reactionIcon: 'h-5 w-5'
  },
  lg: {
    button: 'h-10 px-4 text-base',
    icon: 'h-5 w-5',
    text: 'text-base',
    reactionIcon: 'h-6 w-6'
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function LikeButton({
  contentType,
  contentId,
  mode: propMode = 'auto',
  initialState,
  recipientId,
  size = 'md',
  variant = 'default',
  showCount = true,
  disabled = false,
  className,
  onLikeChange,
  onError
}: LikeButtonProps) {
  
  // ==========================================
  // STATE AND REFS
  // ==========================================
  
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  
  // Determine effective mode
  const effectiveMode = propMode === 'auto' 
    ? determineReactionMode(contentType)
    : propMode
  
  // ==========================================
  // LIKE FUNCTIONALITY
  // ==========================================
  
  const {
    isLiked,
    likeCount,
    userReaction,
    reactionCounts,
    isLoading,
    error,
    toggleLike,
    setReaction,
    removeReaction
  } = useUnifiedLikes({
    contentType,
    contentId,
    initialState,
    mode: effectiveMode,
    recipientId,
    onLikeChange,
    onError
  })
  
  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleMouseEnter = useCallback(() => {
    if (effectiveMode !== 'reactions' || disabled) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowReactionPicker(true)
  }, [effectiveMode, disabled])
  
  const handleMouseLeave = useCallback(() => {
    if (effectiveMode !== 'reactions') return
    
    timeoutRef.current = setTimeout(() => {
      setShowReactionPicker(false)
      setHoveredReaction(null)
    }, 300)
  }, [effectiveMode])
  
  const handleReactionClick = useCallback(async (reaction: ReactionType) => {
    if (disabled || isLoading) return
    
    if (userReaction === reaction) {
      await removeReaction()
    } else {
      await setReaction(reaction)
    }
    
    setShowReactionPicker(false)
  }, [disabled, isLoading, userReaction, setReaction, removeReaction])
  
  const handleMainButtonClick = useCallback(async () => {
    if (disabled || isLoading) return
    
    if (effectiveMode === 'simple') {
      await toggleLike()
    } else {
      // For reactions mode, toggle like or show picker
      if (userReaction) {
        await removeReaction()
      } else {
        setShowReactionPicker(!showReactionPicker)
      }
    }
  }, [disabled, isLoading, effectiveMode, userReaction, toggleLike, removeReaction, showReactionPicker])
  
  // ==========================================
  // RENDER HELPERS
  // ==========================================
  
  const getCurrentReactionConfig = () => {
    if (!userReaction) return null
    return REACTION_CONFIG.find(r => r.type === userReaction)
  }
  
  const sizeConfig = SIZE_CONFIG[size]
  const currentReaction = getCurrentReactionConfig()
  
  // ==========================================
  // SIMPLE MODE RENDER
  // ==========================================
  
  if (effectiveMode === 'simple') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isLiked ? "default" : "ghost"}
              size="sm"
              disabled={disabled || isLoading}
              onClick={handleMainButtonClick}
              className={cn(
                "flex items-center space-x-2 transition-all duration-200",
                sizeConfig.button,
                isLiked && "text-red-500 bg-red-50 hover:bg-red-100 border-red-200",
                variant === 'minimal' && "border-none shadow-none bg-transparent hover:bg-gray-100",
                className
              )}
              aria-label={`${isLiked ? 'Unlike' : 'Like'} this ${contentType}`}
            >
              <motion.div
                animate={{ 
                  scale: isLiked ? [1, 1.2, 1] : 1,
                  rotate: isLiked ? [0, -10, 10, 0] : 0
                }}
                transition={{ duration: 0.3 }}
              >
                <Heart 
                  className={cn(
                    sizeConfig.icon,
                    isLiked && "fill-current"
                  )} 
                />
              </motion.div>
              
              {showCount && likeCount > 0 && (
                <motion.span 
                  className={cn("font-medium", sizeConfig.text)}
                  animate={{ scale: isLiked ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatLikeCount(likeCount)}
                </motion.span>
              )}
              
              {isLoading && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isLiked ? 'Unlike' : 'Like'} this {contentType}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // ==========================================
  // REACTIONS MODE RENDER
  // ==========================================
  
  return (
    <div 
      ref={pickerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Reaction Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={userReaction ? "secondary" : "ghost"}
              size="sm"
              disabled={disabled || isLoading}
              onClick={handleMainButtonClick}
              className={cn(
                "flex items-center space-x-2 transition-all duration-200",
                sizeConfig.button,
                currentReaction && currentReaction.color,
                currentReaction && "bg-gray-50 hover:bg-gray-100",
                variant === 'minimal' && "border-none shadow-none bg-transparent hover:bg-gray-100"
              )}
              aria-label={`React to this ${contentType}`}
            >
              {currentReaction ? (
                <>
                  <span className="text-lg" role="img" aria-label={currentReaction.label}>
                    {currentReaction.emoji}
                  </span>
                  <span className={cn("font-medium", sizeConfig.text)}>
                    {currentReaction.label}
                  </span>
                </>
              ) : (
                <>
                  <ThumbsUp className={sizeConfig.icon} />
                  <span className={cn("font-medium", sizeConfig.text)}>
                    Like
                  </span>
                </>
              )}
              
              {showCount && likeCount > 0 && (
                <span className={cn("font-medium text-gray-500", sizeConfig.text)}>
                  {formatLikeCount(likeCount)}
                </span>
              )}
              
              {isLoading && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to like or hover to see more reactions</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Reaction Picker */}
      <AnimatePresence>
        {showReactionPicker && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex space-x-1">
              {REACTION_CONFIG.map((reaction) => (
                <motion.button
                  key={reaction.type}
                  className={cn(
                    "relative p-2 rounded-full transition-all duration-150",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "hover:scale-125 active:scale-110",
                    userReaction === reaction.type && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                  onClick={() => handleReactionClick(reaction.type)}
                  onMouseEnter={() => setHoveredReaction(reaction.type)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`React with ${reaction.label}`}
                >
                  <span className="text-lg" role="img" aria-label={reaction.label}>
                    {reaction.emoji}
                  </span>
                  
                  {/* Reaction Label Tooltip */}
                  <AnimatePresence>
                    {hoveredReaction === reaction.type && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                      >
                        {reaction.label}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
            
            {/* Picker Arrow */}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error Display */}
      {error && variant === 'detailed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}

// ==========================================
// EXPORT VARIANTS
// ==========================================

/**
 * Simple like button for basic interactions
 */
export function SimpleLikeButton(props: Omit<LikeButtonProps, 'mode'>) {
  return <LikeButton {...props} mode="simple" />
}

/**
 * Reaction button for Facebook-style interactions
 */
export function ReactionButton(props: Omit<LikeButtonProps, 'mode'>) {
  return <LikeButton {...props} mode="reactions" />
}

/**
 * Minimal like button without borders or background
 */
export function MinimalLikeButton(props: LikeButtonProps) {
  return <LikeButton {...props} variant="minimal" />
}

// ==========================================
// LIKE COUNTER COMPONENT
// ==========================================

interface LikeCounterProps {
  count: number
  isLiked?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Read-only like counter display
 */
export function LikeCounter({ 
  count, 
  isLiked = false, 
  onClick, 
  size = 'md',
  className 
}: LikeCounterProps) {
  const sizeConfig = SIZE_CONFIG[size]
  
  if (count === 0) return null
  
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center space-x-1 transition-colors",
        onClick && "hover:text-red-600 cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
      aria-label={`${count} likes`}
    >
      <Heart 
        className={cn(
          sizeConfig.icon,
          isLiked ? "fill-red-500 text-red-500" : "text-gray-500"
        )} 
      />
      <span className={cn("font-medium text-gray-600", sizeConfig.text)}>
        {formatLikeCount(count)}
      </span>
    </button>
  )
}
