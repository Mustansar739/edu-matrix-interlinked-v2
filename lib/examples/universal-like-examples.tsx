// ==========================================
// UNIVERSAL LIKE EXAMPLES - HOW TO USE IN ANY MODULE
// ==========================================
// 
// ⚠️ MIGRATION NOTICE: Updated to use useUnifiedLikes instead of useUniversalLike
// This ensures consistency with the production unified like system
// 
// UPDATED: 2025-01-07 - Migrated to unified like system
// ==========================================

import { useUnifiedLikes } from '@/hooks/useUnifiedLikes';
import { CourseCardProps, NewsCardProps, JobCardProps } from '@/lib/types/universal-like';

// ==========================================
// EXAMPLE 1: COURSES MODULE - UPDATED FOR UNIFIED LIKE SYSTEM
// ==========================================
export function CourseCard({ course }: CourseCardProps) {
  const { 
    isLiked, 
    likeCount, 
    toggleLike, 
    setReaction,
    isLoading 
  } = useUnifiedLikes({
    contentType: 'project', // Using 'project' as closest match for courses
    contentId: course.id,
    initialState: {
      isLiked: course.isLiked,
      count: course.likeCount
    },
    recipientId: course.authorId,
    schemaName: 'courses_schema'
  });

  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      
      <div className="like-section">
        <button 
          onClick={toggleLike}
          disabled={isLoading}
          className={`like-btn ${isLiked ? 'liked' : ''}`}
        >
          {isLiked ? '❤️' : '🤍'} {likeCount}
        </button>
        
        <button onClick={() => setReaction('helpful')}>
          💡 Helpful
        </button>
      </div>
    </div>
  );
}

// ==========================================
// EXAMPLE 2: NEWS MODULE  
// ==========================================
export function NewsCard({ article }: NewsCardProps) {
  const { 
    isLiked, 
    likeCount, 
    toggleLike,
    setReaction,
    isLoading
  } = useUnifiedLikes({
    contentType: 'post', // Using 'post' for news articles
    contentId: article.id,
    initialState: {
      isLiked: article.userHasLiked,
      count: article.totalLikes
    },
    recipientId: article.authorId,
    schemaName: 'news_schema'
  });

  return (
    <div className="news-card">
      <h2>{article.headline}</h2>
      
      <div className="engagement-bar">
        <button onClick={toggleLike}>
          {isLiked ? '👍' : '👍🏻'} {likeCount}
        </button>
        
        <div className="reactions">
          <button onClick={() => setReaction('helpful')}>
            🎯 Helpful
          </button>
          <button onClick={() => setReaction('love')}>
            💡 Love
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EXAMPLE 3: JOBS MODULE
// ==========================================
export function JobCard({ job }: JobCardProps) {
  const { 
    isLiked, 
    likeCount, 
    toggleLike,
    isLoading
  } = useUnifiedLikes({
    contentType: 'project', // Using 'project' for job postings
    contentId: job.id,
    initialState: {
      isLiked: job.isBookmarked,
      count: job.interestedCount
    },
    recipientId: job.posterId,
    schemaName: 'jobs_schema'
  });

  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      
      <button 
        onClick={toggleLike}
        className={`bookmark-btn ${isLiked ? 'bookmarked' : ''}`}
      >
        {isLiked ? '⭐ Saved' : '💾 Save'} ({likeCount})
      </button>
    </div>
  );
}

// ==========================================
// EXAMPLE 4: FREELANCING MODULE
// ==========================================
export function FreelanceProjectCard({ project }: { project: any }) {
  const { 
    isLiked, 
    likeCount, 
    toggleLike,
    setReaction,
    isLoading
  } = useUnifiedLikes({
    contentType: 'project',
    contentId: project.id,
    initialState: {
      isLiked: project.isLiked,
      count: project.likesCount
    },
    recipientId: project.clientId,
    schemaName: 'freelancing_schema'
  });

  return (
    <div className="project-card">
      <h3>{project.title}</h3>
      
      <div className="actions">
        <button onClick={toggleLike}>
          {isLiked ? '💖' : '🤍'} {likeCount}
        </button>
        
        <button onClick={() => setReaction('helpful')}>
          💡 Helpful
        </button>
        
        <button onClick={() => setReaction('wow')}>
          🎯 Great Project
        </button>
      </div>
    </div>
  );
}

// ==========================================
// EXAMPLE 5: COMMUNITY POSTS
// ==========================================
export function CommunityPost({ post }: { post: any }) {
  const { 
    isLiked, 
    likeCount, 
    toggleLike,
    userReaction,
    setReaction,
    isLoading
  } = useUnifiedLikes({
    contentType: 'post',
    contentId: post.id,
    initialState: {
      isLiked: post.isLiked,
      count: post.likeCount,
      userReaction: post.userReaction
    },
    recipientId: post.authorId,
    schemaName: 'community_schema'
  });

  return (
    <div className="community-post">
      <p>{post.content}</p>
      
      <div className="reaction-bar">
        <button 
          onClick={toggleLike}
          className={userReaction ? `reacted-${userReaction}` : ''}
        >
          {userReaction ? getReactionEmoji(userReaction) : '👍'} {likeCount}
        </button>
        
        <div className="reaction-picker">
          {['like', 'love', 'laugh', 'wow', 'sad'].map(reaction => (
            <button 
              key={reaction}
              onClick={() => setReaction(reaction as any)}
            >
              {getReactionEmoji(reaction)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function
function getReactionEmoji(reaction: string): string {
  const emojis: Record<string, string> = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    helpful: '💡',
    insightful: '🎯'
  };
  return emojis[reaction] || '👍';
}
