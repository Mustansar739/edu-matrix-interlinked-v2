'use client';

/**
 * 🔧 MIGRATION REQUIRED: This hook creates its own Socket.IO connection
 * TODO: Replace with centralized SocketContext from @/lib/socket/socket-context-clean
 * 
 * ⚠️ WARNING: This hook creates a separate Socket.IO connection!
 * Use the centralized SocketContext instead to avoid connection conflicts.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastHeartbeat: number | null;
}

interface RealtimeIntegrationReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  emit: (event: string, data: any) => void;
  reconnect: () => void;
}

interface SocketEmittersReturn {
  emitPostLike: (postId: string, serviceType: string) => void;
  emitPostShare: (postId: string, serviceType: string) => void;
  emitCommentAdd: (postId: string, comment: any, serviceType: string) => void;
  emitUserTyping: (postId: string, isTyping: boolean) => void;
}

/**
 * Hook for managing Socket.IO real-time integration
 * Connects to Socket.IO server and manages connection state
 */
export function useRealtimeIntegration(): RealtimeIntegrationReturn {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastHeartbeat: null,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Connect to Socket.IO server running in Docker
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection events
      socket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          lastHeartbeat: Date.now(),
        }));
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Disconnected: ${reason}`,
        }));
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message,
        }));
      });

      // Heartbeat for connection monitoring
      socket.on('heartbeat', () => {
        setState(prev => ({ ...prev, lastHeartbeat: Date.now() }));
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    emit,
    reconnect,
  };
}

/**
 * Hook for Socket.IO event emitters
 * Provides typed functions for emitting specific events
 */
export function useSocketEmitters(): SocketEmittersReturn {
  const { emit, isConnected } = useRealtimeIntegration();

  const emitPostLike = useCallback((postId: string, serviceType: string) => {
    if (!isConnected) return;
    
    emit('post_liked', {
      postId,
      serviceType,
      timestamp: Date.now(),
    });
  }, [emit, isConnected]);

  const emitPostShare = useCallback((postId: string, serviceType: string) => {
    if (!isConnected) return;
    
    emit('post_shared', {
      postId,
      serviceType,
      timestamp: Date.now(),
    });
  }, [emit, isConnected]);

  const emitCommentAdd = useCallback((postId: string, comment: any, serviceType: string) => {
    if (!isConnected) return;
    
    emit('comment_added', {
      postId,
      comment,
      serviceType,
      timestamp: Date.now(),
    });
  }, [emit, isConnected]);

  const emitUserTyping = useCallback((postId: string, isTyping: boolean) => {
    if (!isConnected) return;
    
    emit('user_typing', {
      postId,
      isTyping,
      timestamp: Date.now(),
    });
  }, [emit, isConnected]);

  return {
    emitPostLike,
    emitPostShare,
    emitCommentAdd,
    emitUserTyping,
  };
}
