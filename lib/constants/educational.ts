/**
 * @fileoverview Educational Constants - Centralized Educational System Configuration
 * @module Constants/Educational
 * @version 1.0.0
 * 
 * ==========================================
 * EDUCATIONAL SYSTEM CONSTANTS
 * ==========================================
 * 
 * This file contains all educational-related constants used across the application.
 * Centralizing these constants prevents code duplication and ensures consistency.
 * 
 * PURPOSE:
 * - Prevent code duplication across components
 * - Ensure consistent educational terminology
 * - Provide type-safe educational configurations
 * - Enable easy maintenance and updates
 * 
 * USAGE:
 * ```typescript
 * import { EDUCATIONAL_SUBJECTS, EDUCATIONAL_LEVELS } from '@/lib/constants/educational'
 * ```
 * 
 * @author GitHub Copilot
 * @since 2025-07-22
 */

/**
 * Available academic subjects across all educational levels
 * Used for filtering, categorization, and context setting
 */
export const EDUCATIONAL_SUBJECTS = [
  'Mathematics',
  'Science', 
  'English',
  'History',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Literature',
  'Art',
  'Geography',
  'Economics',
  'Psychology',
  'Philosophy',
  'Engineering',
  'Medicine',
  'Law',
  'Business',
  'Music',
  'Physical Education'
] as const

/**
 * Educational levels with display labels and metadata
 * Provides structured data for level-based filtering and context
 */
export const EDUCATIONAL_LEVELS = [
  { 
    value: 'elementary', 
    label: 'Elementary School',
    description: 'Grades K-5 (Ages 5-11)',
    order: 1
  },
  { 
    value: 'middle', 
    label: 'Middle School',
    description: 'Grades 6-8 (Ages 11-14)', 
    order: 2
  },
  { 
    value: 'high', 
    label: 'High School',
    description: 'Grades 9-12 (Ages 14-18)',
    order: 3
  },
  { 
    value: 'undergrad', 
    label: 'Undergraduate',
    description: 'Bachelor\'s Degree (Ages 18-22)',
    order: 4
  },
  { 
    value: 'grad', 
    label: 'Graduate',
    description: 'Master\'s Degree (Ages 22+)',
    order: 5
  },
  { 
    value: 'phd', 
    label: 'Doctoral',
    description: 'PhD/Doctorate (Ages 25+)',
    order: 6
  }
] as const

/**
 * Post visibility options for educational content
 * Defines who can view and interact with educational posts
 */
export const POST_VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to everyone',
    icon: 'Globe'
  },
  {
    value: 'friends',
    label: 'Study Groups',
    description: 'Visible to study group members',
    icon: 'Users'
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only visible to you',
    icon: 'Lock'
  },
  {
    value: 'institution',
    label: 'Institution',
    description: 'Visible to institution members',
    icon: 'Building'
  }
] as const

/**
 * Post type configurations for different content types
 * Defines available post formats and their characteristics
 */
export const POST_TYPES = [
  {
    value: 'TEXT',
    label: 'Text Post',
    description: 'Share thoughts, questions, or discussions',
    icon: 'MessageSquare',
    maxLength: 5000
  },
  {
    value: 'MEDIA',
    label: 'Media Post', 
    description: 'Share images, videos, or documents',
    icon: 'Image',
    maxFiles: 10,
    allowedTypes: ['image/*', 'video/*', 'application/pdf']
  },
  {
    value: 'POLL',
    label: 'Poll',
    description: 'Create interactive polls and quizzes',
    icon: 'BarChart3',
    maxOptions: 10,
    minOptions: 2
  },
  {
    value: 'QUESTION',
    label: 'Question',
    description: 'Ask educational questions',
    icon: 'HelpCircle',
    requiresSubject: true
  }
] as const

/**
 * Character limits for various content types
 * Ensures consistent content length restrictions
 */
export const CONTENT_LIMITS = {
  POST_CONTENT: 5000,
  COMMENT_CONTENT: 1000,
  POLL_QUESTION: 500,
  POLL_OPTION: 200,
  POLL_EXPLANATION: 1000,
  USER_BIO: 500,
  GROUP_DESCRIPTION: 2000
} as const

/**
 * Media upload constraints
 * Defines file size and type restrictions for uploads
 */
export const MEDIA_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_POST: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
} as const

/**
 * Sort options for feed filtering
 * Provides consistent sorting mechanisms across the platform
 */
export const SORT_OPTIONS = [
  {
    value: 'relevant',
    label: 'Most Relevant',
    description: 'AI-powered relevance based on your interests',
    icon: 'Sparkles'
  },
  {
    value: 'recent',
    label: 'Most Recent',
    description: 'Newest posts first',
    icon: 'Clock'
  },
  {
    value: 'popular',
    label: 'Most Popular',
    description: 'Posts with most engagement',
    icon: 'TrendingUp'
  },
  {
    value: 'commented',
    label: 'Most Discussed',
    description: 'Posts with most comments',
    icon: 'MessageCircle'
  }
] as const

/**
 * Type definitions for educational constants
 * Provides type safety for constant usage
 */
export type EducationalSubject = typeof EDUCATIONAL_SUBJECTS[number]
export type EducationalLevel = typeof EDUCATIONAL_LEVELS[number]['value']
export type PostVisibility = typeof POST_VISIBILITY_OPTIONS[number]['value']
export type PostType = typeof POST_TYPES[number]['value']
export type SortOption = typeof SORT_OPTIONS[number]['value']

/**
 * Utility functions for educational constants
 */
export const EducationalUtils = {
  /**
   * Get educational level by value
   */
  getLevelByValue: (value: EducationalLevel) => 
    EDUCATIONAL_LEVELS.find(level => level.value === value),

  /**
   * Get post type configuration by value
   */
  getPostTypeByValue: (value: PostType) => 
    POST_TYPES.find(type => type.value === value),

  /**
   * Get sort option by value
   */
  getSortOptionByValue: (value: SortOption) =>
    SORT_OPTIONS.find(option => option.value === value),

  /**
   * Check if subject is valid
   */
  isValidSubject: (subject: string): subject is EducationalSubject =>
    EDUCATIONAL_SUBJECTS.includes(subject as EducationalSubject),

  /**
   * Check if level is valid
   */
  isValidLevel: (level: string): level is EducationalLevel =>
    EDUCATIONAL_LEVELS.some(l => l.value === level)
}
