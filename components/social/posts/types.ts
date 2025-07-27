/**
 * @fileoverview Facebook-Style Post System Types
 * @module SocialPosts/Types
 * @category Social
 */

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface Reaction {
  id: string;
  type: ReactionType;
  userId: string;
  user: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
  createdAt: string;
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    filename?: string;
  };
}

export interface PostMention {
  id: string;
  username: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

export interface PostLocation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    votes: number;
    voters: string[];
  }[];
  allowMultiple: boolean;
  expiresAt?: string;
  totalVotes: number;
}

export interface FacebookPost {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    username: string;
    image?: string;
    verified?: boolean;
    isOnline?: boolean;
  };
  
  // Media
  media: PostMedia[];
  
  // Social Features
  mentions: PostMention[];
  hashtags: string[];
  location?: PostLocation;
  
  // Post Types
  type: 'text' | 'photo' | 'video' | 'link' | 'poll' | 'event' | 'shared' | 'feeling';
  postType: 'GENERAL' | 'STUDY_HELP' | 'PROJECT_SHARE' | 'ACHIEVEMENT' | 'EVENT_SHARE' | 'RESOURCE_SHARE';
  
  // Privacy & Visibility
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CUSTOM';
  allowComments: boolean;
  allowReactions: boolean;
  allowShares: boolean;
  
  // Educational Context
  educationalContext?: string;
  courseId?: string;
  studyGroupId?: string;
  tags: string[];
  
  // Content
  poll?: Poll;
  sharedPost?: FacebookPost;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  };
  
  // Engagement
  reactions: {
    total: number;
    breakdown: Record<ReactionType, number>;
    userReaction?: ReactionType;
    recent: Reaction[];
  };
  
  comments: {
    total: number;
    preview: FacebookComment[];
  };
  
  shares: {
    total: number;
    recent: {
      id: string;
      userId: string;
      user: {
        name: string;
        username: string;
        image?: string;
      };
      createdAt: string;
    }[];
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'DELETED';
  
  // Analytics
  viewCount: number;
  engagementRate: number;
  
  // User Actions
  isBookmarked: boolean;
  isFollowing: boolean;
  isHidden: boolean;
  isReported: boolean;
}

export interface FacebookComment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  parentId?: string; // For nested comments
  
  user: {
    id: string;
    name: string;
    username: string;
    image?: string;
    verified?: boolean;
  };
  
  // Media in comments
  media?: PostMedia[];
  mentions: PostMention[];
  
  // Engagement
  reactions: {
    total: number;
    breakdown: Record<ReactionType, number>;
    userReaction?: ReactionType;
  };
  
  // Nested structure
  replies: {
    total: number;
    comments: FacebookComment[];
    hasMore: boolean;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  isDeleted: boolean;
  
  // User actions
  isLiked: boolean;
  isPinned: boolean;
  isReported: boolean;
}

export interface PostFormData {
  content: string;
  media: File[];
  mentions: PostMention[];
  hashtags: string[];
  location?: PostLocation;
  type: FacebookPost['type'];
  postType: FacebookPost['postType'];
  visibility: FacebookPost['visibility'];
  allowComments: boolean;
  allowReactions: boolean;
  allowShares: boolean;
  educationalContext?: string;
  courseId?: string;
  studyGroupId?: string;
  tags: string[];
  poll?: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    expiresIn?: number; // hours
  };
  scheduledAt?: Date;
  isDraft: boolean;
}

export interface PostFilters {
  postType?: FacebookPost['postType'];
  visibility?: FacebookPost['visibility'];
  hasMedia?: boolean;
  hasPolls?: boolean;
  authorId?: string;
  courseId?: string;
  studyGroupId?: string;
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy: 'newest' | 'oldest' | 'mostEngaged' | 'trending';
}

export interface PostInteractionState {
  reactions: {
    isOpen: boolean;
    selectedType?: ReactionType;
    isLoading: boolean;
  };
  comments: {
    isOpen: boolean;
    isLoading: boolean;
    newComment: string;
    replyTo?: string;
    editingId?: string;
  };
  sharing: {
    isOpen: boolean;
    isLoading: boolean;
    content: string;
    privacy: FacebookPost['visibility'];
  };
}
