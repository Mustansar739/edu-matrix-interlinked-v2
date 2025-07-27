'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FloatingReaction {
  id: string
  emoji: string
  x: number
  y: number
  delay: number
}

interface ReactionAnimationsProps {
  reactions: Array<{
    id: string
    emoji: string
    userId: string
    userName: string
  }>
  containerRef?: React.RefObject<HTMLDivElement | null>
  className?: string
}

export default function ReactionAnimations({ 
  reactions, 
  containerRef,
  className 
}: ReactionAnimationsProps) {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

  useEffect(() => {
    if (reactions.length === 0) return

    const newReactions = reactions.map((reaction, index) => ({
      id: `${reaction.id}-${Date.now()}-${index}`,
      emoji: reaction.emoji,
      x: Math.random() * 100, // Random horizontal position (0-100%)
      y: 100, // Start from bottom
      delay: index * 150 // Stagger animations
    }))

    setFloatingReactions(prev => [...prev, ...newReactions])

    // Remove reactions after animation completes
    const timer = setTimeout(() => {
      setFloatingReactions(prev => 
        prev.filter(reaction => 
          !newReactions.some(newReaction => newReaction.id === reaction.id)
        )
      )
    }, 3000 + newReactions.length * 150)

    return () => clearTimeout(timer)
  }, [reactions])

  return (
    <div 
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      style={{ zIndex: 10 }}
    >
      <AnimatePresence>
        {floatingReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ 
              opacity: 0,
              scale: 0,
              x: `${reaction.x}%`,
              y: `${reaction.y}%`
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1, 0.8],
              x: `${reaction.x + (Math.random() - 0.5) * 20}%`,
              y: `${reaction.y - 120}%`,
              rotate: [0, 15, -15, 0]
            }}
            exit={{ 
              opacity: 0,
              scale: 0,
              y: `${reaction.y - 150}%`
            }}
            transition={{
              duration: 3,
              delay: reaction.delay / 1000,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="absolute text-2xl"
            style={{
              left: 0,
              top: 0,
              transformOrigin: 'center'
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Component for burst effect when multiple reactions happen quickly
interface ReactionBurstProps {
  reactions: Array<{
    emoji: string
    count: number
  }>
  onComplete?: () => void
  className?: string
}

export function ReactionBurst({ reactions, onComplete, className }: ReactionBurstProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isVisible || reactions.length === 0) return null

  return (
    <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none", className)}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="flex space-x-2"
      >
        {reactions.map((reaction, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 1.5, 1], 
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 1.5, 
              delay: index * 0.1,
              ease: "easeOut"
            }}
            className="text-4xl"
          >
            {reaction.emoji}
            {reaction.count > 1 && (
              <span className="text-sm font-bold text-blue-600 ml-1">
                +{reaction.count}
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// Hook for managing reaction animations
export function useReactionAnimations() {
  const [pendingReactions, setPendingReactions] = useState<Array<{
    id: string
    emoji: string
    userId: string
    userName: string
  }>>([])

  const addReaction = (reaction: {
    id: string
    emoji: string
    userId: string
    userName: string
  }) => {
    setPendingReactions(prev => [...prev, reaction])
    
    // Clear this reaction after animation
    setTimeout(() => {
      setPendingReactions(prev => prev.filter(r => r.id !== reaction.id))
    }, 3500)
  }

  const clearReactions = () => {
    setPendingReactions([])
  }

  return {
    reactions: pendingReactions,
    addReaction,
    clearReactions
  }
}
