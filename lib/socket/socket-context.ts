/**
 * Socket Context Types and Definitions
 * This file exports types and context for socket integration
 * Separate from the React components to avoid JSX import issues
 */

import { createContext } from 'react'
import { Socket } from 'socket.io-client'

export interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  error: string | null
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' | 'auth_required'
  connect: () => void
  disconnect: () => void
  userId: string | null
  userEmail: string | null
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)
