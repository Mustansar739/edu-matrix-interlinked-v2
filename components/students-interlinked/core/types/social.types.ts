// Social platform types for Students Interlinked

export interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  uploadProgress?: number;
  thumbnailUrl?: string;
  duration?: number; // for videos
  dimensions?: {
    width: number;
    height: number;
  };
  file?: File; // Store the actual File object for upload
}

export interface EducationalContext {
  subject?: string;
  course?: string;
  level?: 'elementary' | 'middle' | 'high' | 'undergrad' | 'grad' | 'phd';
  institution?: string;
  studyGroup?: string;
  tags?: string[];
}

// User type alias for compatibility
export type User = Author;

export interface Author {
  id: string;
  name: string;
  username?: string;  // Made optional to match backend
  image?: string;
  verified?: boolean;  // Made optional to match backend
  role?: 'student' | 'teacher' | 'tutor' | 'admin';
  institution?: string;
}

export interface Post {
  id: string;
  author: Author;
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  documentUrls?: string[];
  tags?: string[];
  academicLevel?: string;
  educationalContext?: EducationalContext;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'POLL';
  // Poll data if post type is POLL
  poll?: {
    id: string;
    question: string;
    allowMultiple: boolean;
    expiresAt?: string;
    isAnonymous: boolean;
    isEducational: boolean;
    correctAnswer?: string[];
    explanation?: string;
    totalVotes: number;
    options: Array<{
      id: string;
      text: string;
      imageUrl?: string;
      voteCount: number;
      hasVoted: boolean;
    }>;
    hasVoted: boolean;
    userVotes: string[];
  };
  _count: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;  // Made optional to match backend
  };
  reactions?: {
    [key: string]: number; // reaction type -> count
  };
  isLiked: boolean;
  isBookmarked: boolean;
  userReaction?: string;
  privacy: 'public' | 'friends' | 'private' | 'study-group' | 'groups';  // Added 'groups' for compatibility
  createdAt: string;
  updatedAt: string;
  editHistory?: {
    editedAt: string;
    previousContent: string;
  }[];
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  postId: string;
  parentId?: string; // for nested comments
  media?: MediaFile[];
  _count: {
    likes: number;
    replies: number;
  };
  isLiked: boolean;
  userReaction?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  mentions?: string[]; // user IDs mentioned in comment
}

export interface Story {
  id: string;
  author: Author;
  media: MediaFile[];
  educationalContext?: EducationalContext;
  _count: {
    likes: number;
    views: number;
    replies: number;
  };
  isLiked: boolean;
  userReaction?: string;
  hasViewed: boolean;
  expiresAt: string;
  createdAt: string;
  isHighlight: boolean;
  highlightTitle?: string;
  analytics?: {
    viewersCount: number;
    uniqueViewers: string[];
    engagementRate: number;
  };
}

// Updated Group interface (unified model for all group types)
export interface Group {
  id: string
  name: string
  description: string
  about?: string
  coverPhotoUrl?: string
  profilePhotoUrl?: string
  groupType: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  visibility: 'VISIBLE' | 'HIDDEN'
  category: string
  subcategory?: string
  tags: string[]
  memberCount: number
  postCount: number
  activeMembers: number
  isJoined: boolean
  userRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt?: string
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    posts: number
  }
}

// Legacy StudyGroup interface (deprecated - use Group instead)
// @deprecated Use Group interface instead
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  image?: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET'; // Updated to match new enum
  educationalContext?: EducationalContext; // Made optional
  _count: {
    members: number;
    posts: number;
    resources?: number; // Made optional
  };
  isJoined: boolean;
  role?: 'ADMIN' | 'MODERATOR' | 'MEMBER'; // Updated to match new enum
  createdAt: string;
  lastActivity?: string; // Made optional
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'social' | 'academic' | 'engagement' | 'milestone';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
  };
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'share' | 'mention' | 'follow' | 'achievement' | 'study-group';
  title: string;
  message: string;
  actor?: Author;
  entityType: 'post' | 'comment' | 'story' | 'study-group' | 'achievement';
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  image?: string;
  bio?: string;
  verified: boolean;
  role: 'student' | 'teacher' | 'tutor' | 'admin';
  institution?: string;
  educationalContext?: EducationalContext;
  _count: {
    posts: number;
    followers: number;
    following: number;
    totalLikes: number;
    achievements: number;
  };
  achievements: Achievement[];
  isFollowing: boolean;
  isBlocked: boolean;
  lastActive: string;
  joinedAt: string;
}

export interface Reaction {
  id: string;
  type: 'like' | 'love' | 'helpful' | 'insightful' | 'confused' | 'wow' | 'sad' | 'angry';
  emoji: string;
  label: string;
  color: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and search types
export interface PostFilters {
  educationalContext?: Partial<EducationalContext>;
  author?: string;
  hasMedia?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  sortBy?: 'recent' | 'popular' | 'trending' | 'relevant';
  privacy?: Post['privacy'][];
}

export interface SearchFilters extends PostFilters {
  query: string;
  type?: 'posts' | 'users' | 'study-groups' | 'all';
}

// Real-time event types
export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

export interface SocketEvents {
  'post:liked': { postId: string; userId: string; isLiked: boolean };
  'post:commented': { postId: string; comment: Comment };
  'story:viewed': { storyId: string; userId: string };
  'user:typing': { conversationId: string; userId: string; isTyping: boolean };
  'notification:new': Notification;
}

// Hook types
export interface UseUniversalLikeProps {
  entityType: 'post' | 'comment' | 'story';
  entityId: string;
  initialState?: {
    isLiked: boolean;
    count: number;
    userReaction?: string;
  };
}

export interface UseRealtimeProps {
  events: (keyof SocketEvents)[];
  onEvent?: (event: RealtimeEvent) => void;
}

export interface UseEducationalContextProps {
  defaultContext?: EducationalContext;
  required?: boolean;
}
