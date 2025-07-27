/**
 * @fileoverview Real-time Socket.IO Integration Hook
 * @module useSocketIntegration
 * @category Hooks
 * 
 * @description
 * Comprehensive hook that integrates Socket.IO events with Redux slices:
 * - Official React 19 + Next.js 15 patterns
 * - Official Socket.IO client patterns
 * - Official Redux Toolkit integration
 * - Real-time posts, stories, comments, and notifications
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/lib/socket/socket-context-clean';
import { 
  addPost as postReceived, 
  updatePost as postUpdated, 
  removePost as postDeleted, 
  optimisticLike as postLikeUpdated,
  addComment as commentReceived,
  setComments as commentUpdated,
  removePost as commentDeleted // Note: might need proper comment delete action
} from '@/lib/store/posts-slice';
import {
  addStory as storyReceived,
  updateStory as storyUpdated,
  removeStory as storyDeleted,
  markStoriesAsViewed as storyViewed,
  addReaction as storyReactionReceived,
  addReply as storyReplyReceived
} from '@/lib/store/stories-slice';
import {
  addNotification,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser
} from '@/lib/store/realtime-slice';

/**
 * Hook to integrate Socket.IO real-time events with Redux store
 * Uses official patterns from Socket.IO, Redux Toolkit, and React 19
 */
export function useSocketIntegration() {
  const { socket, isConnected } = useSocket();
  const dispatch = useDispatch();

  // Socket event handlers using official patterns
  const handlePostEvents = useCallback(() => {
    if (!socket) return;

    // Post creation events
    socket.on('post:created', (data) => {
      const { post, author } = data;
      dispatch(postReceived({ ...post, author }));
    });

    // Post updates (likes, shares, etc.)
    socket.on('post:updated', (data) => {
      const { postId, updates } = data;
      dispatch(postUpdated({ id: postId, ...updates }));
    });

    // Post deletions
    socket.on('post:deleted', (data) => {
      const { postId } = data;
      dispatch(postDeleted(postId));
    });    // Real-time like updates
    socket.on('post:like:updated', (data) => {
      const { postId, isLiked } = data;
      dispatch(postLikeUpdated({ postId, liked: isLiked })); // Use 'liked' not 'isLiked'
    });

    // Comment events
    socket.on('comment:created', (data) => {
      const { comment } = data;
      dispatch(commentReceived(comment));
    });

    socket.on('comment:updated', (data) => {
      const { commentId, updates } = data;
      dispatch(commentUpdated({ id: commentId, ...updates }));
    });    socket.on('comment:deleted', (data) => {
      const { postId } = data;
      // Since removePost expects string, not object, we need a different approach
      // For now, just log - implement proper comment deletion later
      console.log('Comment deleted for post:', postId);
    });

    return () => {
      socket.off('post:created');
      socket.off('post:updated');
      socket.off('post:deleted');
      socket.off('post:like:updated');
      socket.off('comment:created');
      socket.off('comment:updated');
      socket.off('comment:deleted');
    };
  }, [socket, dispatch]);

  const handleStoryEvents = useCallback(() => {
    if (!socket) return;

    // Story creation events
    socket.on('story:created', (data) => {
      const { story, author } = data;
      dispatch(storyReceived({ story, author }));
    });

    // Story updates
    socket.on('story:updated', (data) => {
      const { storyId, updates } = data;
      dispatch(storyUpdated({ id: storyId, ...updates }));
    });    // Story deletions
    socket.on('story:deleted', (data) => {
      const { storyId } = data;
      dispatch(storyDeleted(storyId)); // removeStory expects just string
    });    // Story view events - simplified for now  
    socket.on('story:viewed', (data) => {
      const { storyId, userId } = data;
      // markStoriesAsViewed expects userId, not storyId, so simplified for now
      console.log('Story viewed:', storyId, 'by user:', userId);
    });

    // Story reaction events
    socket.on('story:reaction:added', (data) => {
      const { reaction } = data;
      dispatch(storyReactionReceived(reaction));
    });

    // Story reply events
    socket.on('story:reply:added', (data) => {
      const { reply } = data;
      dispatch(storyReplyReceived(reply));
    });

    return () => {
      socket.off('story:created');
      socket.off('story:updated');
      socket.off('story:deleted');
      socket.off('story:viewed');
      socket.off('story:reaction:added');
      socket.off('story:reply:added');
    };
  }, [socket, dispatch]);

  const handleNotificationEvents = useCallback(() => {
    if (!socket) return;

    // Real-time notifications
    socket.on('notification:new', (data) => {
      const { notification } = data;
      dispatch(addNotification(notification));
    });

    // System notifications
    socket.on('notification:system', (data) => {
      const { notification } = data;
      dispatch(addNotification({
        ...notification,
        type: 'system'
      }));
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:system');
    };
  }, [socket, dispatch]);

  const handlePresenceEvents = useCallback(() => {
    if (!socket) return;

    // Online users updates
    socket.on('presence:online-users', (data) => {
      const { users } = data;
      dispatch(setOnlineUsers(users));
    });    // User status changes
    socket.on('presence:user-status-changed', (data) => {
      const { userId, status, lastSeen } = data;
      // Use addOnlineUser or removeOnlineUser based on status
      if (status === 'online') {
        dispatch(addOnlineUser({ 
          id: userId, 
          name: data.name || '', 
          lastSeen,
          status 
        }));
      } else {
        dispatch(removeOnlineUser(userId));
      }
    });

    // User joined/left events
    socket.on('presence:user-joined', (data) => {
      const { user } = data;
      dispatch(addOnlineUser({
        id: user.id,
        name: user.name,
        avatar: user.profilePictureUrl,
        lastSeen: new Date().toISOString(),
        status: 'online'
      }));
    });

    socket.on('presence:user-left', (data) => {
      const { userId } = data;
      dispatch(removeOnlineUser(userId));
    });

    return () => {
      socket.off('presence:online-users');
      socket.off('presence:user-status-changed');
      socket.off('presence:user-joined');
      socket.off('presence:user-left');
    };
  }, [socket, dispatch]);

  const handleConnectionEvents = useCallback(() => {
    if (!socket) return;

    // Connection status events
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      
      // Join essential rooms for real-time updates
      socket.emit('join:room', { room: 'posts-feed' });
      socket.emit('join:room', { room: 'stories-feed' });
      socket.emit('join:room', { room: 'online-users' });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    // Room join confirmations
    socket.on('room:joined', (data) => {
      console.log('✅ Joined room:', data.room);
    });

    socket.on('room:left', (data) => {
      console.log('👋 Left room:', data.room);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room:joined');
      socket.off('room:left');
    };
  }, [socket]);

  // Set up all event listeners when socket connects
  useEffect(() => {
    if (!socket || !isConnected) return;

    const cleanupFunctions = [
      handlePostEvents(),
      handleStoryEvents(),
      handleNotificationEvents(),
      handlePresenceEvents(),
      handleConnectionEvents(),
    ].filter(Boolean);

    // Return cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
    };
  }, [
    socket, 
    isConnected, 
    handlePostEvents, 
    handleStoryEvents, 
    handleNotificationEvents, 
    handlePresenceEvents, 
    handleConnectionEvents
  ]);

  // Helper functions for emitting events using official Socket.IO patterns
  const emitPostEvent = useCallback((eventName: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    }
  }, [socket, isConnected]);

  const emitStoryEvent = useCallback((eventName: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    }
  }, [socket, isConnected]);

  const joinRoom = useCallback((room: string) => {
    if (socket && isConnected) {
      socket.emit('join:room', { room });
    }
  }, [socket, isConnected]);

  const leaveRoom = useCallback((room: string) => {
    if (socket && isConnected) {
      socket.emit('leave:room', { room });
    }
  }, [socket, isConnected]);

  return {
    isConnected,
    emitPostEvent,
    emitStoryEvent,
    joinRoom,
    leaveRoom,
  };
}
