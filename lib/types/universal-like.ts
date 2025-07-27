// ==========================================
// UNIVERSAL LIKE TYPES - Shared Across All Modules
// ==========================================

export type EntityType = 'post' | 'comment' | 'story' | 'course' | 'news' | 'job' | 'freelance' | 'project' | 'achievement';

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'helpful' | 'insightful' | 'confused';

export interface UniversalLikeConfig {
  entityType: EntityType;
  entityId: string;
  initialState: {
    isLiked: boolean;
    count: number;
    userReaction?: string;
  };
  schemaName?: string;
  recipientId?: string;
}

export interface UniversalLikeReturn {
  isLiked: boolean;
  likeCount: number;
  userReaction: string | null;
  reactions: Record<string, number>;
  toggleLike: () => Promise<void>;
  setReaction: (type: ReactionType) => Promise<void>;
  removeReaction: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface LikeApiRequest {
  action: 'like' | 'unlike' | 'react' | 'unreact';
  reactionType?: ReactionType;
  schemaName?: string;
  recipientId?: string;
  metadata?: Record<string, any>;
}

export interface LikeApiResponse {
  success: boolean;
  liked: boolean;
  totalLikes: number;
  userReaction?: string;
  reactions?: Record<string, number>;
  error?: string;
}

// ==========================================
// USAGE EXAMPLES FOR DIFFERENT MODULES
// ==========================================

export interface CourseCardProps {
  course: {
    id: string;
    title: string;
    authorId: string;
    isLiked: boolean;
    likeCount: number;
  };
}

export interface NewsCardProps {
  article: {
    id: string;
    headline: string;
    authorId: string;
    userHasLiked: boolean;
    totalLikes: number;
  };
}

export interface JobCardProps {
  job: {
    id: string;
    title: string;
    posterId: string;
    isBookmarked: boolean;
    interestedCount: number;
  };
}

export interface FreelanceProjectProps {
  project: {
    id: string;
    title: string;
    clientId: string;
    isLiked: boolean;
    likesCount: number;
  };
}
