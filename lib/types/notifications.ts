// ==========================================
// NOTIFICATION TYPES
// ==========================================
// TypeScript types for the notification system

import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  DeliveryStatus,
  DigestFrequency,
  InteractionType
} from '@prisma/client';

// Re-export Prisma enums
export {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  DeliveryStatus,
  DigestFrequency,
  InteractionType
};

export interface NotificationData {
  id: string;
  userId: string;
  institutionId?: string;

  // Content
  title: string;
  message: string;
  shortMessage?: string;

  // Classification
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;

  // Context
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;

  // Rich content
  imageUrl?: string;
  iconUrl?: string;
  data?: Record<string, any>;

  // Delivery
  channels: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;

  // Status
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date;
  dismissedAt?: Date;

  // Grouping
  groupId?: string;
  batchId?: string;

  // Metadata
  sourceSystem?: string;
  templateId?: string;
  campaignId?: string;
  preferenceId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;

  // Global settings
  globalEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;

  // Frequency
  digestFrequency: DigestFrequency;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;

  // Category preferences
  educationalNotifications: boolean;
  socialNotifications: boolean;
  financialNotifications: boolean;
  administrativeNotifications: boolean;
  technicalNotifications: boolean;
  marketingNotifications: boolean;
  securityNotifications: boolean;
  achievementNotifications: boolean;

  // Specific types
  courseUpdates: boolean;
  assignmentReminders: boolean;
  gradeNotifications: boolean;
  messageNotifications: boolean;
  socialInteractions: boolean;
  jobOpportunities: boolean;
  newsUpdates: boolean;

  // Channel preferences per category
  educationalChannels?: NotificationChannel[];
  socialChannels?: NotificationChannel[];
  financialChannels?: NotificationChannel[];
  administrativeChannels?: NotificationChannel[];

  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  recipientAddress: string;
  provider?: string;
  providerId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  opened: boolean;
  openedAt?: Date;
  clicked: boolean;
  clickedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  templateKey: string;
  name: string;
  description?: string;
  titleTemplate: string;
  messageTemplate: string;
  shortTemplate?: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  variables: Record<string, any>;
  sampleData?: Record<string, any>;
  isActive: boolean;
  requiresApproval: boolean;
  language: string;
  localizations?: Record<string, any>;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types for API
export interface CreateNotificationRequest {
  userId: string;
  institutionId?: string;
  title: string;
  message: string;
  shortMessage?: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  iconUrl?: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  scheduledFor?: string;
  expiresAt?: string;
  groupId?: string;
  templateId?: string;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
  dismissedAt?: string;
  status?: NotificationStatus;
}

export interface NotificationFilters {
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  isRead?: boolean;
  status?: NotificationStatus;
  startDate?: string;
  endDate?: string;
  entityType?: string;
  entityId?: string;
}

export interface NotificationListResponse {
  notifications: NotificationData[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface NotificationCountsResponse {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
  byType: Record<NotificationType, number>;
}

// Real-time event types
export interface NotificationEvent {
  type: 'notification:new' | 'notification:updated' | 'notification:deleted' | 'notification:read' | 'notification:count_updated';
  data: NotificationData | { id: string } | { unreadCount: number };
  userId: string;
  timestamp: Date;
}

// Hook state types
export interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
  hasMore: boolean;
}

export interface NotificationActions {
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreference>) => Promise<void>;
  getUnreadCount: () => Promise<number>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export interface UseNotificationsReturn extends NotificationState, NotificationActions {
  preferences: NotificationPreference | null;
  counts: NotificationCountsResponse | null;
}
