/**
 * ==========================================
 * STORY VIEWER - PRODUCTION COMPONENT
 * ==========================================
 * 
 * Production-ready full-screen story viewer component
 * Orchestrates all story viewing functionality
 * 
 * Features:
 * ✅ Full-screen immersive story viewing
 * ✅ Automatic story progression with progress tracking
 * ✅ Video playback with controls
 * ✅ Real-time interaction system
 * ✅ Keyboard and touch navigation
 * ✅ Accessibility compliance (WCAG 2.1 AA)
 * ✅ Production-ready error handling
 * ✅ Performance optimized rendering
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, VisuallyHidden } from '@/components/ui/dialog'
import { useSession } from 'next-auth/react'

import { Story } from '../shared/types'
import { STORY_TIMING } from '../shared/constants'
import { createLogger, getStoryMediaType, isUserStoryOwner } from '../shared/utils'

import StoryProgressBar from './StoryProgressBar'
import StoryHeader from './StoryHeader'
import StoryControls from './StoryControls'
import StoryInteractions from '../StoryInteractions/StoryInteractions'

/**
 * Props interface for StoryViewer component
 */
interface StoryViewerProps {
  /** Whether the story viewer dialog is open */
  isOpen: boolean
  /** Array of stories to view */
  stories: Story[]
  /** Index of the currently selected story */
  currentStoryIndex: number
  /** Callback when story viewer is closed */
  onClose: () => void
  /** Callback when navigating to next story */
  onNextStory: () => void
  /** Callback when navigating to previous story */
  onPreviousStory: () => void
  /** Callback when jumping to specific story */
  onStorySelect: (index: number) => void
  /** Callback when toggling like on current story */
  onToggleLike?: () => void
  /** Callback when replying to current story */
  onReply?: () => void
  /** Like state from universal like hook */
  likeState?: {
    isLiked: boolean
    likeCount: number
    isLoading: boolean
  }
}

/**
 * Production-ready story viewer component
 * Implements comprehensive story viewing experience
 */
export default function StoryViewer({
  isOpen,
  stories,
  currentStoryIndex,
  onClose,
  onNextStory,
  onPreviousStory,
  onStorySelect,
  onToggleLike,
  onReply,
  likeState = { isLiked: false, likeCount: 0, isLoading: false }
}: StoryViewerProps) {
  const { data: session } = useSession()
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Story playback state
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState<number>(STORY_TIMING.DEFAULT_DURATION)
  const [startTime, setStartTime] = useState<number | null>(null)
  
  /**
   * PRODUCTION FIX: Optimized logger creation to prevent infinite re-renders
   * Using useMemo to ensure logger instance stability
   */
  const logger = React.useMemo(() => createLogger('StoryViewer'), [])

  // Get current story with error protection
  const currentStory = React.useMemo(() => {
    if (!stories || stories.length === 0) return null
    if (currentStoryIndex < 0 || currentStoryIndex >= stories.length) return null
    return stories[currentStoryIndex]
  }, [stories, currentStoryIndex])

  const storyMediaType = React.useMemo(() => 
    currentStory ? getStoryMediaType(currentStory) : 'text',
    [currentStory]
  )

  const isOwnStory = React.useMemo(() => 
    currentStory && session?.user?.id ? isUserStoryOwner(currentStory, session.user.id) : false,
    [currentStory, session?.user?.id]
  )

  /**
   * PRODUCTION FIX: Stabilized callback functions to prevent infinite re-renders
   * All callbacks now use useCallback with proper dependencies
   */
  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      logger.info('Auto-advancing to next story', { 
        from: currentStoryIndex, 
        to: currentStoryIndex + 1 
      })
      onNextStory()
    } else {
      logger.info('Reached end of stories')
      setIsPlaying(false)
    }
  }, [currentStoryIndex, stories.length, onNextStory, logger])

  /**
   * Initialize story playback when story changes
   * PRODUCTION FIX: Optimized dependencies to prevent infinite loops
   */
  useEffect(() => {
    if (!currentStory || !isOpen) return

    setProgress(0)
    setStartTime(Date.now())
    setIsPlaying(true)

    // Set duration based on story type
    if (storyMediaType === 'video' && videoRef.current) {
      const video = videoRef.current
      const handleLoadedMetadata = () => {
        const videoDuration = Math.min(video.duration * 1000, STORY_TIMING.VIDEO_AUTO_DURATION)
        setDuration(videoDuration)
        logger.info('Video story loaded', { 
          storyId: currentStory.id,
          duration: videoDuration 
        })
      }
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    } else {
      setDuration(STORY_TIMING.DEFAULT_DURATION)
      logger.info('Text/Image story loaded', { 
        storyId: currentStory.id,
        duration: STORY_TIMING.DEFAULT_DURATION 
      })
    }
  }, [currentStory?.id, isOpen, storyMediaType, logger]) // PRODUCTION FIX: Use only currentStory.id instead of full object

  /**
   * Progress tracking with automatic advancement
   * PRODUCTION FIX: Optimized to prevent infinite re-renders
   */
  useEffect(() => {
    if (!isOpen || !isPlaying || !startTime) return

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      
      setProgress(newProgress)

      // Auto-advance when story completes
      if (newProgress >= 100) {
        if (currentStoryIndex < stories.length - 1) {
          setTimeout(() => handleNextStory(), STORY_TIMING.AUTO_ADVANCE_DELAY)
        } else {
          logger.info('Reached end of stories')
          setIsPlaying(false)
        }
      }
    }, STORY_TIMING.PROGRESS_UPDATE_INTERVAL)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isOpen, isPlaying, startTime, duration, currentStoryIndex, stories.length, handleNextStory, logger]) // PRODUCTION FIX: Use handleNextStory callback

  /**
   * Video playback control
   */
  useEffect(() => {
    if (storyMediaType === 'video' && videoRef.current) {
      const video = videoRef.current
      
      if (isPlaying) {
        video.play().catch(error => {
          logger.error('Video play failed', { error })
          setIsPlaying(false)
        })
      } else {
        video.pause()
      }
    }
  }, [isPlaying, storyMediaType, logger])

  /**
   * Video mute control
   */
  useEffect(() => {
    if (storyMediaType === 'video' && videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted, storyMediaType])

  /**
   * Cleanup on component unmount
   */
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  /**
   * Toggle play/pause with state reset
   * PRODUCTION FIX: Stabilized with useCallback
   */
  const handleTogglePlay = useCallback(() => {
    const newIsPlaying = !isPlaying
    setIsPlaying(newIsPlaying)
    
    if (newIsPlaying && progress < 100) {
      // Resume from current position
      const remainingDuration = duration * ((100 - progress) / 100)
      setStartTime(Date.now() - (duration * (progress / 100)))
    }
    
    logger.info('Playback toggled', { 
      isPlaying: newIsPlaying, 
      progress,
      storyId: currentStory?.id 
    })
  }, [isPlaying, progress, duration, currentStory?.id, logger])

  /**
   * Toggle mute state
   * PRODUCTION FIX: Stabilized with useCallback
   */
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
    logger.info('Mute toggled', { isMuted: !isMuted })
  }, [isMuted, logger])

  /**
   * Handle story navigation with state reset
   * PRODUCTION FIX: Stabilized with useCallback
   */
  const handleStoryNavigation = useCallback((direction: 'next' | 'previous' | number) => {
    setProgress(0)
    setIsPlaying(true)
    
    if (typeof direction === 'number') {
      onStorySelect(direction)
    } else if (direction === 'next') {
      onNextStory()
    } else {
      onPreviousStory()
    }
  }, [onStorySelect, onNextStory, onPreviousStory])

  /**
   * Handle dialog close with cleanup
   * PRODUCTION FIX: Stabilized with useCallback
   */
  const handleClose = useCallback(() => {
    setIsPlaying(false)
    setProgress(0)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    logger.info('Story viewer closed')
    onClose()
  }, [onClose, logger])

  // PRODUCTION FIX: Early return with better error handling
  if (!isOpen) {
    return null
  }

  // PRODUCTION FIX: Comprehensive validation
  if (!stories || stories.length === 0) {
    logger.warn('No stories available in viewer')
    return null
  }

  if (!currentStory) {
    logger.warn('Current story not found', { currentStoryIndex, storiesLength: stories.length })
    return null
  }

  const canGoPrevious = currentStoryIndex > 0
  const canGoNext = currentStoryIndex < stories.length - 1

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-none w-full h-full p-0 bg-black border-none"
        aria-label={`Story viewer: ${currentStory.author.name}'s story`}
      >
        {/* PRODUCTION FIX: Required DialogTitle and DialogDescription for accessibility */}
        <VisuallyHidden>
          <DialogTitle>
            Story by {currentStory.author.name}
          </DialogTitle>
          <DialogDescription>
            Viewing story {currentStoryIndex + 1} of {stories.length}. 
            {currentStory.content ? ` Content: ${currentStory.content.substring(0, 100)}...` : ''}
          </DialogDescription>
        </VisuallyHidden>

        <div className="relative w-full h-full flex items-center justify-center">
          {/* Story Progress Bar */}
          <div className="absolute top-4 left-4 right-4 z-20">
            <StoryProgressBar
              totalStories={stories.length}
              currentStoryIndex={currentStoryIndex}
              currentProgress={progress}
              isPlaying={isPlaying}
            />
          </div>

          {/* Story Header */}
          <div className="absolute top-16 left-4 right-4 z-20">
            <StoryHeader
              story={currentStory}
              user={session?.user ? {
                id: session.user.id || '',
                name: session.user.name || '',
                email: session.user.email || '',
                image: session.user.image || undefined
              } : null}
            />
          </div>

          {/* Story Content */}
          <div className="w-full h-full flex items-center justify-center">
            {storyMediaType === 'video' && currentStory.mediaUrls?.[0] ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrls[0]}
                className="max-w-full max-h-full object-contain"
                muted={isMuted}
                loop={false}
                playsInline
                onEnded={() => {
                  setProgress(100)
                  setIsPlaying(false)
                }}
                onError={(e) => {
                  logger.error('Video playback error', { 
                    error: e,
                    storyId: currentStory.id 
                  })
                }}
                aria-label={`Video story by ${currentStory.author.name}`}
              />
            ) : storyMediaType === 'image' && currentStory.mediaUrls?.[0] ? (
              <img
                src={currentStory.mediaUrls[0]}
                alt={`Story by ${currentStory.author.name}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  logger.error('Image load error', { 
                    error: e,
                    storyId: currentStory.id 
                  })
                }}
              />
            ) : (
              // Text story
              <div 
                className="w-full h-full flex items-center justify-center p-8"
                style={{ 
                  backgroundColor: currentStory.backgroundColor || '#3b82f6' 
                }}
              >
                <p className="text-white text-2xl md:text-3xl font-medium text-center leading-relaxed max-w-lg">
                  {currentStory.content}
                </p>
              </div>
            )}
          </div>

          {/* Story Interactions */}
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <StoryInteractions
              story={currentStory}
              user={session?.user ? {
                id: session.user.id || '',
                name: session.user.name || '',
                email: session.user.email || ''
              } : null}
              onReplyClick={onReply || (() => {})}
              onShareClick={() => {}}
              likeSystem={{
                isLiked: likeState.isLiked,
                likeCount: likeState.likeCount,
                toggleLike: onToggleLike || (() => {}),
                isLoading: likeState.isLoading
              }}
            />
          </div>

          {/* Story Controls Overlay */}
          <StoryControls
            currentStory={currentStory}
            currentIndex={currentStoryIndex}
            totalStories={stories.length}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onPrevious={() => handleStoryNavigation('previous')}
            onNext={() => handleStoryNavigation('next')}
            onTogglePlay={handleTogglePlay}
            onToggleMute={handleToggleMute}
            onClose={handleClose}
          />
        </div>

        {/* Screen Reader Updates */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {`Viewing story ${currentStoryIndex + 1} of ${stories.length} by ${currentStory.author.name}. `}
          {isPlaying ? 'Playing' : 'Paused'}. 
          {Math.round(progress)}% complete.
        </div>
      </DialogContent>
    </Dialog>
  )
}
