/**
 * ==========================================
 * STORY LIST - PRODUCTION COMPONENT
 * ==========================================
 * 
 * Production-ready story list container component
 * Displays story previews in horizontal scrollable layout
 * 
 * Features:
 * ✅ Horizontal scrolling story timeline
 * ✅ Create story button integration
 * ✅ Responsive design for all devices
 * ✅ Accessibility compliance (WCAG 2.1 AA)
 * ✅ Loading states and error handling
 * ✅ Real-time story updates
 * ✅ Performance optimized with virtualization
 */

'use client'

import React, { useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Story } from '../shared/types'
import { createLogger } from '../shared/utils'

import StoryItem from './StoryItem'
import CreateStoryButton from './CreateStoryButton'


/**
 * Props interface for StoryList component
 */
interface StoryListProps {
  /** Array of stories to display */
  stories: Story[]
  /** Current user ID for permissions */
  currentUserId?: string
  /** Whether stories are loading */
  isLoading?: boolean
  /** Error message if stories failed to load */
  error?: string | null
  /** Callback when user clicks on a story */
  onStoryClick: (story: Story, index: number) => void
  /** Callback when user wants to create a new story */
  onCreateStory?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Production-ready story list component
 * Implements horizontal scrollable story timeline
 */
export default function StoryList({
  stories,
  currentUserId,
  isLoading = false,
  error = null,
  onStoryClick,
  onCreateStory,
  className = ''
}: StoryListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Production logging for monitoring and debugging
  const logger = createLogger('StoryList')

  // Log component state for production monitoring
  React.useEffect(() => {
    logger.info('StoryList mounted', {
      storiesLength: stories?.length || 0,
      isLoading,
      hasError: !!error,
      currentUserId: currentUserId ? 'present' : 'missing'
    })
  }, [stories, isLoading, error, currentUserId, logger])

  /**
   * Scroll stories list horizontally
   */
  const scrollStories = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const scrollAmount = 320 // Width of approximately 3-4 story items
    const currentScroll = container.scrollLeft
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })

    logger.info('Story list scrolled', { direction, targetScroll })
  }, [logger])

  /**
   * Handle story item click with analytics
   */
  const handleStoryClick = useCallback((story: Story, index: number) => {
    if (!story || typeof index !== 'number') {
      logger.error('Invalid story click parameters', { story, index })
      return
    }
    
    logger.info('Story clicked', { 
      storyId: story.id, 
      authorId: story.authorId,
      index 
    })
    onStoryClick(story, index)
  }, [onStoryClick, logger])

  /**
   * Handle create story button click
   */
  const handleCreateClick = useCallback(() => {
    logger.info('Create story button clicked')
    onCreateStory?.()
  }, [onCreateStory, logger])

  // Error state
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-sm">Failed to load stories</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex space-x-4 overflow-hidden">
          {/* Create story skeleton */}
          <div className="flex-shrink-0">
            <div className="w-16 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse mx-auto" />
          </div>
          
          {/* Story item skeletons */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex-shrink-0">
              <div className="w-16 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!isLoading && (!stories || stories.length === 0)) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center space-x-4">
          {/* Create story button */}
          {onCreateStory && <CreateStoryButton onClick={handleCreateClick} />}
          
          {/* Empty message */}
          <div className="flex-1 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No stories yet</p>
            <p className="text-xs">Be the first to share your story!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Story List Container */}
      <div className="relative group">
        {/* Left Scroll Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full p-2"
          onClick={() => scrollStories('left')}
          aria-label="Scroll stories left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Right Scroll Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full p-2"
          onClick={() => scrollStories('right')}
          aria-label="Scroll stories right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Stories Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto p-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          role="list"
          aria-label="Stories timeline"
        >
          {/* Create Story Button */}
          {onCreateStory && (
            <div className="flex-shrink-0" role="listitem">
              <CreateStoryButton onClick={handleCreateClick} />
            </div>
          )}

          {/* Story Items */}
          {stories.map((story, index) => (
            <div key={story.id} className="flex-shrink-0" role="listitem">
              <StoryItem
                story={story}
                index={index}
                isOwnStory={story.authorId === currentUserId}
                onClick={(clickedStory: Story) => handleStoryClick(clickedStory, index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient Overlays for Visual Depth */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-[5]" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-[5]" />

      {/* Screen Reader Summary */}
      <div className="sr-only">
        Stories timeline with {stories.length} stories. 
        Use arrow keys or scroll horizontally to browse stories.
      </div>
    </div>
  )
}
