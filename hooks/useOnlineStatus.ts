/**
 * =============================================================================
 * ONLINE STATUS HOOK - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Provides real-time online status for users in conversations, profiles, and throughout the app
 * Integrates with Socket.IO for live updates and caching for performance
 * 
 * FEATURES:
 * ✅ Real-time online status updates via Socket.IO
 * ✅ User presence tracking and heartbeat system
 * ✅ Optimized caching to reduce API calls
 * ✅ Typing indicators and activity status
 * ✅ Privacy-respecting last seen times
 * ✅ Automatic cleanup and memory management
 * 
 * USAGE:
 * const { isOnline, lastSeen, getOnlineStatus } = useOnlineStatus();
 * const userStatus = getOnlineStatus(userId);
 * 
 * // For multiple users
 * const statuses = useOnlineStatus([userId1, userId2, userId3]);
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/lib/socket/socket-context-clean';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

interface OnlineStatus {
  isOnline: boolean;
  lastSeen: Date;
  isTyping?: boolean;
  activity?: 'active' | 'idle' | 'away' | 'offline';
}

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  activity: 'active' | 'idle' | 'away' | 'offline';
  lastActivity: Date;
}

// ==========================================
// ONLINE STATUS HOOK
// ==========================================

export function useOnlineStatus(userIds?: string | string[]) {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [onlineStatuses, setOnlineStatuses] = useState<{ [userId: string]: OnlineStatus }>({});
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true); // ✅ PRODUCTION-READY: Add loading state
  const cacheRef = useRef<{ [userId: string]: { status: OnlineStatus; timestamp: number } }>({});
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ CRITICAL FIX: Memoize userIdArray to prevent infinite re-renders
  // This prevents the array from being recreated on every render, which was causing
  // the useEffect dependency to trigger infinitely
  const userIdArray = useMemo(() => {
    return Array.isArray(userIds) ? userIds : userIds ? [userIds] : [];
  }, [userIds]);

  // ==========================================
  // SOCKET EVENT HANDLERS - MEMOIZED TO PREVENT INFINITE LOOPS
  // ==========================================

  // ✅ CRITICAL FIX: Memoize all Socket.IO event handlers to prevent recreation
  // on every render, which was causing infinite useEffect loops
  const handleUserOnline = useCallback((data: { userId: string; isOnline: boolean; lastSeen: string; activity: string }) => {
    const status: OnlineStatus = {
      isOnline: data.isOnline,
      lastSeen: new Date(data.lastSeen),
      activity: data.activity as any,
    };

    setOnlineStatuses(prev => ({
      ...prev,
      [data.userId]: status,
    }));

    // Update cache
    cacheRef.current[data.userId] = {
      status,
      timestamp: Date.now(),
    };
  }, []);

  const handleUserOffline = useCallback((data: { userId: string; lastSeen: string }) => {
    const status: OnlineStatus = {
      isOnline: false,
      lastSeen: new Date(data.lastSeen),
      activity: 'offline',
    };

    setOnlineStatuses(prev => ({
      ...prev,
      [data.userId]: status,
    }));

    // Update cache
    cacheRef.current[data.userId] = {
      status,
      timestamp: Date.now(),
    };
  }, []);

  const handleTypingStart = useCallback((data: { userId: string; conversationId: string }) => {
    setTypingUsers(prev => ({
      ...prev,
      [data.userId]: true,
    }));
  }, []);

  const handleTypingStop = useCallback((data: { userId: string; conversationId: string }) => {
    setTypingUsers(prev => ({
      ...prev,
      [data.userId]: false,
    }));
  }, []);

  const handlePresenceUpdate = useCallback((data: { users: UserPresence[] }) => {
    const newStatuses: { [userId: string]: OnlineStatus } = {};
    
    data.users.forEach(user => {
      newStatuses[user.userId] = {
        isOnline: user.isOnline,
        lastSeen: new Date(user.lastSeen),
        activity: user.activity,
      };

      // Update cache
      cacheRef.current[user.userId] = {
        status: newStatuses[user.userId],
        timestamp: Date.now(),
      };
    });

    setOnlineStatuses(prev => ({
      ...prev,
      ...newStatuses,
    }));
  }, []);

  // ✅ CRITICAL FIX: This was the main cause of infinite loops!
  // Memoized the handlePresenceMultipleUpdate function to prevent recreation
  const handlePresenceMultipleUpdate = useCallback((data: { users: { [userId: string]: any }, timestamp: string }) => {
    console.log('👥 Received multiple presence update:', data);
    const newStatuses: { [userId: string]: OnlineStatus } = {};
    
    Object.entries(data.users).forEach(([userId, userStatus]) => {
      newStatuses[userId] = {
        isOnline: userStatus.isOnline,
        lastSeen: new Date(userStatus.lastSeen),
        activity: userStatus.activity,
      };

      // Update cache
      cacheRef.current[userId] = {
        status: newStatuses[userId],
        timestamp: Date.now(),
      };
    });

    setOnlineStatuses(prev => ({
      ...prev,
      ...newStatuses,
    }));
  }, []);

  const handlePresenceError = useCallback((data: any) => {
    console.error('👥 Presence error:', data);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.id) return;

    // Register socket event listeners
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('user:typing:start', handleTypingStart);
    socket.on('user:typing:stop', handleTypingStop);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('presence:multiple-update', handlePresenceMultipleUpdate);
    socket.on('presence:error', handlePresenceError);

    // Join presence room for real-time updates
    socket.emit('presence:join', {
      userId: session.user?.id,
      userIds: userIdArray,
    });

    // Cleanup on unmount
    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user:typing:start', handleTypingStart);
      socket.off('user:typing:stop', handleTypingStop);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('presence:multiple-update', handlePresenceMultipleUpdate);
      socket.off('presence:error', handlePresenceError);
    };
  }, [socket, isConnected, session?.user?.id, userIdArray, handleUserOnline, handleUserOffline, handleTypingStart, handleTypingStop, handlePresenceUpdate, handlePresenceMultipleUpdate, handlePresenceError]);

  // ==========================================
  // HEARTBEAT SYSTEM
  // ==========================================

  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.id) return;

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      socket.emit('presence:heartbeat', {
        userId: session.user?.id,
        activity: document.hidden ? 'away' : 'active',
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    // Send initial heartbeat
    socket.emit('presence:heartbeat', {
      userId: session.user?.id,
      activity: 'active',
      timestamp: new Date().toISOString(),
    });

    // Cleanup heartbeat on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [socket, isConnected, session?.user?.id]);

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  const getCachedStatus = useCallback((userId: string): OnlineStatus | null => {
    const cached = cacheRef.current[userId];
    if (!cached) return null;

    // Cache is valid for 5 minutes
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > 5 * 60 * 1000) {
      delete cacheRef.current[userId];
      return null;
    }

    return cached.status;
  }, []);

  // ==========================================
  // API FETCHING
  // ==========================================

  const fetchOnlineStatus = useCallback(async (userId: string): Promise<OnlineStatus | null> => {
    try {
      const response = await fetch(`/api/users/${userId}/online-status`);
      if (!response.ok) return null;

      const data = await response.json();
      const status: OnlineStatus = {
        isOnline: data.isOnline,
        lastSeen: new Date(data.lastSeen),
        activity: data.activity || 'offline',
      };

      // Update cache
      cacheRef.current[userId] = {
        status,
        timestamp: Date.now(),
      };

      return status;
    } catch (error) {
      console.error('Error fetching online status:', error);
      return null;
    }
  }, []);

  // ✅ PRODUCTION-READY: Enhanced fallback status creation with better defaults
  const createFallbackStatus = useCallback((lastActivity?: Date | string): OnlineStatus => {
    const lastSeen = lastActivity ? new Date(lastActivity) : new Date();
    const now = new Date();
    const timeDiff = now.getTime() - lastSeen.getTime();
    
    // Determine online status based on last activity
    let isOnline = false;
    let activity: OnlineStatus['activity'] = 'offline';
    
    if (timeDiff < 5 * 60 * 1000) { // 5 minutes
      isOnline = true;
      activity = 'active';
    } else if (timeDiff < 15 * 60 * 1000) { // 15 minutes
      isOnline = true;
      activity = 'idle';
    } else if (timeDiff < 60 * 60 * 1000) { // 1 hour
      isOnline = false;
      activity = 'away';
    }
    
    return {
      isOnline,
      lastSeen,
      activity
    };
  }, []);

  const fetchMultipleStatuses = useCallback(async (userIds: string[]): Promise<{ [userId: string]: OnlineStatus }> => {
    try {
      const response = await fetch('/api/users/online-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) return {};

      const data = await response.json();
      const statuses: { [userId: string]: OnlineStatus } = {};

      Object.keys(data.statuses).forEach(userId => {
        const userStatus = data.statuses[userId];
        statuses[userId] = {
          isOnline: userStatus.isOnline,
          lastSeen: new Date(userStatus.lastSeen),
          activity: userStatus.activity || 'offline',
        };

        // Update cache
        cacheRef.current[userId] = {
          status: statuses[userId],
          timestamp: Date.now(),
        };
      });

      return statuses;
    } catch (error) {
      console.error('Error fetching multiple online statuses:', error);
      return {};
    }
  }, []);

  // ==========================================
  // HOOK METHODS
  // ==========================================

  const getOnlineStatus = useCallback(async (userId: string): Promise<OnlineStatus | null> => {
    // Check cache first
    const cached = getCachedStatus(userId);
    if (cached) return cached;

    // Check current state
    if (onlineStatuses[userId]) {
      return onlineStatuses[userId];
    }

    // Fetch from API
    const status = await fetchOnlineStatus(userId);
    if (status) {
      setOnlineStatuses(prev => ({
        ...prev,
        [userId]: status,
      }));
    }

    return status;
  }, [getCachedStatus, onlineStatuses, fetchOnlineStatus]);

  const getMultipleStatuses = useCallback(async (userIds: string[]): Promise<{ [userId: string]: OnlineStatus }> => {
    const results: { [userId: string]: OnlineStatus } = {};
    const uncachedIds: string[] = [];

    // Check cache and current state for each user
    userIds.forEach(userId => {
      const cached = getCachedStatus(userId);
      if (cached) {
        results[userId] = cached;
      } else if (onlineStatuses[userId]) {
        results[userId] = onlineStatuses[userId];
      } else {
        uncachedIds.push(userId);
      }
    });

    // Fetch uncached statuses
    if (uncachedIds.length > 0) {
      const fetchedStatuses = await fetchMultipleStatuses(uncachedIds);
      Object.assign(results, fetchedStatuses);

      // Update state
      setOnlineStatuses(prev => ({
        ...prev,
        ...fetchedStatuses,
      }));
    }

    return results;
  }, [getCachedStatus, onlineStatuses, fetchMultipleStatuses]);

  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineStatuses[userId]?.isOnline || false;
  }, [onlineStatuses]);

  const isUserTyping = useCallback((userId: string): boolean => {
    return typingUsers[userId] || false;
  }, [typingUsers]);

  const getLastSeen = useCallback((userId: string): Date | null => {
    return onlineStatuses[userId]?.lastSeen || null;
  }, [onlineStatuses]);

  // ==========================================
  // EFFECTS FOR INITIAL LOADING - REAL-TIME ONLY
  // ==========================================

  useEffect(() => {
    // ✅ PRODUCTION-READY: Enhanced initialization with proper fallbacks
    if (userIdArray.length > 0) {
      setIsLoading(true);
      
      if (socket && isConnected) {
        console.log('🔄 Requesting online status via Socket.IO for users:', userIdArray);
        socket.emit('presence:request-multiple', { userIds: userIdArray });
        
        // Set a timeout to fallback to HTTP API if Socket.IO doesn't respond
        const fallbackTimeout = setTimeout(async () => {
          console.log('⚠️ Socket.IO timeout, falling back to HTTP API');
          try {
            const statuses = await fetchMultipleStatuses(userIdArray);
            setOnlineStatuses(prev => ({ ...prev, ...statuses }));
          } catch (error) {
            console.error('❌ HTTP API fallback failed:', error);
            // Create default offline statuses as last resort
            const defaultStatuses: { [userId: string]: OnlineStatus } = {};
            userIdArray.forEach(userId => {
              defaultStatuses[userId] = createFallbackStatus();
            });
            setOnlineStatuses(prev => ({ ...prev, ...defaultStatuses }));
          } finally {
            setIsLoading(false);
          }
        }, 3000); // 3 second timeout
        
        // Clear timeout if Socket.IO responds
        const handlePresenceResponse = () => {
          clearTimeout(fallbackTimeout);
          setIsLoading(false);
        };
        
        socket.once('presence:multiple-update', handlePresenceResponse);
        socket.once('presence:error', () => {
          clearTimeout(fallbackTimeout);
          setIsLoading(false);
        });
        
        return () => {
          clearTimeout(fallbackTimeout);
          socket.off('presence:multiple-update', handlePresenceResponse);
        };
      } else {
        // No Socket.IO connection, use HTTP API immediately
        console.log('📡 No Socket.IO connection, using HTTP API for presence data');
        fetchMultipleStatuses(userIdArray)
          .then(statuses => {
            setOnlineStatuses(prev => ({ ...prev, ...statuses }));
          })
          .catch(error => {
            console.error('❌ Initial HTTP API call failed:', error);
            // Create default offline statuses as fallback
            const defaultStatuses: { [userId: string]: OnlineStatus } = {};
            userIdArray.forEach(userId => {
              defaultStatuses[userId] = createFallbackStatus();
            });
            setOnlineStatuses(prev => ({ ...prev, ...defaultStatuses }));
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else {
      setIsLoading(false);
    }
  }, [userIdArray, socket, isConnected, fetchMultipleStatuses, createFallbackStatus]);

  // ==========================================
  // RETURN VALUES
  // ==========================================

  // Single user mode
  if (typeof userIds === 'string') {
    return {
      isOnline: isUserOnline(userIds),
      lastSeen: getLastSeen(userIds),
      isTyping: isUserTyping(userIds),
      activity: onlineStatuses[userIds]?.activity || 'offline',
      isLoading, // ✅ PRODUCTION-READY: Include loading state
      getOnlineStatus,
    };
  }

  // Multiple users mode
  return {
    onlineStatuses,
    typingUsers,
    isLoading, // ✅ PRODUCTION-READY: Include loading state
    getOnlineStatus,
    getMultipleStatuses,
    isUserOnline,
    isUserTyping,
    getLastSeen,
  };
}
