/**
 * Unified Comment Types for Production System
 * 
 * Purpose: Standardize comment data structure across all systems
 * - API responses
 * - Socket.IO events  
 * - Frontend components
 * - Database operations
 * 
 * This eliminates data transformation conflicts and ensures type safety
 */

export interface CommentAuthor {
  id: string;
  name: string;
  username?: string;
  image?: string | null;
  role?: 'student' | 'teacher' | 'tutor' | 'admin' | 'other';
  verified?: boolean;
  profession?: string;
}

export interface CommentCounts {
  likes: number;
  replies: number;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  parentId?: string | null;
  
  // Author information (unified structure)
  author: CommentAuthor;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // User interaction state
  isLiked: boolean;
  
  // Counts
  _count: CommentCounts;
  
  // Nested replies (same structure)
  replies?: Comment[];
  
  // Optional media attachments
  imageUrls?: string[];
  
  // Moderation flags
  reported?: boolean;
  pinned?: boolean;
  edited?: boolean;
}

export interface CommentCreateRequest {
  content: string;
  parentId?: string;
  imageUrls?: string[];
}

export interface CommentUpdateRequest {
  content: string;
}

export interface CommentListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Socket.IO Event Types
export interface CommentSocketEvents {
  // Outgoing events (client to server)
  'comment:create': {
    postId: string;
    content: string;
    parentId?: string;
  };
  
  'comment:update': {
    commentId: string;
    content: string;
  };
  
  'comment:delete': {
    commentId: string;
  };
  
  'comment:like': {
    commentId: string;
    liked: boolean;
  };
  
  // Incoming events (server to client)
  'comment:created': {
    postId: string;
    comment: Comment;
  };
  
  'comment:updated': {
    postId: string;
    commentId: string;
    comment: Comment;
  };
  
  'comment:deleted': {
    postId: string;
    commentId: string;
  };
  
  'comment:liked': {
    postId: string;
    commentId: string;
    isLiked: boolean;
    likeCount: number;
  };
}

// Error types
export interface CommentError {
  type: 'VALIDATION_ERROR' | 'PERMISSION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR';
  message: string;
  details?: any;
}

// Hook state interface
export interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: CommentError | null;
  submitting: boolean;
  hasMore: boolean;
  page: number;
}
