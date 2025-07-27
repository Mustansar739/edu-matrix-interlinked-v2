'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket/socket-context-clean';

interface Comment {
  id: string;
  content: string;
  postId: string;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    username: string;
    image: string | null;
    role: string;
    verified: boolean;
  };
  createdAt: string;
  updatedAt: string;
  isLiked: boolean;
  _count: {
    likes: number;
    replies: number;
  };
  replies?: Comment[];
}

interface UseRealtimeCommentsOptions {
  postId: string;
  enabled?: boolean;
  initialComments?: Comment[];
}

interface UseRealtimeCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  removeComment: (commentId: string) => void;
  refreshComments: () => Promise<void>;
}

/**
 * Real-time comments hook with Socket.IO integration
 * Replaces polling with efficient real-time updates
 * 
 * PRODUCTION BENEFITS:
 * ✅ No more API polling spam
 * ✅ Instant comment updates
 * ✅ Reduced server load
 * ✅ Better user experience
 */
export function useRealtimeComments({
  postId,
  enabled = true,
  initialComments = []
}: UseRealtimeCommentsOptions): UseRealtimeCommentsReturn {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  // ==========================================
  // REAL-TIME EVENT HANDLERS
  // ==========================================

  const handleNewComment = useCallback((data: { 
    comment: Comment; 
    postId: string; 
  }) => {
    if (data.postId === postId) {
      setComments(prev => {
        // Check if comment already exists to prevent duplicates
        const exists = prev.some(c => c.id === data.comment.id);
        if (exists) return prev;
        
        // Add new comment to the beginning for latest-first order
        return [data.comment, ...prev];
      });
    }
  }, [postId]);

  const handleCommentUpdate = useCallback((data: {
    commentId: string;
    postId: string;
    updates: Partial<Comment>;
  }) => {
    if (data.postId === postId) {
      setComments(prev => 
        prev.map(comment => 
          comment.id === data.commentId 
            ? { ...comment, ...data.updates }
            : comment
        )
      );
    }
  }, [postId]);

  const handleCommentDelete = useCallback((data: {
    commentId: string;
    postId: string;
  }) => {
    if (data.postId === postId) {
      setComments(prev => 
        prev.filter(comment => comment.id !== data.commentId)
      );
    }
  }, [postId]);

  const handleCommentLike = useCallback((data: {
    commentId: string;
    postId: string;
    isLiked: boolean;
    likeCount: number;
  }) => {
    if (data.postId === postId) {
      setComments(prev => 
        prev.map(comment => 
          comment.id === data.commentId
            ? { 
                ...comment, 
                isLiked: data.isLiked,
                _count: { ...comment._count, likes: data.likeCount }
              }
            : comment
        )
      );
    }
  }, [postId]);

  // ==========================================
  // SOCKET.IO SUBSCRIPTION
  // ==========================================

  useEffect(() => {
    if (!socket || !isConnected || !enabled) return;

    // Join the post room for real-time updates
    socket.emit('join-post-room', postId);

    // Subscribe to comment events
    socket.on('students-interlinked:new-comment', handleNewComment);
    socket.on('students-interlinked:comment-updated', handleCommentUpdate);
    socket.on('students-interlinked:comment-deleted', handleCommentDelete);
    socket.on('students-interlinked:comment-liked', handleCommentLike);
    socket.on('students-interlinked:comment-unliked', handleCommentLike);

    console.log(`✅ Subscribed to real-time comments for post: ${postId}`);

    return () => {
      // Cleanup subscriptions
      socket.emit('leave-post-room', postId);
      socket.off('students-interlinked:new-comment', handleNewComment);
      socket.off('students-interlinked:comment-updated', handleCommentUpdate);
      socket.off('students-interlinked:comment-deleted', handleCommentDelete);
      socket.off('students-interlinked:comment-liked', handleCommentLike);
      socket.off('students-interlinked:comment-unliked', handleCommentLike);
      
      console.log(`🔌 Unsubscribed from real-time comments for post: ${postId}`);
    };
  }, [socket, isConnected, enabled, postId, handleNewComment, handleCommentUpdate, handleCommentDelete, handleCommentLike]);

  // ==========================================
  // COMMENT MANAGEMENT FUNCTIONS
  // ==========================================

  const addComment = useCallback((comment: Comment) => {
    setComments(prev => {
      // Check for duplicates
      const exists = prev.some(c => c.id === comment.id);
      if (exists) return prev;
      
      return [comment, ...prev];
    });
  }, []);

  const updateComment = useCallback((commentId: string, updates: Partial<Comment>) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, ...updates }
          : comment
      )
    );
  }, []);

  const removeComment = useCallback((commentId: string) => {
    setComments(prev => 
      prev.filter(comment => comment.id !== commentId)
    );
  }, []);

  // ==========================================
  // REFRESH COMMENTS (FALLBACK FOR API CALLS)
  // ==========================================

  const refreshComments = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }
      
      const data = await response.json();
      setComments(data.comments || []);
      
      console.log(`✅ Refreshed comments for post: ${postId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load comments';
      setError(errorMessage);
      console.error('❌ Error refreshing comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, loading]);

  // ==========================================
  // INITIAL LOAD (ONLY ONCE)
  // ==========================================

  useEffect(() => {
    if (enabled && comments.length === 0 && !loading) {
      refreshComments();
    }
  }, [enabled]); // Only run when enabled changes, not when comments change

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    removeComment,
    refreshComments
  };
}
