/**
 * ==========================================
 * CREATE STORY BUTTON - PRODUCTION COMPONENT
 * ==========================================
 * 
 * Production-ready create story button component
 * Displays user's profile with add story indicator
 * 
 * Features:
 * ✅ User profile image with add indicator
 * ✅ Accessibility compliance (WCAG 2.1 AA)
 * ✅ Hover effects and animations
 * ✅ Touch-friendly design for mobile
 * ✅ Loading state for profile image
 * ✅ Fallback for missing profile images
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Plus, User } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { createLogger } from '../shared/utils'

/**
 * Props interface for CreateStoryButton component
 */
interface CreateStoryButtonProps {
  /** Callback when create button is clicked */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Production-ready create story button component
 * Displays user profile with create story prompt
 */
export default function CreateStoryButton({
  onClick,
  className = ''
}: CreateStoryButtonProps) {
  const { data: session } = useSession()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Production logging
  const logger = createLogger('CreateStoryButton')

  /**
   * Handle create story click
   */
  const handleClick = useCallback(() => {
    logger.info('Create story button clicked', {
      userId: session?.user?.id,
      userName: session?.user?.name
    })
    onClick?.()
  }, [onClick, session?.user?.id, session?.user?.name, logger])

  /**
   * Handle profile image load success
   */
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
  }, [])

  /**
   * Handle profile image load error
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(false)
    logger.warn('Profile image failed to load', {
      userId: session?.user?.id,
      imageUrl: session?.user?.image
    })
  }, [session?.user?.id, session?.user?.image, logger])

  /**
   * Handle keyboard interactions
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }, [handleClick])

  const user = session?.user
  const userImage = user?.image
  const userName = user?.name || 'User'

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Create Story Button */}
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative w-16 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50 group cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750"
        aria-label="Create a new story"
        title="Create your story"
        type="button"
      >
        {/* Background Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          {/* User Profile Image Section */}
          <div className="relative mb-2">
            {userImage && !imageError ? (
              <>
                <img
                  src={userImage}
                  alt={`${userName}'s profile`}
                  className={`
                    w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover transition-opacity duration-200
                    ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                  `}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                
                {/* Loading State */}
                {!imageLoaded && (
                  <div className="absolute inset-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              /* Fallback Profile Icon */
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-white dark:border-gray-800">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
            )}

            {/* Plus Icon Overlay */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 transition-colors duration-200 group-hover:bg-blue-600">
              <Plus className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Create Text */}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            Create
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-blue-50 dark:bg-blue-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </button>

      {/* User Name */}
      <div className="text-center">
        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[4rem]">
          Your story
        </p>
      </div>

      {/* Screen Reader Content */}
      <div className="sr-only">
        Create a new story. Click to open story creation dialog.
        {user && ` Signed in as ${userName}.`}
      </div>
    </div>
  )
}
