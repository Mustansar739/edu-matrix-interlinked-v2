"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

// ==========================================
// OFFICIAL SOCKET.IO + NEXTAUTH 5 INTEGRATION
// ==========================================
// Clean, user-friendly implementation using only official methods

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  error: string | null
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' | 'auth_required'
  connect: () => void
  disconnect: () => void
  userId: string | null
  userEmail: string | null
}

export type { SocketContextType }

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export { SocketContext }

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error' | 'auth_required'>('disconnected')
  const { data: session, status } = useSession()
  
  // Connection reference to prevent multiple instances in React Strict Mode
  const connectionAttemptRef = useRef<boolean>(false)
  const mountedRef = useRef<boolean>(true)
  const socketInstanceRef = useRef<Socket | null>(null)

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  // Official NextAuth 5 session token extraction
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    if (typeof document === 'undefined') return null
    
    try {
      // Method 1: Try to get token via NextAuth's getToken method (most reliable)
      if (session?.user) {
        try {
          const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          })
          if (response.ok) {
            const sessionData = await response.json()
            // Extract the actual JWT token from the session
            const cookies = document.cookie.split('; ')
            for (const cookie of cookies) {
              const [name, value] = cookie.split('=')
              if (name === 'next-auth.session-token' || name === '__Secure-next-auth.session-token') {
                console.log('🔑 Found session token in cookies')
                return decodeURIComponent(value || '')
              }
            }
          }
        } catch (apiError) {
          console.warn('Failed to fetch session via API:', apiError)
        }
      }
      
      // Method 2: Parse cookies manually (fallback)
      const cookies = Object.fromEntries(
        document.cookie.split('; ').map(c => {
          const [name, value] = c.split('=')
          return [name, decodeURIComponent(value || '')]
        })
      )
      
      // Try multiple possible cookie names for NextAuth 5
      const possibleTokenNames = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'authjs.session-token',
        '__Secure-authjs.session-token'
      ]
      
      for (const tokenName of possibleTokenNames) {
        if (cookies[tokenName]) {
          console.log(`🔑 Found session token: ${tokenName}`)
          return cookies[tokenName]
        }
      }
        console.warn('⚠️ No session token found in cookies')
      return null
    } catch (error) {
      console.error('❌ Failed to extract session token:', error)
      return null
    }
  }, [session])
  
  const connect = useCallback(async () => {
    // Wait for session to load
    if (status === 'loading') {
      console.log('🔄 Waiting for session...')
      return
    }

    // Require authentication
    if (!session?.user) {
      console.log('🚫 Authentication required')
      setConnectionState('auth_required')
      setError('Please sign in to enable real-time features')
      return
    }

    // Skip if already connected or connecting (React Strict Mode protection)
    if (socket?.connected || connectionState === 'connecting' || connectionAttemptRef.current) {
      console.log('✅ Already connected or connecting, skipping duplicate connection attempt')
      return
    }

    // Prevent multiple simultaneous connection attempts
    connectionAttemptRef.current = true

    console.log('🚀 Connecting to Socket.IO server...')
    console.log('👤 User:', session.user.email, 'ID:', session.user.id)
    setConnectionState('connecting')
    setError(null)

    // Get session token for authentication
    const sessionToken = await getSessionToken()
    
    if (!sessionToken) {
      console.error('❌ Failed to get session token')
      setConnectionState('error')
      setError('Authentication token not found. Please refresh and sign in again.')
      return
    }
    
    console.log('🔑 Session token obtained, length:', sessionToken.length)
    
    // Official Socket.IO client configuration with HTTPS/WSS support
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_IO_INTERNAL_URL || 'http://localhost:3001';
    console.log('🔗 Connecting to Socket.IO server at:', socketUrl);
    
    // Determine if we're connecting via HTTPS (production) or HTTP (development)
    const isSecure = socketUrl.startsWith('https://');
    console.log('🔒 Secure connection:', isSecure);
    
    const socketInstance = io(socketUrl, {
        // PRODUCTION FIX: WebSocket transport configuration for HTTPS
        transports: isSecure ? ['websocket', 'polling'] : ['websocket', 'polling'],
        
        // PRODUCTION FIX: Enhanced connection options for HTTPS
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10, // Increased for better reliability
        reconnectionDelay: 2000,  // Increased delay for stability
        reconnectionDelayMax: 10000,
        timeout: 30000, // Increased timeout for HTTPS connections
        
        // PRODUCTION FIX: Force upgrade to secure transports when using HTTPS
        upgrade: true,
        rememberUpgrade: true,
        
        // PRODUCTION FIX: Proper headers for HTTPS connections
        extraHeaders: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        
        // PRODUCTION FIX: Ensure credentials are sent with HTTPS
        withCredentials: true,
        
        // PRODUCTION FIX: Force WebSocket protocol based on HTTPS
        forceNew: false, // Allow connection reuse for better performance
        
        // Official authentication via auth object
        auth: {
          token: sessionToken,
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name
        },
        
        // Additional user identification
        query: {
          userId: session.user.id
        }
      }
    )

    // Official Socket.IO event handlers with React Strict Mode protection
    socketInstance.on('connect', () => {
      if (!mountedRef.current) return; // Prevent state updates after unmount
      
      console.log('✅ Connected to Socket.IO server')
      console.log('🆔 Socket ID:', socketInstance.id)
      setIsConnected(true)
      setConnectionState('connected')
      setError(null)
      connectionAttemptRef.current = false // Reset connection flag
    })

    socketInstance.on('disconnect', (reason) => {
      if (!mountedRef.current) return; // Prevent state updates after unmount
      
      console.log('🔌 Disconnected:', reason)
      setIsConnected(false)
      setConnectionState('disconnected')
      connectionAttemptRef.current = false // Reset connection flag
      
      // User-friendly disconnect messages
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Reconnecting...')
      } else if (reason === 'transport close') {
        setError('Connection lost. Reconnecting...')
      }
    });
      socketInstance.on('connect_error', (error: any) => {
      if (!mountedRef.current) return; // Prevent state updates after unmount
      console.error('🚨 Full connection error object:', error)
      setIsConnected(false)
      setConnectionState('error')
      connectionAttemptRef.current = false // Reset connection flag
      
      // Detailed error analysis for debugging
      if (error.message.includes('Authentication') || error.message.includes('authentication')) {
        console.error('🔐 Authentication failed - possible causes:')
        console.error('  1. Invalid or expired session token')
        console.error('  2. Token format mismatch between client and server')
        console.error('  3. Missing AUTH_SECRET environment variable')
        console.error('  4. NextAuth configuration mismatch')
        setError('Authentication failed. Please sign in again.')
      } else if (error.message.includes('timeout')) {
        setError('Connection timeout. Please check your internet connection.')
        
        // PRODUCTION FIX: Try reconnection with increased timeout
        setTimeout(() => {
          if (mountedRef.current && !socket?.connected) {
            console.log('🔄 Retrying connection with extended timeout...')
            connect()
          }
        }, 5000)
        
      } else if (error.message.includes('ECONNREFUSED')) {
        setError('Socket.IO server is not running. Please contact support.')
      } else if (error.message.includes('websocket') || error.message.includes('transport')) {
        setError('WebSocket connection failed. Trying alternative connection method...')
        
        // PRODUCTION FIX: Fallback to polling-only transport
        setTimeout(() => {
          if (mountedRef.current && !socket?.connected) {
            console.log('🔄 Attempting polling-only fallback...')
            const fallbackUrl = socketUrl
            const fallbackSocket = io(fallbackUrl, {
              transports: ['polling'], // Force polling as fallback
              autoConnect: true,
              reconnection: true,
              reconnectionAttempts: 3,
              timeout: 20000,
              auth: {
                token: sessionToken,
                userId: session?.user?.id || '',
                email: session?.user?.email || '',
                name: session?.user?.name || ''
              },
              query: {
                userId: session?.user?.id || '',
                fallback: 'polling'
              }
            })
            
            fallbackSocket.on('connect', () => {
              console.log('✅ Polling fallback connection successful')
              if (mountedRef.current) {
                setSocket(fallbackSocket)
                setIsConnected(true)
                setConnectionState('connected')
                setError(null)
                socketInstanceRef.current = fallbackSocket
              }
            })
            
            fallbackSocket.on('connect_error', (fallbackError) => {
              console.error('❌ Fallback connection also failed:', fallbackError.message)
              if (mountedRef.current) {
                setError('Unable to establish connection. Please refresh the page.')
              }
            })
          }
        }, 3000)
      } else {
        setError(`Connection failed: ${error.message}`)
      }
    })

    // Custom auth error from server
    socketInstance.on('auth_error', (data) => {
      console.error('🔐 Auth error:', data.message)
      setError(data.message)
      setConnectionState('auth_required')
    })

    // Reconnection events
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
      setError(null)
    })

    socketInstance.on('reconnect_error', (error) => {
      console.warn('🔄 Reconnection failed:', error.message)
    })

    socketInstance.on('reconnect_failed', () => {
      console.error('🔄 All reconnection attempts failed')
      setError('Unable to reconnect. Please refresh the page.')
    })

    // Store socket instance reference for cleanup
    socketInstanceRef.current = socketInstance
    setSocket(socketInstance)
  }, [status, session, connectionState, getSessionToken])

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Disconnecting from Socket.IO server...')
      socket.disconnect()
      socketInstanceRef.current = null
      setSocket(null)
      setIsConnected(false)
      setConnectionState('disconnected')
      setError(null)
      connectionAttemptRef.current = false // Reset connection flag
    }
  }, [socket])
  // Auto-connect when session is ready with React Strict Mode protection
  useEffect(() => {
    // Only attempt connection when session is loaded and we're not already connected/connecting
    if (status !== 'loading' && session?.user && !socket?.connected && connectionState !== 'connecting' && !connectionAttemptRef.current) {
      console.log('🔄 Initializing socket connection...')
      
      // Use async function inside useEffect
      const initializeConnection = async () => {
        try {
          await connect()
        } catch (error) {
          console.error('Failed to initialize socket connection:', error)
          if (mountedRef.current) {
            setError('Failed to initialize connection. Please refresh the page.')
          }
        }
      }
      
      initializeConnection()
    }

    // Cleanup function with React Strict Mode protection
    return () => {
      // Only disconnect if we're unmounting permanently, not just re-rendering
      if (socketInstanceRef.current && connectionState === 'connected') {
        console.log('🧹 Cleaning up socket connection on unmount...')
        socketInstanceRef.current.disconnect()
        socketInstanceRef.current = null
        connectionAttemptRef.current = false
      }
    }
  }, [session?.user?.id, status]) // Only depend on user ID and status

  // Context value
  const value: SocketContextType = {
    socket,
    isConnected,
    error,
    connectionState,
    connect,
    disconnect,
    userId: session?.user?.id || null,
    userEmail: session?.user?.email || null
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}