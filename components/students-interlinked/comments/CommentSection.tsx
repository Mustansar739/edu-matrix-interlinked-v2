/**
 * Production-Ready Comment Section Component
 * 
 * Purpose: Facebook-style comment system with real-time updates
 * Features:
 * - Self-contained with unified comment hook
 * - Real-time Socket.IO integration
 * - Optimistic updates with error handling
 * - Nested comments support
 * - Type-safe operations
 * - Memory leak prevention
 * 
 * This component is now fully self-sufficient and doesn't require 
 * manual prop passing from parent components
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MoreHorizontal, Heart, Reply, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '../core/utils/socialHelpers';
import TypingIndicator, { useTypingIndicator } from '../realtime/TypingIndicator';
import PresenceIndicator from '../realtime/PresenceIndicator';
import { CommentErrorBoundary, NestedCommentErrorBoundary } from './CommentErrorBoundary';
import { toast } from 'sonner';

// Import unified types and hook
import type { Comment, CommentCreateRequest } from '@/types/comments';
import { useComments } from '@/hooks/useComments';

interface CommentSectionProps {
  postId: string;
  userId: string;
  className?: string;
  showCount?: number;
}

interface CommentItemProps {
  comment: Comment;
  userId: string;
  level?: number;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  className?: string;
  // Production-ready: Add expand/collapse functionality
  expandedComments?: Set<string>;
  onToggleExpansion?: (commentId: string) => void;
  onLoadMoreReplies?: (commentId: string) => void;
  loadingReplies?: Set<string>;
  // Add createComment function for inline replies
  onCreateComment?: (commentData: CommentCreateRequest) => Promise<Comment>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  userId,
  level = 0,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
  className,
  // Production-ready: Expand/collapse functionality props
  expandedComments = new Set(),
  onToggleExpansion,
  onLoadMoreReplies,
  loadingReplies = new Set(),
  onCreateComment,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Enhanced: Inline reply state
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [inlineReplyContent, setInlineReplyContent] = useState('');

  const handleEditSave = async () => {
    if (editContent.trim() !== comment.content) {
      await onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  // Enhanced: Inline reply handlers
  const handleInlineReply = () => {
    setShowInlineReply(!showInlineReply);
    if (!showInlineReply) {
      setInlineReplyContent('');
      // Also trigger the parent reply handler when opening reply
      onReply(comment.id);
    }
  };

  const handleInlineReplySubmit = async () => {
    if (!inlineReplyContent.trim() || !onCreateComment) return;
    
    try {
      // Create the reply using the comment creation system
      const commentData: CommentCreateRequest = {
        content: inlineReplyContent.trim(),
        parentId: comment.id
      };
      
      await onCreateComment(commentData);
      
      // Reset the inline reply state
      setShowInlineReply(false);
      setInlineReplyContent('');
      
      // Show success feedback
      toast.success('Reply posted successfully!');
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply. Please try again.');
    }
  };

  const handleInlineReplyCancel = () => {
    setShowInlineReply(false);
    setInlineReplyContent('');
  };

  const isOwnComment = comment.author?.id === userId;
  const maxLevel = 3; // Maximum nesting level

  return (
    <div className={cn("", className)}>
      {/* Threading line for nested comments */}
      {level > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
      )}
      
      <div className={cn(
        "flex gap-2 py-1",
        level > 0 && "ml-4"
      )}>
        <div className="relative">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={comment.author?.image || ''} alt={comment.author?.name || 'User'} />
            <AvatarFallback className="text-xs">
              {comment.author?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <PresenceIndicator 
            userId={comment.author?.id || ''} 
            size="sm" 
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Comment Content - Simple like Facebook */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-medium text-sm">{comment.author?.name || 'Unknown User'}</span>
              {comment.author?.role && (
                <Badge variant="secondary" className="text-xs h-4 px-1.5">
                  {comment.author?.role}
                </Badge>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your comment..."
                  className="min-h-[60px] text-sm border-0 bg-white dark:bg-gray-700 p-2"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave} className="h-7 px-3 text-xs">
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-7 px-3 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground leading-relaxed">
                {comment.content}
              </div>
            )}
          </div>

          {/* Action Row - Compact like Facebook */}
          <div className="flex items-center gap-4 px-1 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && " • edited"}
            </span>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-0 text-xs font-medium hover:bg-transparent",
                comment.isLiked ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onToggleLike(comment.id)}
            >
              Like
              {comment._count.likes > 0 && <span className="ml-1">({comment._count.likes})</span>}
            </Button>

            {level < maxLevel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={handleInlineReply}
              >
                {showInlineReply ? "Cancel" : "Reply"}
              </Button>
            )}

            {isOwnComment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-28">
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs py-1">
                    <Edit2 className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive text-xs py-1"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Inline Reply Input - Compact */}
      {showInlineReply && (
        <div className="mt-2 ml-8">
          <div className="flex items-start gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={""} alt="You" />
              <AvatarFallback className="text-xs">U</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={inlineReplyContent}
                onChange={(e) => setInlineReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleInlineReplyCancel();
                  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (inlineReplyContent.trim()) {
                      handleInlineReplySubmit();
                    }
                  }
                }}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="min-h-[50px] text-sm resize-none bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-3 py-2"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInlineReplyCancel}
                  className="h-7 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleInlineReplySubmit}
                  disabled={!inlineReplyContent.trim()}
                  className="h-7 px-3 text-xs"
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nested replies - Simple like Facebook */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1">
          {/* Show/Hide replies button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground ml-8"
            onClick={() => onToggleExpansion?.(comment.id)}
          >
            <ChevronDown className={cn(
              "h-3 w-3 mr-1 transition-transform",
              expandedComments.has(comment.id) && "rotate-180"
            )} />
            {expandedComments.has(comment.id) 
              ? `Hide ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
              : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
            }
          </Button>
          
          {/* Nested replies */}
          {expandedComments.has(comment.id) && (
            <div className="ml-6">
              {comment.replies.map((reply) => (
                <NestedCommentErrorBoundary
                  key={`nested-error-boundary-${reply.id}`}
                  commentId={reply.id}
                  parentCommentId={comment.id}
                  level={level + 1}
                  onError={(error, errorInfo) => {
                    console.error(`Error rendering nested comment ${reply.id}:`, error, errorInfo);
                  }}
                >
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    userId={userId}
                    level={level + 1}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleLike={onToggleLike}
                    expandedComments={expandedComments}
                    onToggleExpansion={onToggleExpansion}
                    onLoadMoreReplies={onLoadMoreReplies}
                    loadingReplies={loadingReplies}
                    onCreateComment={onCreateComment}
                  />
                </NestedCommentErrorBoundary>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(comment.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default function CommentSection({
  postId,
  userId,
  className,
  showCount = 5,
}: CommentSectionProps) {
  console.log('🐛 CommentSection rendered:', { postId, userId, enabled: true });
  
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Production-ready: State for collapse/expand functionality
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  // Use the unified comments hook
  const {
    comments,
    loading,
    error,
    submitting,
    hasMore,
    createComment,
    updateComment,
    deleteComment,
    toggleLike,
    loadMore,
    clearError
  } = useComments({
    postId,
    enabled: true
  });

  console.log('🐛 Comments hook state:', { 
    commentsCount: comments.length, 
    loading, 
    error: error?.message, 
    submitting,
    hasMore 
  });

  // 🎯 ADDED: Typing indicator hook for comment typing
  const { emitTyping, emitStoppedTyping } = useTypingIndicator(postId);

  // 🎯 PRODUCTION FIX: Get current user data from NextAuth session instead of API call
  // This eliminates the recurring 404 errors from /api/user/profile
  const { data: session } = useSession();
  const currentUser = session?.user;

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      const commentData: CommentCreateRequest = {
        content: newComment.trim(),
        parentId: replyToId || undefined
      };
      
      // Store the parent ID to auto-expand after submission
      const parentId = replyToId;
      
      await createComment(commentData);
      setNewComment('');
      setReplyToId(null);
      
      // Auto-expand the parent comment after creating a reply
      if (parentId && !expandedComments.has(parentId)) {
        setTimeout(() => {
          toggleCommentExpansion(parentId);
        }, 500); // Small delay to allow the comment to be added
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToId(commentId);
    // Auto-expand the comment being replied to so user can see the context
    if (!expandedComments.has(commentId)) {
      toggleCommentExpansion(commentId);
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, { content });
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      await toggleLike(commentId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  // Production-ready: Toggle comment expansion for nested replies
  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Production-ready: Load more replies for nested comments (future enhancement)
  const loadMoreReplies = async (commentId: string) => {
    setLoadingReplies(prev => new Set(prev).add(commentId));
    
    try {
      // Future implementation: Load paginated replies
      // This would call an API endpoint to load more nested replies
      console.log(`Loading more replies for comment: ${commentId}`);
      
      // Placeholder for future API call
      // await loadNestedReplies(commentId, page, limit);
      
    } catch (error) {
      console.error('Error loading more replies:', error);
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const visibleComments = showAll ? comments : comments.slice(0, showCount);
  const hasMoreComments = comments.length > showCount;

  if (loading && comments.length === 0) {
    return (
      <div className={cn("", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Error Display */}
      {error && (
        <Alert className="mb-2" variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error.message}
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Comments List - Compact */}
      {comments.length > 0 && (
        <div className="space-y-1">
          {visibleComments.map((comment) => (
            <CommentErrorBoundary 
              key={`error-boundary-${comment.id}`}
              commentId={comment.id}
              onError={(error, errorInfo) => {
                console.error(`Error rendering comment ${comment.id}:`, error, errorInfo);
              }}
            >
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={userId}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleLike={handleToggleLike}
                expandedComments={expandedComments}
                onToggleExpansion={toggleCommentExpansion}
                onLoadMoreReplies={loadMoreReplies}
                loadingReplies={loadingReplies}
                onCreateComment={createComment}
              />
            </CommentErrorBoundary>
          ))}

          {hasMoreComments && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(true)}
              className="text-muted-foreground text-xs h-auto p-1 font-medium"
            >
              View {comments.length - showCount} more comments
            </Button>
          )}

          {hasMore && showAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loading}
              className="text-muted-foreground text-xs h-auto p-1 font-medium"
            >
              {loading ? 'Loading...' : 'Load more comments'}
            </Button>
          )}
        </div>
      )}

      {/* Typing Indicator */}
      <TypingIndicator 
        postId={postId}
        currentUserId={userId}
        className="py-1"
      />

      {/* Comment Input - Compact */}
      <div className="mt-2">
        {replyToId && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Replying to comment
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyToId(null)}
                className="h-auto p-0 text-blue-600 hover:text-blue-800"
              >
                ×
              </Button>
            </div>
            {/* Show preview of comment being replied to */}
            {(() => {
              const parentComment = comments.find(c => c.id === replyToId) || 
                comments.flatMap(c => c.replies || []).find(r => r.id === replyToId);
              return parentComment ? (
                <div className="text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900 p-2 rounded border">
                  <span className="font-medium">{parentComment.author?.name}: </span>
                  {parentComment.content.length > 100 
                    ? `${parentComment.content.substring(0, 100)}...` 
                    : parentComment.content
                  }
                </div>
              ) : null;
            })()}
          </div>
        )}

        <div className="flex gap-2 items-start">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage 
              src={currentUser?.image || ''} 
              alt={currentUser?.name || 'You'} 
            />
            <AvatarFallback className="text-xs">
              {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                if (e.target.value.length > 0) {
                  emitTyping();
                } else {
                  emitStoppedTyping();
                }
              }}
              placeholder={replyToId ? "Write a reply..." : "Write a comment..."}
              className="min-h-[40px] text-sm resize-none bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-3 py-2"
              disabled={submitting}
            />

            <div className="flex justify-end gap-2 mt-2">
              {replyToId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyToId(null)}
                  disabled={submitting}
                  className="h-7 px-3 text-xs"
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="h-7 px-3 text-xs"
              >
                {submitting ? 'Posting...' : (replyToId ? 'Reply' : 'Post')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
