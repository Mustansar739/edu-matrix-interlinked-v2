/**
 * @fileoverview Core Socket.IO Connection Hook for Educational Platform
 * @module useRealtimeConnection
 * @category Realtime Hooks
 * 
 * 🔧 MIGRATION REQUIRED: This hook creates its own Socket.IO connection
 * TODO: Replace with centralized SocketContext from @/lib/socket/socket-context-clean
 * 
 * Foundation for all real-time features in Next.js 15+
 * 
 * ⚠️ WARNING: This hook creates a separate Socket.IO connection!
 * Use the centralized SocketContext instead to avoid connection conflicts.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Core Socket.IO connection hook for educational platform
 * 
 * WHY THIS IS ESSENTIAL:
 * - Foundation for all real-time features
 * - Handles authentication with NextAuth
 * - Auto-reconnection for reliability
 * - Error handling and recovery
 * 
 * WITHOUT THIS HOOK:
 * ❌ No live notifications
 * ❌ No real-time chat
 * ❌ No live collaboration
 * ❌ No instant updates
 * ❌ Poor user experience
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, emit, on } = useRealtimeConnection();
 *   
 *   useEffect(() => {
 *     if (isConnected) {
 *       const cleanup = on('message', handleMessage);
 *       return cleanup;
 *     }
 *   }, [isConnected, on]);
 * }
 * ```
 */
export function useRealtimeConnection() {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected || state.isConnecting || status === 'loading') {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Educational platform connected to real-time server');
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      }));

      // Join user-specific rooms for notifications
      if (session?.user?.id) {
        socket.emit('join:user-room', { userId: session.user.id });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from educational platform:', reason);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: `Disconnected: ${reason}`,
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));
    });

    // Heartbeat for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socketRef.current = socket;
  }, [session, status, state.isConnecting]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({
        isConnected: false,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit event, socket not connected:', event);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(event, callback);
    
    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  // Auto-connect when session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      connect();
    } else if (status === 'unauthenticated') {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [status, session, connect, disconnect]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    emit,
    on,
    connect,
    disconnect,
  };
}
