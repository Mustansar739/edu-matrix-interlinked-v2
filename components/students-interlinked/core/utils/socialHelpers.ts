import { Post, Story, Comment, MediaFile } from '../types';

// Time formatting utilities
export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 2419200) return `${Math.floor(diffInSeconds / 604800)}w`;
  
  return date.toLocaleDateString();
};

export const formatFullDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (dateString: string): string => {
  return formatTimeAgo(dateString);
};

// Content formatting utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

export const formatEngagementCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

// URL detection and formatting
export const detectUrls = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');
};

export const detectMentions = (text: string): string => {
  const mentionRegex = /@(\w+)/g;
  return text.replace(mentionRegex, '<span class="text-blue-600 font-medium cursor-pointer hover:underline">@$1</span>');
};

export const detectHashtags = (text: string): string => {
  const hashtagRegex = /#(\w+)/g;
  return text.replace(hashtagRegex, '<span class="text-blue-600 font-medium cursor-pointer hover:underline">#$1</span>');
};

export const formatRichText = (text: string): string => {
  let formatted = text;
  formatted = detectUrls(formatted);
  formatted = detectMentions(formatted);
  formatted = detectHashtags(formatted);
  return formatted;
};

// Educational context utilities
export const getEducationalBadgeColor = (level?: string): string => {
  switch (level) {
    case 'high-school': return 'bg-green-100 text-green-800';
    case 'undergrad': return 'bg-blue-100 text-blue-800';
    case 'grad': return 'bg-purple-100 text-purple-800';
    case 'phd': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getSubjectIcon = (subject: string): string => {
  const icons: Record<string, string> = {
    'Mathematics': '🔢',
    'Physics': '⚛️',
    'Chemistry': '🧪',
    'Biology': '🧬',
    'Computer Science': '💻',
    'Engineering': '⚙️',
    'Literature': '📚',
    'History': '📜',
    'Psychology': '🧠',
    'Economics': '📈',
    'Art': '🎨',
    'Music': '🎵',
  };
  return icons[subject] || '📖';
};

// Media utilities
export const getMediaType = (filename: string): 'image' | 'video' | 'document' | 'audio' => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio';
  }
  return 'document';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Social utilities
export const getReactionEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
    helpful: '💡',
    insightful: '🎯',
    confused: '🤔',
  };
  return emojis[type] || '👍';
};

export const calculateEngagementRate = (post: Post): number => {
  const totalEngagement = post._count.likes + post._count.comments + post._count.shares;
  const views = post._count.views || 0;
  return views > 0 ? (totalEngagement / views) * 100 : 0;
};

// Privacy and moderation utilities
export const isContentAppropriate = (content: string): boolean => {
  const inappropriateWords = ['spam', 'fake', 'scam']; // Simplified for demo
  return !inappropriateWords.some(word => content.toLowerCase().includes(word));
};

export const censorContent = (content: string): string => {
  // Basic content censoring - in production, use more sophisticated methods
  return content.replace(/\b(spam|fake|scam)\b/gi, '***');
};

// Search and filtering utilities
export const searchContent = (
  content: string,
  query: string,
  fields: string[] = ['content', 'subject', 'course']
): boolean => {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return true;
  
  return content.toLowerCase().includes(searchTerm);
};

export const filterByEducationalContext = (
  items: (Post | Story)[],
  filters: {
    subject?: string;
    level?: string;
    course?: string;
  }
): (Post | Story)[] => {  return items.filter(item => {
    if (filters.subject && item.educationalContext?.subject !== filters.subject) {
      return false;
    }
    if (filters.level && item.educationalContext?.level !== filters.level) {
      return false;
    }
    if (filters.course && item.educationalContext?.course !== filters.course) {
      return false;
    }
    return true;
  });
};

// Type-safe filter function for Posts only
export const filterPostsByEducationalContext = (
  posts: Post[],
  filters: {
    subject?: string;
    level?: string;
    course?: string;
  }
): Post[] => {
  return posts.filter(post => {
    if (filters.subject && post.educationalContext?.subject !== filters.subject) {
      return false;
    }
    if (filters.level && post.educationalContext?.level !== filters.level) {
      return false;
    }
    if (filters.course && post.educationalContext?.course !== filters.course) {
      return false;
    }
    return true;
  });
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Data validation utilities
export const validatePost = (content: string, media?: MediaFile[]): string[] => {
  const errors: string[] = [];
  
  if (!content.trim() && (!media || media.length === 0)) {
    errors.push('Post must contain text or media');
  }
  
  if (content.length > 10000) {
    errors.push('Post content is too long (max 10,000 characters)');
  }
  
  if (media && media.length > 10) {
    errors.push('Too many media files (max 10)');
  }
  
  return errors;
};

export const validateComment = (content: string): string[] => {
  const errors: string[] = [];
  
  if (!content.trim()) {
    errors.push('Comment cannot be empty');
  }
  
  if (content.length > 5000) {
    errors.push('Comment is too long (max 5,000 characters)');
  }
  
  return errors;
};
