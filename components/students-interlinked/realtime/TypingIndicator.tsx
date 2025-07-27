'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '@/lib/socket/socket-context-clean'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TypingUser {
  userId: string
  userName: string
  userImage?: string
}

interface TypingIndicatorProps {
  postId?: string
  roomId?: string
  currentUserId: string
  className?: string
}

export default function TypingIndicator({ 
  postId, 
  roomId, 
  currentUserId, 
  className = '' 
}: TypingIndicatorProps) {
  const { socket } = useSocket()
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    if (!socket) return

    const handleUserTyping = (data: { postId?: string, roomId?: string, userId: string, userName: string, userImage?: string }) => {
      // Only show typing for the current post/room
      if ((postId && data.postId === postId) || (roomId && data.roomId === roomId)) {
        // Don't show own typing
        if (data.userId !== currentUserId) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.userId !== data.userId)
            return [...filtered, { userId: data.userId, userName: data.userName, userImage: data.userImage }]
          })
        }
      }
    }

    const handleUserStoppedTyping = (data: { postId?: string, roomId?: string, userId: string }) => {
      if ((postId && data.postId === postId) || (roomId && data.roomId === roomId)) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId))
      }
    }

    // Listen for both comment typing and chat typing
    socket.on('students-interlinked:user-typing', handleUserTyping)
    socket.on('students-interlinked:user-stopped-typing', handleUserStoppedTyping)
    socket.on('chat:user-typing', handleUserTyping)
    socket.on('chat:user-stopped-typing', handleUserStoppedTyping)

    return () => {
      socket.off('students-interlinked:user-typing', handleUserTyping)
      socket.off('students-interlinked:user-stopped-typing', handleUserStoppedTyping)
      socket.off('chat:user-typing', handleUserTyping)
      socket.off('chat:user-stopped-typing', handleUserStoppedTyping)
    }
  }, [socket, postId, roomId, currentUserId])

  // Auto-remove typing users after 5 seconds of inactivity
  useEffect(() => {
    if (typingUsers.length > 0) {
      const timer = setTimeout(() => {
        setTypingUsers([])
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [typingUsers])

  if (typingUsers.length === 0) return null

  const displayText = typingUsers.length === 1 
    ? `${typingUsers[0].userName} is typing...`
    : typingUsers.length === 2
    ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
    : `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground ${className}`}
      >
        {/* Show avatars for typing users (max 3) */}
        <div className="flex -space-x-1">
          {typingUsers.slice(0, 3).map((user) => (
            <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user.userImage} />
              <AvatarFallback className="text-xs">{user.userName[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Typing text with animated dots */}
        <div className="flex items-center space-x-1">
          <span>{displayText}</span>
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-1 h-1 bg-muted-foreground rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for easy typing emission
export function useTypingIndicator(postId?: string, roomId?: string) {
  const { socket } = useSocket()
  const [isTyping, setIsTyping] = useState(false)

  const emitTyping = React.useCallback(() => {
    if (!socket || isTyping) return
    
    setIsTyping(true)
    if (postId) {
      socket.emit('students-interlinked:typing', { postId })
    }
    if (roomId) {
      socket.emit('chat:typing', { roomId })
    }
  }, [socket, postId, roomId, isTyping])

  const emitStoppedTyping = React.useCallback(() => {
    if (!socket || !isTyping) return
    
    setIsTyping(false)
    if (postId) {
      socket.emit('students-interlinked:stopped-typing', { postId })
    }
    if (roomId) {
      socket.emit('chat:stopped-typing', { roomId })
    }
  }, [socket, postId, roomId, isTyping])

  // Auto-stop typing after 3 seconds
  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => {
        emitStoppedTyping()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isTyping, emitStoppedTyping])

  return {
    emitTyping,
    emitStoppedTyping,
    isTyping
  }
}
