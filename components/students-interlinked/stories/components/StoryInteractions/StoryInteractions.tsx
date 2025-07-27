/**
 * ==========================================
 * STORY INTERACTIONS - PRODUCTION COMPONENT
 * ==========================================
 * 
 * Handles all story interaction features including likes, replies,
 * shares, and other social actions. Production-ready with real-time
 * updates, accessibility support, and comprehensive error handling.
 * 
 * Features:
 * ✅ Universal like system integration
 * ✅ Story reply functionality
 * ✅ Share story capabilities
 * ✅ Real-time interaction updates
 * ✅ Accessibility compliance (WCAG 2.1 AA)
 * ✅ Production-ready error handling
 * ✅ Mobile-responsive design
 * ✅ Animation and feedback effects
 * ✅ TypeScript strict mode support
 */

'use client'

import React, { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Eye,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Story, StorySessionUser } from '../shared/types'
import { generateAriaLabel, createLogger } from '../shared/utils'
import { ANIMATIONS, ERROR_MESSAGES } from '../shared/constants'

/**
 * Props interface for StoryInteractions component
 */
interface StoryInteractionsProps {
  /** Story object containing all story data */
  story: Story
  /** Current authenticated user */
  user: StorySessionUser | null
  /** Whether story interactions are currently loading */
  isLoading?: boolean
  /** Callback when user wants to reply to story */
  onReplyClick: () => void
  /** Callback when user wants to share story */
  onShareClick: () => void
  /** Callback for additional menu actions */
  onMenuAction?: (action: string) => void
  /** Like system integration props */
  likeSystem: {
    isLiked: boolean
    likeCount: number
    toggleLike: () => void
    isLoading: boolean
  }
  /** Additional CSS classes */
  className?: string
  /** Layout variant for different contexts */
  variant?: 'viewer' | 'preview' | 'compact'
}

/**
 * StoryInteractions Component
 * Provides all social interaction features for stories
 * PRODUCTION FIX: Optimized to prevent infinite re-renders
 */
export const StoryInteractions: React.FC<StoryInteractionsProps> = memo(({
  story,
  user,
  isLoading = false,
  onReplyClick,
  onShareClick,
  onMenuAction,
  likeSystem,
  className = '',
  variant = 'viewer'
}) => {
  const { toast } = useToast()
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)

  // PRODUCTION FIX: Create stable logger instance to prevent infinite re-renders
  const logger = React.useMemo(() => createLogger('StoryInteractions'), [])

  // Check if user can reply to this story
  const canReply = story.allowReplies && story.authorId !== user?.id && user?.id

  // Check if user can interact with this story
  const canInteract = user?.id && !isLoading

  /**
   * Handles like button click with animation and feedback
   */
  const handleLikeClick = useCallback(async () => {
    if (!canInteract || likeSystem.isLoading) return

    try {
      setIsActionLoading('like')
      
      logger.info('Like toggle initiated', {
        storyId: story.id,
        currentlyLiked: likeSystem.isLiked,
        userId: user?.id
      })

      await likeSystem.toggleLike()

      // Show feedback toast
      const message = likeSystem.isLiked ? 'Story unliked' : 'Story liked! ❤️'
      toast({
        title: message,
      })

    } catch (error) {
      logger.error('Like toggle failed', error)
      
      toast({
        title: "Action Failed",
        description: "Unable to update like. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsActionLoading(null)
    }
  }, [canInteract, likeSystem, story.id, user?.id, toast])

  /**
   * Handles reply button click with validation
   */
  const handleReplyClick = useCallback(() => {
    if (!canInteract) return

    if (!canReply) {
      if (story.authorId === user?.id) {
        toast({
          title: "Cannot Reply",
          description: "You cannot reply to your own story.",
          variant: "destructive"
        })
      } else if (!story.allowReplies) {
        toast({
          title: "Replies Disabled",
          description: "The author has disabled replies for this story.",
          variant: "destructive"
        })
      }
      return
    }

    logger.info('Reply initiated', {
      storyId: story.id,
      authorId: story.authorId,
      userId: user?.id
    })

    onReplyClick()
  }, [canInteract, canReply, story, user?.id, onReplyClick, toast])

  /**
   * Handles share button click
   */
  const handleShareClick = useCallback(async () => {
    if (!canInteract) return

    try {
      setIsActionLoading('share')
      
      logger.info('Share initiated', {
        storyId: story.id,
        authorId: story.authorId,
        userId: user?.id
      })

      onShareClick()

    } catch (error) {
      logger.error('Share action failed', error)
      
      toast({
        title: "Share Failed",
        description: "Unable to share story. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsActionLoading(null)
    }
  }, [canInteract, story, user?.id, onShareClick, toast])

  /**
   * Handles dropdown menu actions
   */
  const handleMenuAction = useCallback((action: string) => {
    if (!canInteract) return

    logger.info('Menu action triggered', {
      action,
      storyId: story.id,
      userId: user?.id
    })

    onMenuAction?.(action)
  }, [canInteract, story.id, user?.id, onMenuAction])

  // Get interaction styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'flex items-center space-x-2',
          button: 'w-8 h-8 p-0',
          iconSize: 'w-4 h-4'
        }
      case 'preview':
        return {
          container: 'flex items-center space-x-3',
          button: 'w-9 h-9 p-0',
          iconSize: 'w-4 h-4'
        }
      default: // viewer
        return {
          container: 'flex items-center space-x-2',
          button: 'w-10 h-10 p-0',
          iconSize: 'w-5 h-5'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Story Stats (for compact variant) */}
      {variant === 'compact' && (
        <div className="flex items-center space-x-3 flex-1">
          {story._count?.views && story._count.views > 0 && (
            <div className="flex items-center space-x-1 text-white/80">
              <Eye className="w-4 h-4" />
              <span className="text-xs">{story._count.views}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Stats (for viewer variant) */}
      {variant === 'viewer' && (
        <div className="flex items-center space-x-4 flex-1">
          {story._count?.views && story._count.views > 0 && (
            <div className="flex items-center space-x-1 bg-black/30 rounded-full px-2 py-1 backdrop-blur-sm">
              <Eye className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white">{story._count.views}</span>
            </div>
          )}
        </div>
      )}

      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full ${styles.button} backdrop-blur-sm transition-all duration-${ANIMATIONS.HOVER_SCALE} ${
          likeSystem.isLiked 
            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 scale-110' 
            : variant === 'viewer' 
              ? 'bg-black/30 text-white hover:bg-white/20'
              : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
        }`}
        onClick={handleLikeClick}
        disabled={!canInteract || likeSystem.isLoading || isActionLoading === 'like'}
        aria-label={generateAriaLabel(likeSystem.isLiked ? 'unlike' : 'like', story)}
      >
        {isActionLoading === 'like' ? (
          <Loader2 className={`${styles.iconSize} animate-spin`} />
        ) : (
          <Heart className={`${styles.iconSize} transition-all duration-${ANIMATIONS.HOVER_SCALE} ${
            likeSystem.isLiked ? 'fill-current scale-110' : ''
          }`} />
        )}
      </Button>

      {/* Like Count */}
      {likeSystem.likeCount > 0 && variant !== 'compact' && (
        <Badge 
          variant="secondary" 
          className={`${variant === 'viewer' ? 'bg-black/30 text-white border-white/20' : ''}`}
        >
          {likeSystem.likeCount}
        </Badge>
      )}

      {/* Reply Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full ${styles.button} backdrop-blur-sm transition-all duration-${ANIMATIONS.HOVER_SCALE} ${
          variant === 'viewer' 
            ? 'bg-black/30 text-white hover:bg-white/20'
            : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'
        } ${!canReply ? 'opacity-50' : ''}`}
        onClick={handleReplyClick}
        disabled={!canInteract || !canReply}
        aria-label={generateAriaLabel('reply', story)}
      >
        <MessageCircle className={styles.iconSize} />
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full ${styles.button} backdrop-blur-sm transition-all duration-${ANIMATIONS.HOVER_SCALE} ${
          variant === 'viewer' 
            ? 'bg-black/30 text-white hover:bg-white/20'
            : 'text-gray-600 hover:text-green-500 hover:bg-green-50'
        }`}
        onClick={handleShareClick}
        disabled={!canInteract || isActionLoading === 'share'}
        aria-label={generateAriaLabel('share', story)}
      >
        {isActionLoading === 'share' ? (
          <Loader2 className={`${styles.iconSize} animate-spin`} />
        ) : (
          <Share2 className={styles.iconSize} />
        )}
      </Button>

      {/* More Actions Menu */}
      {onMenuAction && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full ${styles.button} backdrop-blur-sm transition-all duration-${ANIMATIONS.HOVER_SCALE} ${
                variant === 'viewer' 
                  ? 'bg-black/30 text-white hover:bg-white/20'
                  : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
              }`}
              disabled={!canInteract}
              aria-label="More story options"
            >
              <MoreHorizontal className={styles.iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {story.authorId === user?.id ? (
              <>
                <DropdownMenuItem onClick={() => handleMenuAction('delete')}>
                  Delete Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('edit')}>
                  Edit Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('stats')}>
                  View Statistics
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => handleMenuAction('report')}>
                  Report Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('block')}>
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('copy-link')}>
                  Copy Link
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Compact Like Count */}
      {likeSystem.likeCount > 0 && variant === 'compact' && (
        <span className="text-xs text-white/80 ml-1">
          {likeSystem.likeCount}
        </span>
      )}
    </div>
  )
})

StoryInteractions.displayName = 'StoryInteractions'

export default StoryInteractions
