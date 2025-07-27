/**
 * ==========================================
 * DEPRECATED: REAL-TIME UPDATES HOOK
 * ==========================================
 * 
 * ⚠️ THIS HOOK HAS BEEN DEPRECATED AND REPLACED BY CENTRAL SOCKET CONTEXT
 * 
 * REASON FOR DEPRECATION:
 * - Caused multiple Socket.IO connections conflicts
 * - Inconsistent state management across components  
 * - React Strict Mode compatibility issues
 * - Resource leaks and connection errors
 * 
 * MIGRATION GUIDE:
 * Replace this hook with the centralized SocketContext:
 * 
 * BEFORE:
 * const { isConnected, emit } = useRealTimeUpdates(config)
 * 
 * AFTER:
 * import { useSocket } from '@/lib/socket/socket-context-clean'
 * const { socket, isConnected } = useSocket()
 * socket?.emit(event, data)
 * 
 * BENEFITS OF MIGRATION:
 * - Single Socket.IO connection per app
 * - Centralized state management
 * - Better error handling and reconnection logic
 * - React Strict Mode compatibility
 * - Reduced resource usage
 * 
 * DATE DEPRECATED: 2025-07-04
 * ==========================================
 */

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket/socket-context-clean';

interface RealTimeConfig {
  userId: string;
  channels: string[];
  onPostUpdate?: (data: any) => void;
  onCommentUpdate?: (data: any) => void;
  onStoryUpdate?: (data: any) => void;
  onReactionUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  onTyping?: (data: any) => void;
  onPresence?: (data: any) => void;
}

/**
 * DEPRECATED: Use centralized SocketContext instead
 * This is a compatibility wrapper that forwards to the main socket connection
 */
export const useRealTimeUpdates = (config: RealTimeConfig) => {
  // Use the centralized socket connection instead of creating a new one
  const { socket, isConnected, connect, disconnect } = useSocket();

  // Forward events to the centralized socket when connected
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Register event listeners on the centralized socket
    const handlers: { [key: string]: (data: any) => void } = {};

    // Post events
    if (config.onPostUpdate) {
      handlers['post:created'] = config.onPostUpdate;
      handlers['post:updated'] = config.onPostUpdate;
      handlers['post:deleted'] = config.onPostUpdate;
    }

    // Comment events  
    if (config.onCommentUpdate) {
      handlers['comment:created'] = config.onCommentUpdate;
      handlers['comment:updated'] = config.onCommentUpdate;
      handlers['comment:deleted'] = config.onCommentUpdate;
    }

    // Story events
    if (config.onStoryUpdate) {
      handlers['story:created'] = config.onStoryUpdate;
      handlers['story:viewed'] = config.onStoryUpdate;
      handlers['story:expired'] = config.onStoryUpdate;
    }

    // Reaction events
    if (config.onReactionUpdate) {
      handlers['reaction:added'] = config.onReactionUpdate;
      handlers['reaction:removed'] = config.onReactionUpdate;
      handlers['reaction:updated'] = config.onReactionUpdate;
    }

    // Notification events
    if (config.onNotification) {
      handlers['notification:new'] = config.onNotification;
    }

    // Typing events
    if (config.onTyping) {
      handlers['typing:start'] = config.onTyping;
      handlers['typing:stop'] = config.onTyping;
    }

    // Presence events
    if (config.onPresence) {
      handlers['presence:online'] = config.onPresence;
      handlers['presence:offline'] = config.onPresence;
      handlers['presence:status'] = config.onPresence;
    }

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Join channels
    config.channels.forEach(channel => {
      socket.emit('join', channel);
    });

    // Cleanup function
    return () => {
      // Remove all registered handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });

      // Leave channels
      config.channels.forEach(channel => {
        socket.emit('leave', channel);
      });
    };
  }, [socket, isConnected, config]);

  // Wrapper functions that use the centralized socket
  const emit = useCallback((event: string, data: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('🚫 Cannot emit event: Socket not connected. Use centralized SocketContext.');
    }
  }, [socket]);

  const joinChannel = useCallback((channel: string) => {
    if (socket?.connected) {
      socket.emit('join', channel);
    }
  }, [socket]);

  const leaveChannel = useCallback((channel: string) => {
    if (socket?.connected) {
      socket.emit('leave', channel);
    }
  }, [socket]);

  // Typing indicators using centralized socket
  const startTyping = useCallback((conversationId: string) => {
    emit('typing:start', { conversationId, userId: config.userId });
  }, [emit, config.userId]);

  const stopTyping = useCallback((conversationId: string) => {
    emit('typing:stop', { conversationId, userId: config.userId });
  }, [emit, config.userId]);

  // Presence updates using centralized socket
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    emit('presence:update', { userId: config.userId, status });
  }, [emit, config.userId]);

  // Handle browser events for presence
  useEffect(() => {
    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);

  // Log deprecation warning
  useEffect(() => {
    console.warn(
      '⚠️ DEPRECATED: useRealTimeUpdates hook is deprecated. ' +
      'Please migrate to the centralized SocketContext from @/lib/socket/socket-context-clean'
    );
  }, []);

  return {
    isConnected,
    emit,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    updatePresence,
    connect,
    disconnect,
  };
};
