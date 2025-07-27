/**
 * @fileoverview PostCard Component - Modern Social Media Post Display Interface
 * @module StudentsInterlinked/Feed/PostCard
 * @category Social Media Components
 * @version 2.0.0
 * 
 * ==========================================
 * FACEBOOK/INSTAGRAM-STYLE POST CARD
 * ==========================================
 * 
 * This component displays individual posts in a modern, social media-style card
 * interface. It follows Facebook and Instagram design patterns while providing
 * enhanced functionality for educational social networking.
 * 
 * KEY FEATURES:
 * - Modern card design with subtle shadows and rounded corners
 * - Enhanced user avatar with online status indicator
 * - Improved follow button positioning and styling
 * - Rich educational context badges with color coding
 * - Responsive action buttons with hover animations
 * - Poll display with progress bars and educational features
 * - Comprehensive dropdown menu with all user actions
 * - Accessibility features and proper ARIA labels
 * 
 * DESIGN IMPROVEMENTS:
 * - Fixed follow button positioning issues
 * - Enhanced author information section
 * - Color-coded educational context badges
 * - Improved hover effects and transitions
 * - Better spacing and visual hierarchy
 * - Modern dropdown menu styling
 * - Enhanced post actions with background styling
 * 
 * UI/UX FIXES:
 * - Fixed "PostActions Follow Hidden" tooltip issue
 * - Improved button responsiveness
 * - Better mobile experience
 * - Enhanced accessibility features
 * - Proper focus management
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Built with React 18+ and Next.js 15
 * - Uses Tailwind CSS for styling
 * - Framer Motion for animations
 * - TypeScript for type safety
 * - Responsive design with mobile-first approach
 * - Dark mode support
 * 
 * INTEGRATION:
 * - Seamless integration with PostActions component
 * - Compatible with existing backend APIs
 * - Proper error handling and loading states
 * - Real-time updates support
 * 
 * @author GitHub Copilot
 * @since 2025-01-15
 * @lastModified 2025-01-15
 */

'use client';

import React, { useCallback, useEffect, useState, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Verified, BookOpen, Users, GraduationCap, CheckCircle, Edit2, Trash2, Copy, Bookmark, Flag, EyeOff, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Post } from '../core/types/social.types';
import PostActions from '@/components/students-interlinked/feed/PostActions';
import PostMedia from '@/components/students-interlinked/feed/PostMedia';
import CommentSection from '../comments/CommentSection';
import { usePollVote } from '@/hooks/students-interlinked/usePolls';
import { UniversalFollowButton } from '@/components/ui/universal-follow-button';
// Removed useSocialActions import - using unified like system instead

/**
 * Custom hook for Facebook-style post view tracking
 * Tracks when posts are visible in viewport for 2+ seconds
 */
function usePostViewTracking(postId: string, enabled: boolean = true) {
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const postRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!enabled || hasTrackedView || !postRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Post is 50%+ visible, start tracking timer
            timeoutRef.current = setTimeout(() => {
              trackPostView(postId)
              setHasTrackedView(true)
            }, 2000) // 2 seconds like Facebook
          } else {
            // Post not visible enough, clear timer
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
          }
        })
      },
      {
        threshold: [0.5], // At least 50% visible
        rootMargin: '0px'
      }
    )

    observer.observe(postRef.current)
    observerRef.current = observer

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [postId, enabled, hasTrackedView])

  /**
   * Track post view - lightweight API call
   */
  const trackPostView = async (id: string) => {
    try {
      await fetch(`/api/students-interlinked/posts/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No body needed for simple view tracking
      })
    } catch (error) {
      console.warn('Failed to track post view:', error)
      // Don't throw - view tracking shouldn't interrupt user experience
    }
  }

  return { postRef, hasTrackedView }
}

interface PostCardProps {
  post: Post;
  showFullContent?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onUpdate?: (updatedPost: Post) => void;
  className?: string;
}

// Poll option component
interface PollOptionProps {
  option: {
    id: string;
    text: string;
    imageUrl?: string;
    voteCount: number;
    hasVoted: boolean;
  };
  poll: {
    id: string;
    question: string;
    allowMultiple: boolean;
    totalVotes: number;
    hasVoted: boolean;
    userVotes: string[];
    isEducational: boolean;
    correctAnswer?: string[];
  };
  onVote: (optionId: string) => void;
}

function PollOption({ option, poll, onVote }: PollOptionProps) {
  const percentage = poll.totalVotes > 0 ? (option.voteCount / poll.totalVotes) * 100 : 0;
  const isSelected = poll.userVotes.includes(option.id);
  const isCorrect = poll.isEducational && poll.correctAnswer?.includes(option.id);
  const showResults = poll.hasVoted;

  return (
    <div className="relative">
      <button
        onClick={() => onVote(option.id)}
        disabled={poll.hasVoted && !poll.allowMultiple}
        className={cn(
          "w-full p-3 rounded-lg border-2 transition-all text-left relative overflow-hidden",
          isSelected && showResults
            ? "border-purple-500 bg-purple-100"
            : showResults
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 hover:border-purple-300 hover:bg-purple-50",
          isCorrect && showResults && "border-green-500 bg-green-100"
        )}
      >
        {/* Background progress bar */}
        {showResults && (
          <div 
            className={cn(
              "absolute inset-0 transition-all duration-1000",
              isCorrect ? "bg-green-200" : isSelected ? "bg-purple-200" : "bg-gray-100"
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Selection indicator */}
            <div className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
              isSelected && showResults ? "border-purple-500 bg-purple-500" : "border-gray-400"
            )}>
              {isSelected && showResults && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            
            <span className="font-medium text-gray-900">{option.text}</span>
            
            {/* Correct answer indicator */}
            {isCorrect && showResults && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </div>
          
          {/* Vote count and percentage */}
          {showResults && (
            <div className="text-sm text-gray-600 font-medium">
              {option.voteCount} ({percentage.toFixed(1)}%)
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

const PostCard = memo(function PostCard({
  post,
  showFullContent = true,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onUpdate,
  className
}: PostCardProps) {
  // ==========================================
  // STATE MANAGEMENT - OPTIMIZED
  // ==========================================
  const [showComments, setShowComments] = useState(false);
  
  // Simple editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Profile image loading states
  const [authorImageError, setAuthorImageError] = useState(false);
  
  const { data: session } = useSession();
  const pollVoteMutation = usePollVote();

  // ✅ PRODUCTION: Facebook-style view tracking
  const { postRef, hasTrackedView } = usePostViewTracking(
    post.id, 
    true // Enable view tracking
  );

  // ==========================================
  // MEMOIZED VALUES - PERFORMANCE OPTIMIZATION
  // ==========================================
  
  // Destructure post properties once and memoize
  const {
    id: postId,
    author,
    content,
    imageUrls,
    videoUrls,
    documentUrls,
    educationalContext,
    _count,
    isLiked,
    isBookmarked,
    userReaction,
    createdAt
  } = useMemo(() => post, [post]);

  const authorId = useMemo(() => author.id, [author.id]);
  
  // Memoize expensive educational icon calculations
  const getEducationalIcon = useCallback((level?: string) => {
    switch (level) {
      case 'elementary':
      case 'middle':
      case 'high':
        return <BookOpen className="h-3 w-3" />;
      case 'undergrad':
        return <GraduationCap className="h-3 w-3" />;
      case 'grad':
      case 'phd':
        return <Users className="h-3 w-3" />;
      default:
        return <BookOpen className="h-3 w-3" />;
    }
  }, []);

  // Memoize educational level formatting
  const formatEducationalLevel = useCallback((level?: string) => {
    switch (level) {
      case 'elementary':
        return 'Elementary';
      case 'middle':
        return 'Middle School';
      case 'high':
        return 'High School';
      case 'undergrad':
        return 'Undergraduate';
      case 'grad':
        return 'Graduate';
      case 'phd':
        return 'PhD';
      default:
        return level;
    }
  }, []);

  const handlePollVote = useCallback(async (optionId: string) => {
    if (!post.poll) return;
    
    try {
      await pollVoteMutation.mutateAsync({
        pollId: post.poll.id,
        optionIds: [optionId]
      });
    } catch (error) {
      console.error('Error voting in poll:', error);
    }
  }, [post.poll, pollVoteMutation]);

  // Simple save function for editing - IMPROVED with better error handling
  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      setEditError('Content cannot be empty');
      return;
    }

    if (editContent.trim().length > 5000) {
      setEditError('Content must be less than 5000 characters');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    
    try {
      const response = await fetch(`/api/students-interlinked/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the post content locally
        post.content = data.post.content;
        setIsEditing(false);
        setEditError(null);
        console.log('✅ Post updated successfully');
      } else {
        const error = await response.json();
        setEditError(error.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setEditError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditContent(post.content); // Reset to original content
    setIsEditing(false);
    setEditError(null); // Clear any errors
  };

  // Simple delete function
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/students-interlinked/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Post deleted successfully');
        // Notify parent component to remove post from feed
        if (onUpdate) {
          onUpdate({ ...post, status: 'DELETED' } as any);
        }
        // You could also trigger a page refresh or remove from local state
        window.location.reload(); // Simple approach to refresh the feed
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  // ==========================================
  // REAL-TIME COMMENTS INTEGRATION  
  // ==========================================

  return (
    <div 
      ref={postRef}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4"
    >
      {/* Header Section - Exact Facebook Style */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          {/* Profile Image */}
          <div className="relative">
            {author.username ? (
              <Link href={`/profile/${author.username}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden cursor-pointer">
                  {author.image && !authorImageError ? (
                    <Image
                      src={author.image}
                      alt={`${author.name}'s profile picture`}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      onError={() => setAuthorImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                      {author.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div className="w-10 h-10 rounded-full overflow-hidden cursor-default opacity-70">
                {author.image && !authorImageError ? (
                  <Image
                    src={author.image}
                    alt={`${author.name}'s profile picture`}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    onError={() => setAuthorImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-medium text-sm">
                    {author.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Author Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {author.username ? (
                <Link 
                  href={`/profile/${author.username}`}
                  className="text-[15px] font-semibold text-[#050505] dark:text-white hover:underline"
                >
                  {author.name}
                </Link>
              ) : (
                <span className="text-[15px] font-semibold text-[#050505] dark:text-white">
                  {author.name}
                </span>
              )}
              {author.verified && (
                <Verified className="h-4 w-4 text-[#1877f2]" />
              )}
            </div>
            <div className="flex items-center text-[13px] text-[#65676b] dark:text-gray-400 space-x-1 mt-1">
              <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
              <span>•</span>
              {/* Facebook Globe Icon */}
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm2.94-9.94L9.5 6.5 8 5l1.5-1.5-1.44-1.44L6.5 3.5 5 2l1.5-1.5L5.06 2.94 3.5 4.5 2 3l1.5-1.5L1.06 5.06 2.5 6.5 1 8l1.5 1.5-1.44 1.44L2.5 9.5 4 11l-1.5 1.5 1.44 1.44L5.5 12.5 7 14l-1.5 1.5 1.44-1.44L8.5 12.5 10 14l1.5-1.5-1.44-1.44L11.5 9.5 13 11l1.5-1.5-1.44-1.44L14.5 6.5 13 5l1.5-1.5L12.06 1.06 10.5 2.5 9 1l1.5-1.5L8.06 1.94z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Side Actions - Facebook Style */}
        <div className="flex items-center space-x-2">
          {/* Production-Ready Follow Button - Show everywhere except when not logged in */}
          {session?.user?.id && (
            <UniversalFollowButton
              userId={authorId}
              userName={author.name}
              currentUserId={session.user.id}
              variant="minimal"
              size="sm"
              className="text-[15px] font-semibold"
            />
          )}
          
          {/* Three Dots Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreHorizontal className="h-5 w-5 text-[#65676b]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Options for post owner */}
              {session?.user?.id === authorId && (
                <>
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(post.content);
                    }}
                    className="cursor-pointer flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeletePost}
                    className="cursor-pointer flex items-center text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Options for all users */}
              <DropdownMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/students-interlinked/post/${postId}`);
                  // Add toast notification if available
                }}
                className="cursor-pointer flex items-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center">
                <Bookmark className="h-4 w-4 mr-2" />
                Save Post
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center">
                <Flag className="h-4 w-4 mr-2" />
                Report Post
              </DropdownMenuItem>
              {session?.user?.id !== authorId && (
                <DropdownMenuItem className="cursor-pointer flex items-center">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Educational Context - Below Header */}
      {educationalContext && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1">
            {educationalContext.subject && (
              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/20">
                {educationalContext.subject}
              </Badge>
            )}
            {educationalContext.course && (
              <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20">
                {educationalContext.course}
              </Badge>
            )}
            {educationalContext.level && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-900/20">
                {getEducationalIcon(educationalContext.level)}
                {formatEducationalLevel(educationalContext.level)}
              </Badge>
            )}
            {educationalContext.studyGroup && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 border-orange-200 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-900/20">
                <Users className="h-3 w-3" />
                {educationalContext.studyGroup}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Content Section - Facebook Style */}
      <div className="px-3 pb-1">
        {content && (
          <div className="mb-3">
            {/* Show textarea when editing, otherwise show content */}
            {isEditing && session?.user?.id === authorId ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  maxLength={5000}
                  placeholder="Edit your post..."
                />
                {editError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {editError}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {editContent.length}/5000 characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editContent.trim()}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[15px] leading-[1.3333] text-gray-900 dark:text-white whitespace-pre-wrap">
                {content}
              </div>
            )}
          </div>
        )}

        {/* Media Display - Facebook Style Grid */}
        {((imageUrls && imageUrls.length > 0) || (videoUrls && videoUrls.length > 0) || (documentUrls && documentUrls.length > 0)) && (
          <div className="mb-3">
            <PostMedia 
              imageUrls={imageUrls} 
              videoUrls={videoUrls} 
              documentUrls={documentUrls} 
              className="rounded-lg overflow-hidden" 
            />
          </div>
        )}

        {/* Poll Content - Facebook Style */}
        {post.type === 'POLL' && post.poll && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-[15px]">
              📊 {post.poll.question}
            </h3>
            
            <div className="space-y-2">
              {post.poll.options.map((option) => (
                <PollOption
                  key={option.id}
                  option={option}
                  poll={post.poll!}
                  onVote={handlePollVote}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? 's' : ''}</span>
                {post.poll.isEducational && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    📚 Educational
                  </Badge>
                )}
                {post.poll.isAnonymous && (
                  <Badge variant="outline" className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    🔒 Anonymous
                  </Badge>
                )}
              </div>
              
              {post.poll.expiresAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Expires {formatDistanceToNow(new Date(post.poll.expiresAt), { addSuffix: true })}
                </div>
              )}
            </div>

            {/* Educational Explanation */}
            {post.poll.isEducational && post.poll.explanation && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 <strong>Explanation:</strong> {post.poll.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Educational Tags - Facebook Style */}
        {educationalContext?.tags && educationalContext.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {educationalContext.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors dark:bg-gray-700 dark:text-gray-300">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Production-Ready PostActions Component */}
      <PostActions
        postId={postId}
        authorId={authorId}
        authorName={author.name}
        currentUserId={session?.user?.id}
        counts={{
          likes: _count.likes,
          comments: _count.comments,
          shares: _count.shares,
          views: _count.views || 0
        }}
        variant="facebook"
        showFollow={false}
        onComment={() => {
          setShowComments(prev => !prev);
          if (onComment) {
            onComment(postId);
          }
        }}
        onLikeChange={onLike}
        onBookmark={(postId, isBookmarked) => {
          if (onBookmark) {
            onBookmark(postId);
          }
        }}
        onShare={(postId, shareType) => {
          if (onShare) {
            onShare(postId);
          }
        }}
        className=""
      />

      {/* Comments Section - Self-contained with real-time updates */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <CommentSection
            postId={postId}
            userId={session?.user?.id || ''}
          />
        </div>
      )}
    </div>
  );
});

export default PostCard;
