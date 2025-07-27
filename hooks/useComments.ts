/**
 * Production-Ready Unified Comments Hook
 * 
 * Purpose: Single source of truth for comment management across the app
 * Features:
 * - Real-time Socket.IO integration
 * - Optimistic updates with rollback
 * - Proper error handling and loading states
 * - Type-safe operations
 * - Automatic retry logic
 * - Memory leak prevention
 * 
 * This replaces all existing comment hooks and provides consistent behavior
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/lib/socket/socket-context-clean';
import { validateUUIDWithDetails } from '@/lib/utils/validation';
import type { 
  Comment, 
  CommentCreateRequest, 
  CommentUpdateRequest, 
  CommentListResponse,
  CommentState,
  CommentError,
  CommentSocketEvents
} from '@/types/comments';

interface UseCommentsOptions {
  postId: string;
  enabled?: boolean;
  initialComments?: Comment[];
  pageSize?: number;
  sortBy?: 'newest' | 'oldest' | 'popular';
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: CommentError | null;
  submitting: boolean;
  hasMore: boolean;
  
  // Actions
  createComment: (data: CommentCreateRequest) => Promise<Comment>;
  updateComment: (commentId: string, data: CommentUpdateRequest) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleLike: (commentId: string) => Promise<void>;
  
  // Pagination
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export function useComments({
  postId,
  enabled = true,
  initialComments = [],
  pageSize = 20,
  sortBy = 'newest'
}: UseCommentsOptions): UseCommentsReturn {
  
  // State management
  const [state, setState] = useState<CommentState>({
    comments: initialComments,
    loading: false,
    error: null,
    submitting: false,
    hasMore: true,
    page: 1
  });

  // Socket integration
  const { socket, isConnected } = useSocket();
  
  // Cleanup tracking
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  const setLoading = useCallback((loading: boolean) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, submitting }));
  }, []);

  const setError = useCallback((error: CommentError | null) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // ==========================================
  // API OPERATIONS WITH ERROR HANDLING
  // ==========================================

  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!enabled || (!append && state.loading)) return;
    
    console.log('🐛 fetchComments called:', { postId, page, append, enabled, loading: state.loading });
    
    if (!append) setLoading(true);
    setError(null);

    try {
      const url = `/api/students-interlinked/posts/${postId}/comments?page=${page}&limit=${pageSize}&sortBy=${sortBy}`;
      console.log('🐛 Fetching comments from:', url);
      
      const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('🐛 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🐛 API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: CommentListResponse = await response.json();
      console.log('✅ Comments data received:', data);
      console.log('🐛 Comments array length:', data.comments?.length || 0);
      console.log('🐛 Pagination data:', data.pagination);
      
      // Always update state if we got this far - component is still mounted
      console.log('🔄 Updating state with comments...');
      console.log('🔄 Previous state:', { 
        commentsLength: state.comments.length, 
        loading: state.loading, 
        page: state.page 
      });
      
      setState(prev => {
        const newState = {
          ...prev,
          comments: append ? [...prev.comments, ...data.comments] : data.comments,
          hasMore: data.pagination.hasNextPage,
          page: page,
          loading: false
        };
        
        console.log('🔄 New state will be:', { 
          commentsLength: newState.comments.length, 
          loading: newState.loading, 
          page: newState.page 
        });
        
        return newState;
      });

      console.log(`✅ Comments loaded: ${data.comments.length} for post ${postId}`);
      
      // Check if state actually updated in next tick
      setTimeout(() => {
        console.log('🔍 State after setTimeout:', { 
          commentsLength: state.comments.length, 
          loading: state.loading 
        });
      }, 0);
      
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      
      const commentError: CommentError = {
        type: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load comments',
        details: error
      };
      
      setError(commentError);
      setLoading(false);
      
      // Auto-retry after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && enabled) {
          fetchComments(page, append);
        }
      }, 3000);
    }
  }, [postId, pageSize, sortBy, enabled, state.loading, setLoading, setError]);

  const createComment = useCallback(async (data: CommentCreateRequest): Promise<Comment> => {
    if (!data.content.trim()) {
      const error: CommentError = {
        type: 'VALIDATION_ERROR',
        message: 'Comment content cannot be empty'
      };
      setError(error);
      throw error;
    }

    setSubmitting(true);
    setError(null);

    // Optimistic update
    const tempComment: Comment = {
      id: `temp_${Date.now()}`,
      content: data.content,
      postId,
      parentId: data.parentId || null,
      author: {
        id: 'current_user',
        name: 'You',
        image: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLiked: false,
      _count: { likes: 0, replies: 0 },
      replies: []
    };

    // PRODUCTION FIX: Proper optimistic update for nested comments
    // Handle replies vs main comments correctly
    if (data.parentId) {
      // It's a reply - add to parent comment's replies array
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment => {
          if (comment.id === data.parentId) {
            return {
              ...comment,
              replies: [tempComment, ...(comment.replies || [])],
              _count: { ...comment._count, replies: comment._count.replies + 1 }
            };
          }
          // Also check nested replies for deep nesting
          if (comment.replies && comment.replies.length > 0) {
            const updatedReplies = comment.replies.map(reply => {
              if (reply.id === data.parentId) {
                return {
                  ...reply,
                  replies: [tempComment, ...(reply.replies || [])],
                  _count: { ...reply._count, replies: reply._count.replies + 1 }
                };
              }
              return reply;
            });
            if (updatedReplies !== comment.replies) {
              return { ...comment, replies: updatedReplies };
            }
          }
          return comment;
        })
      }));
    } else {
      // It's a main comment - add to top-level
      setState(prev => ({
        ...prev,
        comments: [tempComment, ...prev.comments]
      }));
    }

    try {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const newComment: Comment = result.comment;

      if (!mountedRef.current) return newComment;

      // PRODUCTION FIX: Replace optimistic update with real data in correct location
      if (data.parentId) {
        // Replace reply in parent's replies array
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(comment => {
            if (comment.id === data.parentId) {
              return {
                ...comment,
                replies: (comment.replies || []).map(reply => 
                  reply.id === tempComment.id ? newComment : reply
                )
              };
            }
            // Also check nested replies for deep nesting
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = comment.replies.map(reply => {
                if (reply.id === data.parentId) {
                  return {
                    ...reply,
                    replies: (reply.replies || []).map(nestedReply => 
                      nestedReply.id === tempComment.id ? newComment : nestedReply
                    )
                  };
                }
                if (reply.replies) {
                  const nestedUpdatedReplies = reply.replies.map(nestedReply => 
                    nestedReply.id === tempComment.id ? newComment : nestedReply
                  );
                  if (nestedUpdatedReplies !== reply.replies) {
                    return { ...reply, replies: nestedUpdatedReplies };
                  }
                }
                return reply;
              });
              if (updatedReplies !== comment.replies) {
                return { ...comment, replies: updatedReplies };
              }
            }
            return comment;
          }),
          submitting: false
        }));
      } else {
        // Replace main comment in top-level array
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(c => 
            c.id === tempComment.id ? newComment : c
          ),
          submitting: false
        }));
      }

      console.log(`✅ Comment created: ${newComment.id}`);
      return newComment;

    } catch (error) {
      console.error('❌ Error creating comment:', error);
      
      // PRODUCTION FIX: Rollback optimistic update from correct location
      if (data.parentId) {
        // Remove failed reply from parent's replies array
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(comment => {
            if (comment.id === data.parentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter(reply => reply.id !== tempComment.id),
                _count: { ...comment._count, replies: Math.max(0, comment._count.replies - 1) }
              };
            }
            // Also check nested replies for deep nesting
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = comment.replies.map(reply => {
                if (reply.id === data.parentId) {
                  return {
                    ...reply,
                    replies: (reply.replies || []).filter(nestedReply => nestedReply.id !== tempComment.id),
                    _count: { ...reply._count, replies: Math.max(0, reply._count.replies - 1) }
                  };
                }
                if (reply.replies) {
                  const nestedUpdatedReplies = reply.replies.filter(nestedReply => nestedReply.id !== tempComment.id);
                  if (nestedUpdatedReplies.length !== reply.replies.length) {
                    return { 
                      ...reply, 
                      replies: nestedUpdatedReplies,
                      _count: { ...reply._count, replies: Math.max(0, reply._count.replies - 1) }
                    };
                  }
                }
                return reply;
              });
              if (updatedReplies !== comment.replies) {
                return { ...comment, replies: updatedReplies };
              }
            }
            return comment;
          }),
          submitting: false
        }));
      } else {
        // Remove failed main comment from top-level array
        setState(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c.id !== tempComment.id),
          submitting: false
        }));
      }

      const commentError: CommentError = {
        type: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create comment',
        details: error
      };
      
      setError(commentError);
      throw commentError;
    }
  }, [postId, setSubmitting, setError]);

  const updateComment = useCallback(async (commentId: string, data: CommentUpdateRequest): Promise<Comment> => {
    if (!data.content.trim()) {
      const error: CommentError = {
        type: 'VALIDATION_ERROR',
        message: 'Comment content cannot be empty'
      };
      setError(error);
      throw error;
    }

    setError(null);

    try {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const updatedComment: Comment = result.comment;

      if (!mountedRef.current) return updatedComment;

      setState(prev => ({
        ...prev,
        comments: prev.comments.map(c => 
          c.id === commentId ? updatedComment : c
        )
      }));

      console.log(`✅ Comment updated: ${commentId}`);
      return updatedComment;

    } catch (error) {
      console.error('❌ Error updating comment:', error);
      
      const commentError: CommentError = {
        type: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update comment',
        details: error
      };
      
      setError(commentError);
      throw commentError;
    }
  }, [postId, setError]);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    setError(null);

    try {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));

      console.log(`✅ Comment deleted: ${commentId}`);

    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      
      const commentError: CommentError = {
        type: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete comment',
        details: error
      };
      
      setError(commentError);
      throw commentError;
    }
  }, [postId, setError]);

  const toggleLike = useCallback(async (commentId: string): Promise<void> => {
    // PRODUCTION FIX: Enhanced input validation using centralized utility
    console.log('🔄 Attempting to toggle like for comment:', commentId);
    
    // Validate commentId using centralized validation utility
    const validation = validateUUIDWithDetails(commentId, 'Comment ID');
    if (!validation.isValid) {
      console.error('❌ Comment ID validation failed:', validation);
      setError({
        type: 'VALIDATION_ERROR',
        message: validation.error!,
        details: validation.details
      });
      return;
    }
    
    // PRODUCTION FIX: Find comment in both top-level and nested replies
    let comment: Comment | null = null;
    let isTopLevel = false;
    let parentCommentId: string | null = null;
    
    // Search in top-level comments first
    comment = state.comments.find(c => c.id === commentId) || null;
    if (comment) {
      isTopLevel = true;
    } else {
      // Search in nested replies
      for (const topComment of state.comments) {
        if (topComment.replies) {
          const foundReply = topComment.replies.find(r => r.id === commentId);
          if (foundReply) {
            comment = foundReply;
            parentCommentId = topComment.id;
            break;
          }
          // Search in deeply nested replies
          for (const reply of topComment.replies) {
            if (reply.replies) {
              const deepReply = reply.replies.find(dr => dr.id === commentId);
              if (deepReply) {
                comment = deepReply;
                parentCommentId = reply.id;
                break;
              }
            }
          }
          if (comment) break;
        }
      }
    }
    
    if (!comment) {
      console.error(`❌ Comment with ID ${commentId} not found in local state`);
      setError({
        type: 'NOT_FOUND',
        message: 'Comment not found',
        details: { commentId }
      });
      return;
    }

    const wasLiked = comment.isLiked;
    const newLikeCount = wasLiked ? comment._count.likes - 1 : comment._count.likes + 1;
    
    console.log(`🔄 Processing ${wasLiked ? 'unlike' : 'like'} for comment ${commentId}`);

    // PRODUCTION FIX: Optimistic update in correct location (top-level vs nested)
    if (isTopLevel) {
      // Update top-level comment
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: !wasLiked,
                _count: { ...c._count, likes: newLikeCount }
              }
            : c
        )
      }));
    } else {
      // Update nested comment in replies array
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(topComment => {
          if (topComment.replies && topComment.replies.some(r => r.id === commentId)) {
            // Comment is direct reply to this top comment
            return {
              ...topComment,
              replies: topComment.replies.map(reply => 
                reply.id === commentId
                  ? { 
                      ...reply, 
                      isLiked: !wasLiked,
                      _count: { ...reply._count, likes: newLikeCount }
                    }
                  : reply
              )
            };
          } else if (topComment.replies) {
            // Check if comment is nested deeper
            const updatedReplies = topComment.replies.map(reply => {
              if (reply.replies && reply.replies.some(dr => dr.id === commentId)) {
                return {
                  ...reply,
                  replies: reply.replies.map(deepReply => 
                    deepReply.id === commentId
                      ? { 
                          ...deepReply, 
                          isLiked: !wasLiked,
                          _count: { ...deepReply._count, likes: newLikeCount }
                        }
                      : deepReply
                  )
                };
              }
              return reply;
            });
            if (updatedReplies !== topComment.replies) {
              return { ...topComment, replies: updatedReplies };
            }
          }
          return topComment;
        })
      }));
    }

    try {
      console.log(`🔄 Making API call to like/unlike comment ${commentId}`);
      
      const response = await fetch(`/api/unified-likes/comment/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: wasLiked ? 'unlike' : 'like'
        })
      });

      console.log(`🔄 API Response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorDetails: any = { status: response.status, commentId };
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = { ...errorDetails, ...errorData };
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }
        
        console.error('❌ API call failed:', { errorMessage, errorDetails });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ Comment ${wasLiked ? 'unliked' : 'liked'}: ${commentId}`, result);

    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      
      // Enhanced error logging for debugging
      console.error('Error details:', {
        commentId,
        wasLiked,
        comment: comment ? { id: comment.id, content: comment.content.substring(0, 50) } : null,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Set user-friendly error
      setError({
        type: 'SERVER_ERROR',
        message: `Failed to ${wasLiked ? 'unlike' : 'like'} comment. Please try again.`,
        details: { 
          commentId, 
          action: wasLiked ? 'unlike' : 'like',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // PRODUCTION FIX: Rollback optimistic update in correct location
      if (isTopLevel) {
        // Rollback top-level comment
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(c => 
            c.id === commentId 
              ? { 
                  ...c, 
                  isLiked: wasLiked,
                  _count: { ...c._count, likes: comment._count.likes }
                }
              : c
          )
        }));
      } else {
        // Rollback nested comment in replies array
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(topComment => {
            if (topComment.replies && topComment.replies.some(r => r.id === commentId)) {
              // Comment is direct reply to this top comment
              return {
                ...topComment,
                replies: topComment.replies.map(reply => 
                  reply.id === commentId
                    ? { 
                        ...reply, 
                        isLiked: wasLiked,
                        _count: { ...reply._count, likes: comment._count.likes }
                      }
                    : reply
                )
              };
            } else if (topComment.replies) {
              // Check if comment is nested deeper
              const updatedReplies = topComment.replies.map(reply => {
                if (reply.replies && reply.replies.some(dr => dr.id === commentId)) {
                  return {
                    ...reply,
                    replies: reply.replies.map(deepReply => 
                      deepReply.id === commentId
                        ? { 
                            ...deepReply, 
                            isLiked: wasLiked,
                            _count: { ...deepReply._count, likes: comment._count.likes }
                          }
                        : deepReply
                    )
                  };
                }
                return reply;
              });
              if (updatedReplies !== topComment.replies) {
                return { ...topComment, replies: updatedReplies };
              }
            }
            return topComment;
          })
        }));
      }

      const commentError: CommentError = {
        type: 'SERVER_ERROR',
        message: 'Failed to update like status',
        details: error
      };
      
      setError(commentError);
    }
  }, [state.comments, setError]);

  // ==========================================
  // REAL-TIME SOCKET.IO INTEGRATION
  // ==========================================

  useEffect(() => {
    if (!socket || !isConnected || !enabled) return;

    const roomName = `post:${postId}:comments`;
    
    // Join the post room for real-time updates
    socket.emit('join_room', roomName);

    // Real-time event handlers
    const handleCommentCreated = (data: { postId: string; comment: Comment }) => {
      if (data.postId === postId && mountedRef.current) {
        setState(prev => {
          const exists = prev.comments.some(c => c.id === data.comment.id);
          if (exists) return prev;
          
          return {
            ...prev,
            comments: [data.comment, ...prev.comments]
          };
        });
      }
    };

    const handleCommentUpdated = (data: { postId: string; commentId: string; comment: Comment }) => {
      if (data.postId === postId && mountedRef.current) {
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(c => 
            c.id === data.commentId ? data.comment : c
          )
        }));
      }
    };

    const handleCommentDeleted = (data: { postId: string; commentId: string }) => {
      if (data.postId === postId && mountedRef.current) {
        setState(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c.id !== data.commentId)
        }));
      }
    };

    const handleCommentLiked = (data: { postId: string; commentId: string; isLiked: boolean; likeCount: number }) => {
      if (data.postId === postId && mountedRef.current) {
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(c => 
            c.id === data.commentId 
              ? { 
                  ...c, 
                  isLiked: data.isLiked,
                  _count: { ...c._count, likes: data.likeCount }
                }
              : c
          )
        }));
      }
    };

    // Subscribe to events
    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:liked', handleCommentLiked);

    console.log(`✅ Subscribed to real-time comments for post: ${postId}`);

    return () => {
      socket.emit('leave_room', roomName);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:liked', handleCommentLiked);
      console.log(`🔌 Unsubscribed from real-time comments for post: ${postId}`);
    };
  }, [socket, isConnected, enabled, postId]);

  // ==========================================
  // PAGINATION AND UTILITY FUNCTIONS
  // ==========================================

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    await fetchComments(state.page + 1, true);
  }, [state.hasMore, state.loading, state.page, fetchComments]);

  const refresh = useCallback(async () => {
    await fetchComments(1, false);
  }, [fetchComments]);

  // ==========================================
  // LIFECYCLE MANAGEMENT
  // ==========================================

  // Initial data load
  // Initial data fetch - separate from fetchComments to avoid circular dependencies
  useEffect(() => {
    console.log('🔄 Initial fetch useEffect triggered:', { 
      enabled, 
      postId, 
      commentsLength: state.comments.length, 
      loading: state.loading 
    });
    
    if (enabled && state.comments.length === 0 && !state.loading) {
      console.log('🚀 Triggering initial fetch directly...');
      
      // Call fetchComments directly without dependencies
      const initialFetch = async () => {
        if (!enabled || state.loading) return;
        
        setState(prev => ({ ...prev, loading: true }));
        
        try {
          const url = `/api/students-interlinked/posts/${postId}/comments?page=1&limit=20&sortBy=newest`;
          console.log('🐛 Initial fetch from:', url);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ Initial fetch data received:', data);
          
          setState(prev => ({
            ...prev,
            comments: data.comments,
            hasMore: data.pagination.hasNextPage,
            page: 1,
            loading: false
          }));
          
        } catch (error) {
          console.error('❌ Initial fetch error:', error);
          setState(prev => ({ ...prev, loading: false }));
        }
      };
      
      initialFetch();
    }
  }, [enabled, postId]); // Only depend on enabled and postId

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    comments: state.comments,
    loading: state.loading,
    error: state.error,
    submitting: state.submitting,
    hasMore: state.hasMore,
    
    createComment,
    updateComment,
    deleteComment,
    toggleLike,
    
    loadMore,
    refresh,
    clearError
  };
}
