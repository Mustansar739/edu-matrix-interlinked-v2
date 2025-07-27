/**
 * ==========================================
 * SOCKET.IO HOOKS
 * ==========================================
 * Collection of Socket.IO hooks for easy usage
 */

import { useEffect, useCallback } from 'react'
import { useSocket as useSocketContext } from '../lib/socket/socket-context-clean'

// Define event data types
interface MessageData {
  room?: string
  content: string
  timestamp: string
  user?: {
    id: string
    name: string
  }
}

interface UserJoinedData {
  userId: string
  username: string
  room: string
}

interface UserLeftData {
  userId: string
  username: string
  room: string
}

// Re-export the main useSocket hook
export { useSocket } from '../lib/socket/socket-context-clean'

/**
 * Hook to listen to socket events with proper typing
 */
export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const { socket } = useSocketContext()
  
  useEffect(() => {
    if (!socket) return
    
    socket.on(event, handler)
    
    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}

/**
 * Hook to emit socket events
 */
export function useSocketEmit() {
  const { socket } = useSocketContext()
  
  return useCallback((event: string, data?: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data)
    }
  }, [socket])
}

/**
 * Hook for room management
 */
export function useSocketRoom() {
  const { socket } = useSocketContext()
  
  const joinRoom = useCallback((room: string) => {
    if (socket && socket.connected) {
      socket.emit('join_room', { room })
    }
  }, [socket])
  
  const leaveRoom = useCallback((room: string) => {
    if (socket && socket.connected) {
      socket.emit('leave_room', { room })
    }
  }, [socket])
  
  return { joinRoom, leaveRoom }
}

// Export typed event handlers for common events
export function useSocketMessage(handler: (data: MessageData) => void) {
  useSocketEvent<MessageData>('message', handler)
}

export function useSocketUserJoined(handler: (data: UserJoinedData) => void) {
  useSocketEvent<UserJoinedData>('user_joined', handler)
}

export function useSocketUserLeft(handler: (data: UserLeftData) => void) {
  useSocketEvent<UserLeftData>('user_left', handler)
}
