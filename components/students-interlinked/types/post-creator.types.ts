/**
 * @fileoverview Students Interlinked Types - Post Creator and Poll System
 * @module StudentsInterlinked/Types
 * @category Social
 */

export interface PollOption {
  id?: string; // Optional for new options
  text: string;
  imageUrl?: string;
  voteCount?: number;
  hasVoted?: boolean;
}

export interface Poll {
  id?: string; // Optional for new polls
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  expiresAt?: string; // ISO date string
  isAnonymous: boolean;
  isEducational: boolean;
  correctAnswer?: string[]; // Option IDs that are correct
  explanation?: string;
  totalVotes?: number;
  hasVoted?: boolean;
  userVotes?: string[]; // Option IDs user voted for
}

export interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  name: string;
  size: number;
  thumbnail?: string;
  file?: File; // Store the actual File object for upload
  uploadProgress?: number; // Upload progress percentage
}

export interface EducationalContext {
  courseId?: string;
  subject?: string;
  academicLevel?: 'UNDERGRADUATE' | 'GRADUATE' | 'POSTGRADUATE' | 'PROFESSIONAL';
  tags?: string[];
}

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string;
  verified: boolean;
  profile?: {
    major?: string;
    academicLevel?: string;
    institution?: string;
  };
}

export interface PostComment {
  id: string;
  content: string;
  author: PostAuthor;
  likes: any[];
  createdAt: string;
}

export interface PostLike {
  id: string;
  type: string;
  user: PostAuthor;
}

export interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  educationalContext?: EducationalContext;
  visibility: 'PUBLIC' | 'FRIENDS' | 'GROUPS';
  allowComments: boolean;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'POLL';
  poll?: Poll;
  author: PostAuthor;
  likes: PostLike[];
  comments: PostComment[];
  _count: {
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content: string;
  mediaUrls?: string[];
  groupId?: string;
  educationalContext?: EducationalContext;
  visibility?: 'PUBLIC' | 'FRIENDS' | 'GROUPS';
  allowComments?: boolean;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'POLL';
  poll?: {
    question: string;
    options: { text: string; imageUrl?: string }[];
    allowMultiple?: boolean;
    expiresAt?: string;
    isAnonymous?: boolean;
    isEducational?: boolean;
    correctAnswer?: string[];
    explanation?: string;
  };
}

export interface PostCreatorUIState {
  // Content state
  content: string;
  media: MediaFile[];
  
  // Post type state
  activePostType: 'TEXT' | 'MEDIA' | 'POLL';
  
  // Poll state
  pollQuestion: string;
  pollOptions: PollOption[];
  pollSettings: {
    allowMultiple: boolean;
    expiresAt?: string;
    isAnonymous: boolean;
    isEducational: boolean;
    correctAnswer: string[];
    explanation: string;
  };
  
  // UI state
  showEducationalContext: boolean;
  showPollSettings: boolean;
  isSubmitting: boolean;
  errors: string[];
  
  // Educational context
  educationalContext?: EducationalContext;
}

export type PostCreatorMode = 'expanded' | 'compact' | 'modal';

export interface PostCreatorProps {
  userId: string;
  userImage?: string;
  userName?: string;
  groupId?: string; // Add support for group posts
  onPostCreated?: (post: Post) => void;
  placeholder?: string;
  className?: string;
  mode?: PostCreatorMode;
  maxCharacters?: number;
  allowedPostTypes?: ('TEXT' | 'MEDIA' | 'POLL')[];
}
