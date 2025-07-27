'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ThumbsUp, Laugh, Frown, AlertCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReactionType {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  emoji: string
}

const REACTIONS: ReactionType[] = [
  {
    id: 'like',
    label: 'Like',
    icon: <ThumbsUp className="w-4 h-4" />,
    color: 'text-blue-500',
    emoji: '👍'
  },
  {
    id: 'love',
    label: 'Love',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-red-500',
    emoji: '❤️'
  },
  {
    id: 'laugh',
    label: 'Laugh',
    icon: <Laugh className="w-4 h-4" />,
    color: 'text-yellow-500',
    emoji: '😂'
  },
  {
    id: 'wow',
    label: 'Wow',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-orange-500',
    emoji: '😮'
  },
  {
    id: 'sad',
    label: 'Sad',
    icon: <Frown className="w-4 h-4" />,
    color: 'text-gray-500',
    emoji: '😢'
  },
  {
    id: 'helpful',
    label: 'Helpful',
    icon: <Star className="w-4 h-4" />,
    color: 'text-green-500',
    emoji: '⭐'
  }
]

interface LiveReactionPickerProps {
  postId: string
  currentReaction?: string | null
  onReactionSelect: (reactionId: string) => void
  onReactionRemove: () => void
  disabled?: boolean
  className?: string
}

export default function LiveReactionPicker({
  postId,
  currentReaction,
  onReactionSelect,
  onReactionRemove,
  disabled = false,
  className
}: LiveReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 300)
  }

  const handleReactionClick = (reactionId: string) => {
    if (currentReaction === reactionId) {
      onReactionRemove()
    } else {
      onReactionSelect(reactionId)
    }
    setIsOpen(false)
  }

  const getCurrentReactionData = () => {
    return REACTIONS.find(r => r.id === currentReaction)
  }

  const currentReactionData = getCurrentReactionData()

  return (
    <div 
      ref={pickerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Reaction Button */}
      <Button
        variant={currentReaction ? "secondary" : "ghost"}
        size="sm"
        disabled={disabled}
        className={cn(
          "relative transition-all duration-200",
          currentReaction && "text-blue-600 bg-blue-50 hover:bg-blue-100",
          currentReactionData && currentReactionData.color
        )}
        onClick={() => {
          if (currentReaction) {
            onReactionRemove()
          } else {
            setIsOpen(!isOpen)
          }
        }}
      >
        {currentReactionData ? (
          <>
            {currentReactionData.icon}
            <span className="ml-1 text-sm font-medium">
              {currentReactionData.label}
            </span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-4 h-4" />
            <span className="ml-1 text-sm">Like</span>
          </>
        )}
      </Button>

      {/* Reaction Picker Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex space-x-1">
              {REACTIONS.map((reaction) => (
                <motion.button
                  key={reaction.id}
                  className={cn(
                    "relative p-2 rounded-full transition-all duration-150",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "hover:scale-125 active:scale-110",
                    currentReaction === reaction.id && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                  onClick={() => handleReactionClick(reaction.id)}
                  onMouseEnter={() => setHoveredReaction(reaction.id)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg" role="img" aria-label={reaction.label}>
                    {reaction.emoji}
                  </span>
                  
                  {/* Reaction Label Tooltip */}
                  <AnimatePresence>
                    {hoveredReaction === reaction.id && (
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
            <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
