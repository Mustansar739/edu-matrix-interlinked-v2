'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ReactionCount {
  type: string
  emoji: string
  count: number
  users: Array<{
    id: string
    name: string
    image?: string
  }>
}

interface ReactionCounterProps {
  postId: string
  reactions: ReactionCount[]
  onReactionClick?: (reactionType: string) => void
  currentUserReaction?: string | null
  totalReactions: number
  className?: string
}

export default function ReactionCounter({
  postId,
  reactions,
  onReactionClick,
  currentUserReaction,
  totalReactions,
  className
}: ReactionCounterProps) {
  const [animatingCounts, setAnimatingCounts] = useState<{ [key: string]: number }>({})

  // Track previous counts for animation
  useEffect(() => {
    const newAnimatingCounts: { [key: string]: number } = {}
    reactions.forEach(reaction => {
      const prevCount = animatingCounts[reaction.type] || 0
      if (reaction.count !== prevCount) {
        newAnimatingCounts[reaction.type] = reaction.count
      }
    })
    setAnimatingCounts(newAnimatingCounts)
  }, [reactions])

  if (totalReactions === 0) return null

  // Get top 3 reaction types by count
  const topReactions = reactions
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const hasMultipleTypes = topReactions.length > 1
  const showDetailedBreakdown = totalReactions > 5

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Reaction Icons and Count */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-auto hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-1">
              {/* Stacked Reaction Emojis */}
              <div className="flex -space-x-1">
                {topReactions.map((reaction, index) => (
                  <motion.div
                    key={reaction.type}
                    className={cn(
                      "w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                      "flex items-center justify-center text-sm",
                      index > 0 && "relative"
                    )}
                    style={{ zIndex: topReactions.length - index }}
                    initial={false}
                    animate={{ 
                      scale: animatingCounts[reaction.type] !== undefined ? [1, 1.2, 1] : 1 
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {reaction.emoji}
                  </motion.div>
                ))}
              </div>

              {/* Total Count */}
              <motion.span 
                className="text-sm text-gray-600 dark:text-gray-400 font-medium ml-1"
                key={totalReactions}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.2 }}
              >
                {totalReactions}
              </motion.span>
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3">Reactions</h4>
            
            {/* Reaction Tabs */}
            <div className="flex space-x-2 mb-4">
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                All {totalReactions}
              </Badge>
              {topReactions.map((reaction) => (
                <Badge
                  key={reaction.type}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => onReactionClick?.(reaction.type)}
                >
                  {reaction.emoji} {reaction.count}
                </Badge>
              ))}
            </div>

            {/* Users List */}
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {reactions
                  .sort((a, b) => b.count - a.count)
                  .flatMap(reaction => 
                    reaction.users.map(user => ({
                      ...user,
                      reactionType: reaction.type,
                      reactionEmoji: reaction.emoji
                    }))
                  )
                  .slice(0, 20) // Limit to 20 users for performance
                  .map((user) => (
                    <div 
                      key={`${user.id}-${user.reactionType}`}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name}
                        </p>
                      </div>
                      
                      <div className="text-lg">
                        {user.reactionEmoji}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            {/* Show More Button */}
            {totalReactions > 20 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <Button variant="ghost" size="sm" className="w-full">
                  View all {totalReactions} reactions
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Live Animation for New Reactions */}
      <AnimatePresence>
        {Object.entries(animatingCounts).map(([type, count]) => {
          const reaction = reactions.find(r => r.type === type)
          if (!reaction) return null

          return (
            <motion.div
              key={`${type}-animation`}
              initial={{ opacity: 0, scale: 0, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute -top-2 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
            >
              +1 {reaction.emoji}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing reaction counts in real-time
export function useReactionCounter(postId: string, initialReactions: ReactionCount[] = []) {
  const [reactions, setReactions] = useState<ReactionCount[]>(initialReactions)
  const [totalReactions, setTotalReactions] = useState(
    initialReactions.reduce((sum, r) => sum + r.count, 0)
  )

  const updateReaction = (
    userId: string,
    userName: string,
    userImage: string | undefined,
    reactionType: string,
    emoji: string,
    isAdding: boolean
  ) => {
    setReactions(prev => {
      const updated = [...prev]
      const existingIndex = updated.findIndex(r => r.type === reactionType)

      if (existingIndex >= 0) {
        const existing = updated[existingIndex]
        
        if (isAdding) {
          // Add user to reaction
          existing.count += 1
          existing.users = [...existing.users, { id: userId, name: userName, image: userImage }]
        } else {
          // Remove user from reaction
          existing.count = Math.max(0, existing.count - 1)
          existing.users = existing.users.filter(u => u.id !== userId)
        }

        // Remove reaction type if count is 0
        if (existing.count === 0) {
          updated.splice(existingIndex, 1)
        }
      } else if (isAdding) {
        // Add new reaction type
        updated.push({
          type: reactionType,
          emoji,
          count: 1,
          users: [{ id: userId, name: userName, image: userImage }]
        })
      }

      return updated
    })

    // Update total count
    setTotalReactions(prev => isAdding ? prev + 1 : Math.max(0, prev - 1))
  }

  return {
    reactions,
    totalReactions,
    updateReaction,
    setReactions
  }
}
