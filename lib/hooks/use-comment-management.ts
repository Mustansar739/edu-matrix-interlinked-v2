'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocketEmitters } from './use-realtime-integration';

export type ServiceType = 'students-interlinked' | 'jobs' | 'freelancing' | 'edu-news';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface CommentManagementState {
  comments: Comment[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

interface CommentManagementReturn {
  comments: Comment[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  hasMore: boolean;
  addComment: (content: string, parentId?: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  refreshComments: () => Promise<void>;
}

/**
 * Hook for managing comments on posts
 * Works across all services: students-interlinked, jobs, freelancing, edu-news
 */
export function useCommentManagement(
  postId: string,
  serviceType: ServiceType = 'students-interlinked'
): CommentManagementReturn {
  const [state, setState] = useState<CommentManagementState>({
    comments: [],
    loading: false,
    submitting: false,
    error: null,
    hasMore: true,
    page: 1,
  });

  const { emitCommentAdd } = useSocketEmitters();

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setState(prev => ({ ...prev, submitting }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!append) setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/${serviceType}/posts/${postId}/comments?page=${page}&limit=20`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch comments');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        comments: append ? [...prev.comments, ...data.comments] : data.comments,
        hasMore: data.hasMore || false,
        page: page,
      }));

      console.log('✅ Comments fetched successfully:', data.comments.length);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);
      console.error('❌ Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, serviceType, setLoading, setError]);

  const addComment = useCallback(async (content: string, parentId?: string) => {
    if (!content.trim()) {
      setError('Comment content cannot be empty');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/${serviceType}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          parentId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }

      const newComment = await response.json();
      
      // Add to local state immediately (optimistic update)
      setState(prev => ({
        ...prev,
        comments: [newComment, ...prev.comments],
      }));

      // Emit real-time event
      emitCommentAdd(postId, newComment, serviceType);
      
      console.log('✅ Comment added successfully:', newComment);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setError(errorMessage);
      console.error('❌ Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  }, [postId, serviceType, emitCommentAdd, setSubmitting, setError]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!content.trim()) {
      setError('Comment content cannot be empty');
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/${serviceType}/posts/${postId}/comments/${commentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content.trim(),
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update comment');
      }

      const updatedComment = await response.json();
      
      // Update local state
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment =>
          comment.id === commentId ? updatedComment : comment
        ),
      }));

      console.log('✅ Comment updated successfully:', updatedComment);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update comment';
      setError(errorMessage);
      console.error('❌ Failed to update comment:', err);
    }
  }, [postId, serviceType, setError]);

  const deleteComment = useCallback(async (commentId: string) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/${serviceType}/posts/${postId}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete comment');
      }

      // Remove from local state
      setState(prev => ({
        ...prev,
        comments: prev.comments.filter(comment => comment.id !== commentId),
      }));

      console.log('✅ Comment deleted successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment';
      setError(errorMessage);
      console.error('❌ Failed to delete comment:', err);
    }
  }, [postId, serviceType, setError]);

  const loadMoreComments = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    
    await fetchComments(state.page + 1, true);
  }, [state.hasMore, state.loading, state.page, fetchComments]);

  const refreshComments = useCallback(async () => {
    await fetchComments(1, false);
  }, [fetchComments]);

  // Load initial comments when postId changes
  useEffect(() => {
    if (postId) {
      fetchComments(1, false);
    }
  }, [postId, fetchComments]);

  return {
    comments: state.comments,
    loading: state.loading,
    submitting: state.submitting,
    error: state.error,
    hasMore: state.hasMore,
    addComment,
    updateComment,
    deleteComment,
    loadMoreComments,
    refreshComments,
  };
}
