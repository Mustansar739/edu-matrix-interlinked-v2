'use client';

import { useState, useCallback } from 'react';
import { useSocketEmitters } from './use-realtime-integration';

export type ServiceType = 'students-interlinked' | 'jobs' | 'freelancing' | 'edu-news';

interface PostActionState {
  [postId: string]: {
    liking?: boolean;
    sharing?: boolean;
    bookmarking?: boolean;
  };
}

interface PostActionsReturn {
  likePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  loading: PostActionState;
  error: string | null;
}

/**
 * Hook for managing post actions (like, share, bookmark)
 * Works across all services: students-interlinked, jobs, freelancing, edu-news
 */
export function usePostActions(serviceType: ServiceType = 'students-interlinked'): PostActionsReturn {
  const [loading, setLoading] = useState<PostActionState>({});
  const [error, setError] = useState<string | null>(null);
  const { emitPostLike, emitPostShare } = useSocketEmitters();

  const setPostLoading = useCallback((postId: string, action: string, isLoading: boolean) => {
    setLoading(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [action]: isLoading,
      },
    }));
  }, []);

  const likePost = useCallback(async (postId: string) => {
    setPostLoading(postId, 'liking', true);
    setError(null);

    try {
      const response = await fetch(`/api/${serviceType}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to like post');
      }

      const result = await response.json();
      
      // Emit real-time event for other users
      emitPostLike(postId, serviceType);
      
      console.log('✅ Post liked successfully:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to like post';
      setError(errorMessage);
      console.error('❌ Failed to like post:', err);
    } finally {
      setPostLoading(postId, 'liking', false);
    }
  }, [serviceType, emitPostLike, setPostLoading]);

  const sharePost = useCallback(async (postId: string) => {
    setPostLoading(postId, 'sharing', true);
    setError(null);

    try {
      const response = await fetch(`/api/${serviceType}/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to share post');
      }

      const result = await response.json();
      
      // Emit real-time event
      emitPostShare(postId, serviceType);
      
      console.log('✅ Post shared successfully:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share post';
      setError(errorMessage);
      console.error('❌ Failed to share post:', err);
    } finally {
      setPostLoading(postId, 'sharing', false);
    }
  }, [serviceType, emitPostShare, setPostLoading]);

  const bookmarkPost = useCallback(async (postId: string) => {
    setPostLoading(postId, 'bookmarking', true);
    setError(null);

    try {
      const response = await fetch(`/api/${serviceType}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to bookmark post');
      }

      const result = await response.json();
      console.log('✅ Post bookmarked successfully:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bookmark post';
      setError(errorMessage);
      console.error('❌ Failed to bookmark post:', err);
    } finally {
      setPostLoading(postId, 'bookmarking', false);
    }
  }, [serviceType, setPostLoading]);

  return {
    likePost,
    sharePost,
    bookmarkPost,
    loading,
    error,
  };
}
