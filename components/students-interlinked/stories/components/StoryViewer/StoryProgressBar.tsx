/**
 * ==========================================
 * STORY PROGRESS BAR - PRODUCTION COMPONENT
 * ==========================================
 * 
 * Displays story viewing progress with smooth animations and
 * multi-story support. Production-ready with accessibility
 * features and responsive design.
 * 
 * Features:
 * ✅ Smooth progress animations
 * ✅ Multi-story progress indicators
 * ✅ Accessibility support with ARIA attributes
 * ✅ Mobile-responsive design
 * ✅ Production-ready performance optimization
 * ✅ Real-time progress updates
 * ✅ TypeScript strict mode support
 */

'use client'

import React, { memo } from 'react'
import { STORY_TIMING, ANIMATIONS } from '../shared/constants'

/**
 * Props interface for StoryProgressBar component
 */
interface StoryProgressBarProps {
  /** Total number of stories */
  totalStories: number
  /** Current story index (0-based) */
  currentStoryIndex: number
  /** Progress percentage for current story (0-100) */
  currentProgress: number
  /** Whether stories are currently playing */
  isPlaying: boolean
  /** Additional CSS classes */
  className?: string
  /** Whether to show progress bars (hidden for single stories) */
  showProgress?: boolean
}

/**
 * Individual progress bar for a single story
 */
interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number
  /** Whether this is the active story */
  isActive: boolean
  /** Whether stories are playing */
  isPlaying: boolean
  /** Accessibility label */
  ariaLabel?: string
}

/**
 * Single progress bar component with smooth animations
 */
const ProgressBar: React.FC<ProgressBarProps> = memo(({
  progress,
  isActive,
  isPlaying,
  ariaLabel
}) => (
  <div 
    className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={ariaLabel}
  >
    <div 
      className={`h-full transition-all ease-linear ${
        isActive && isPlaying 
          ? 'bg-white' 
          : progress > 0 
            ? 'bg-white' 
            : 'bg-white/30'
      }`}
      style={{
        width: `${Math.max(0, Math.min(100, progress))}%`,
        transitionDuration: isActive && isPlaying 
          ? `${STORY_TIMING.PROGRESS_UPDATE_INTERVAL}ms`
          : `${ANIMATIONS.PROGRESS_SMOOTH}ms`
      }}
    />
  </div>
))

ProgressBar.displayName = 'ProgressBar'

/**
 * StoryProgressBar Component
 * Displays progress for single or multiple stories
 */
export const StoryProgressBar: React.FC<StoryProgressBarProps> = memo(({
  totalStories,
  currentStoryIndex,
  currentProgress,
  isPlaying,
  className = '',
  showProgress = true
}) => {
  // Don't show progress bars for single stories unless explicitly requested
  if (!showProgress || totalStories <= 1) {
    return null
  }

  // Ensure valid indices
  const safeCurrentIndex = Math.max(0, Math.min(currentStoryIndex, totalStories - 1))
  const safeProgress = Math.max(0, Math.min(currentProgress, 100))

  return (
    <div 
      className={`flex space-x-1 ${className}`}
      role="group"
      aria-label={`Story progress: ${safeCurrentIndex + 1} of ${totalStories}`}
    >
      {Array.from({ length: totalStories }, (_, index) => {
        // Calculate progress for each story
        let storyProgress = 0
        
        if (index < safeCurrentIndex) {
          // Completed stories
          storyProgress = 100
        } else if (index === safeCurrentIndex) {
          // Current story
          storyProgress = safeProgress
        } else {
          // Future stories
          storyProgress = 0
        }

        const isActiveStory = index === safeCurrentIndex

        return (
          <ProgressBar
            key={index}
            progress={storyProgress}
            isActive={isActiveStory}
            isPlaying={isPlaying}
            ariaLabel={`Story ${index + 1} progress: ${Math.round(storyProgress)}%`}
          />
        )
      })}
    </div>
  )
})

StoryProgressBar.displayName = 'StoryProgressBar'

/**
 * Simplified progress bar for single stories
 */
export const SingleStoryProgress: React.FC<{
  progress: number
  isPlaying: boolean
  className?: string
}> = memo(({ progress, isPlaying, className = '' }) => (
  <div 
    className={`w-full h-1 bg-white/30 rounded-full overflow-hidden ${className}`}
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Story progress: ${Math.round(progress)}%`}
  >
    <div 
      className={`h-full transition-all ease-linear ${
        isPlaying ? 'bg-white' : 'bg-white/60'
      }`}
      style={{
        width: `${Math.max(0, Math.min(100, progress))}%`,
        transitionDuration: isPlaying 
          ? `${STORY_TIMING.PROGRESS_UPDATE_INTERVAL}ms`
          : `${ANIMATIONS.PROGRESS_SMOOTH}ms`
      }}
    />
  </div>
))

SingleStoryProgress.displayName = 'SingleStoryProgress'

export default StoryProgressBar
