# FACEBOOK-SCALE NOTIFICATION SYSTEM DESIGN

## 🎯 SYSTEM OVERVIEW

This document outlines the complete design for a Facebook-identical notification system using Next.js 15+, Redis, Kafka, and Socket.IO for real-time delivery to millions of users.

## 🏗️ ARCHITECTURE DESIGN

### **Event-Driven Architecture Flow**
```
User Action → API Endpoint → Database → Kafka Event → Notification Processor → 
Redis Cache → Socket.IO → Real-time Delivery → Push Notifications
```

### **Core Components**
1. **Notification Event Publisher** - Publishes events from all content APIs
2. **Notification Event Processor** - Consumes events and creates notifications
3. **Notification Aggregator** - Groups similar notifications intelligently
4. **Real-time Delivery Engine** - Socket.IO + Push notifications
5. **Notification Cache Manager** - Redis-based performance optimization

## 📊 DATABASE SCHEMA DESIGN

### **Enhanced Notification Models**
```prisma
model Notification {
  id                String                @id @default(uuid())
  userId            String                // Recipient
  
  // Content & Context
  type              NotificationType      // LIKE, COMMENT, FOLLOW, SHARE, etc.
  title             String
  message           String
  shortMessage      String?               // For mobile push
  
  // Source Information
  actorId           String?               // Who performed the action
  entityType        String?               // post, comment, story, etc.
  entityId          String?               // ID of the liked/commented item
  
  // Aggregation & Grouping
  groupKey          String?               // For bundling similar notifications
  aggregatedCount   Int                   @default(1)
  aggregatedActors  Json?                 // List of users who performed action
  
  // Delivery & Status
  isRead            Boolean               @default(false)
  readAt            DateTime?
  deliveredAt       DateTime?
  channels          NotificationChannel[] // PUSH, EMAIL, SMS
  
  // Priority & Scheduling
  priority          NotificationPriority  @default(NORMAL)
  scheduledFor      DateTime?
  expiresAt         DateTime?
  
  // Rich Content
  imageUrl          String?
  actionUrl         String?
  actionLabel       String?
  data              Json?                 // Additional metadata
  
  // Timestamps
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  // Relations
  deliveries        NotificationDelivery[]
  
  @@index([userId, isRead, createdAt])
  @@index([groupKey, userId])
  @@index([type, userId, createdAt])
  @@index([scheduledFor])
  @@schema("notifications_schema")
}

model NotificationDelivery {
  id             String            @id @default(uuid())
  notificationId String
  channel        NotificationChannel
  status         DeliveryStatus    @default(PENDING)
  sentAt         DateTime?
  deliveredAt    DateTime?
  failedAt       DateTime?
  errorMessage   String?
  retryCount     Int               @default(0)
  
  notification   Notification      @relation(fields: [notificationId], references: [id])
  
  @@index([status, sentAt])
  @@schema("notifications_schema")
}

model NotificationTemplate {
  id          String               @id @default(uuid())
  type        NotificationType
  language    String               @default("en")
  title       String
  message     String
  shortMessage String?
  variables   Json?                // Template variables
  isActive    Boolean              @default(true)
  
  @@unique([type, language])
  @@schema("notifications_schema")
}

model NotificationPreference {
  id                    String              @id @default(uuid())
  userId                String              @unique
  
  // Global Settings
  globalEnabled         Boolean             @default(true)
  pushEnabled           Boolean             @default(true)
  emailEnabled          Boolean             @default(true)
  smsEnabled            Boolean             @default(false)
  
  // Type-specific Settings
  likesEnabled          Boolean             @default(true)
  commentsEnabled       Boolean             @default(true)
  sharesEnabled         Boolean             @default(true)
  followsEnabled        Boolean             @default(true)
  messagesEnabled       Boolean             @default(true)
  mentionsEnabled       Boolean             @default(true)
  
  // Frequency & Timing
  digestFrequency       DigestFrequency     @default(INSTANT)
  quietHoursStart       String?             // "22:00"
  quietHoursEnd         String?             // "08:00"
  timezone              String              @default("UTC")
  
  @@schema("notifications_schema")
}
```

## 🔄 KAFKA EVENT TYPES

### **Notification Events Schema**
```typescript
interface NotificationEvent {
  type: 'POST_LIKED' | 'POST_COMMENTED' | 'POST_SHARED' | 'USER_FOLLOWED' | 
        'COMMENT_LIKED' | 'STORY_VIEWED' | 'MESSAGE_RECEIVED' | 'MENTION_CREATED'
  
  data: {
    actorId: string          // Who performed the action
    recipientId: string      // Who should be notified
    entityType: string       // post, comment, story, etc.
    entityId: string         // ID of the entity
    entityOwnerId: string    // Owner of the entity
    metadata: {
      title?: string         // Post title, comment content preview
      imageUrl?: string      // Entity image
      actionUrl?: string     // Deep link URL
      [key: string]: any
    }
  }
  
  timestamp: string
  source: string             // API endpoint that triggered event
}
```

### **Kafka Topics Design**
```typescript
const NOTIFICATION_TOPICS = {
  // Core notification events
  'notification-events': {
    partitions: 10,           // High throughput
    retention: '7d',          // 7 days
    events: ['POST_LIKED', 'POST_COMMENTED', 'USER_FOLLOWED', etc.]
  },
  
  // Real-time delivery
  'notification-delivery': {
    partitions: 5,
    retention: '24h',         // Short retention
    events: ['NOTIFICATION_CREATED', 'NOTIFICATION_DELIVERED']
  },
  
  // Digest and batch processing
  'notification-digest': {
    partitions: 3,
    retention: '30d',         // Monthly retention
    events: ['DIGEST_SCHEDULED', 'BATCH_PROCESSED']
  }
}
```

## 🧠 NOTIFICATION AGGREGATION LOGIC

### **Smart Bundling Rules**
```typescript
const AGGREGATION_RULES = {
  POST_LIKED: {
    groupByFields: ['entityId', 'entityType'],
    timeWindow: 300,          // 5 minutes
    maxActors: 10,            // Show up to 10 names
    template: {
      single: "{actor} liked your {entityType}",
      double: "{actor1} and {actor2} liked your {entityType}",
      multiple: "{actor1} and {count} others liked your {entityType}"
    }
  },
  
  POST_COMMENTED: {
    groupByFields: ['entityId', 'entityType'],
    timeWindow: 600,          // 10 minutes
    maxActors: 5,
    template: {
      single: "{actor} commented on your {entityType}",
      multiple: "{actor1} and {count} others commented on your {entityType}"
    }
  },
  
  USER_FOLLOWED: {
    groupByFields: ['recipientId'],
    timeWindow: 1800,         // 30 minutes
    maxActors: 20,
    template: {
      single: "{actor} started following you",
      multiple: "{actor1} and {count} others started following you"
    }
  }
}
```

### **Redis Aggregation Strategy**
```typescript
// Redis keys for aggregation
const REDIS_KEYS = {
  // Pending notifications for aggregation
  pending: 'notif:pending:{userId}:{groupKey}',
  
  // Notification counts cache
  counts: 'notif:counts:{userId}',
  
  // Recent notifications cache
  recent: 'notif:recent:{userId}',
  
  // User preferences cache
  preferences: 'notif:prefs:{userId}',
  
  // Typing indicators for real-time features
  typing: 'notif:typing:{userId}'
}
```

## 🚀 REAL-TIME DELIVERY PIPELINE

### **Socket.IO Event Types**
```typescript
// Client-to-Server Events
interface ClientEvents {
  'notification:mark_read': (notificationId: string) => void
  'notification:mark_all_read': () => void
  'notification:get_count': () => void
  'notification:subscribe': (preferences: object) => void
}

// Server-to-Client Events
interface ServerEvents {
  'notification:new': (notification: NotificationData) => void
  'notification:updated': (notification: NotificationData) => void
  'notification:count_changed': (count: number) => void
  'notification:bulk_update': (notifications: NotificationData[]) => void
}
```

### **Push Notification Integration**
```typescript
interface PushNotificationData {
  title: string
  body: string
  icon?: string
  badge?: number
  data?: {
    notificationId: string
    actionUrl: string
    entityType: string
    entityId: string
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}
```

## 📈 PERFORMANCE OPTIMIZATION

### **Redis Caching Strategy**
```typescript
const CACHE_STRATEGIES = {
  // Notification counts (very fast access)
  unreadCounts: {
    key: 'notif:count:{userId}',
    ttl: 300,                 // 5 minutes
    updateOn: ['create', 'read', 'delete']
  },
  
  // Recent notifications (quick loading)
  recentNotifications: {
    key: 'notif:recent:{userId}',
    ttl: 600,                 // 10 minutes
    size: 50,                 // Last 50 notifications
    updateOn: ['create', 'read']
  },
  
  // User preferences (avoid DB hits)
  userPreferences: {
    key: 'notif:prefs:{userId}',
    ttl: 3600,                // 1 hour
    updateOn: ['preference_change']
  },
  
  // Notification templates (rarely change)
  templates: {
    key: 'notif:templates:{type}:{lang}',
    ttl: 86400,               // 24 hours
    updateOn: ['template_update']
  }
}
```

### **Database Optimization**
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

CREATE INDEX CONCURRENTLY idx_notifications_group_key 
ON notifications(group_key, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_notifications_scheduled 
ON notifications(scheduled_for) 
WHERE scheduled_for IS NOT NULL;

-- Partial index for active notifications
CREATE INDEX CONCURRENTLY idx_notifications_active 
ON notifications(user_id, created_at DESC) 
WHERE expires_at IS NULL OR expires_at > NOW();
```

## 🔧 API ENDPOINTS DESIGN

### **Notification CRUD APIs**
```typescript
// GET /api/notifications
interface GetNotificationsParams {
  page?: number
  limit?: number             // Max 100
  type?: NotificationType[]
  isRead?: boolean
  since?: string            // ISO date
  groupKey?: string
}

// POST /api/notifications/mark-read
interface MarkReadRequest {
  notificationIds: string[]
}

// PATCH /api/notifications/preferences
interface UpdatePreferencesRequest {
  likesEnabled?: boolean
  commentsEnabled?: boolean
  pushEnabled?: boolean
  digestFrequency?: DigestFrequency
  quietHours?: {
    start: string
    end: string
    timezone: string
  }
}
```

### **Event Publisher APIs (Internal)**
```typescript
// POST /api/internal/notifications/publish-event
interface PublishEventRequest {
  type: NotificationEventType
  actorId: string
  recipientId: string
  entityType: string
  entityId: string
  metadata?: Record<string, any>
}
```

## 🎛️ IMPLEMENTATION PHASES

### **Phase 1: Core Infrastructure (Day 1-2)**
1. ✅ Enhanced database schema with aggregation support
2. ✅ Kafka topic setup and event types
3. ✅ Basic notification service architecture
4. ✅ Redis caching implementation

### **Phase 2: Event-Driven Creation (Day 3-4)**
1. ✅ Event publishers in all content APIs (likes, comments, follows)
2. ✅ Notification event processor service
3. ✅ Template engine for dynamic content
4. ✅ Basic aggregation logic

### **Phase 3: Real-time Delivery (Day 5-6)**
1. ✅ Enhanced Socket.IO notification handlers
2. ✅ Push notification integration
3. ✅ Real-time count updates
4. ✅ Notification state management

### **Phase 4: Advanced Features (Day 7-8)**
1. ✅ Smart notification bundling
2. ✅ Digest and batch processing
3. ✅ Advanced preferences system
4. ✅ Analytics and monitoring

### **Phase 5: Performance & Scale (Day 9-10)**
1. ✅ Cache optimization
2. ✅ Database query optimization
3. ✅ Load testing and tuning
4. ✅ Monitoring and alerting

## 🔍 MONITORING & ANALYTICS

### **Key Metrics to Track**
```typescript
interface NotificationMetrics {
  // Delivery metrics
  totalNotificationsSent: number
  deliveryRate: number
  avgDeliveryTime: number
  
  // Engagement metrics
  openRate: number
  clickThroughRate: number
  readRate: number
  
  // Performance metrics
  cacheHitRate: number
  aggregationEfficiency: number
  socketIOConnections: number
  
  // Error metrics
  failedDeliveries: number
  kafkaLag: number
  redisErrors: number
}
```

## 🎯 SUCCESS CRITERIA

### **Facebook-Scale Requirements**
- ✅ **Sub-second notification delivery** (< 500ms)
- ✅ **Smart aggregation** ("John and 5 others liked your post")
- ✅ **Real-time counts** (unread badge updates instantly)
- ✅ **Horizontal scaling** (supports millions of users)
- ✅ **99.9% uptime** with graceful degradation
- ✅ **Intelligent bundling** (reduce notification spam)
- ✅ **Multi-channel delivery** (push, email, SMS)
- ✅ **Granular preferences** (per-type notification control)

This design provides a complete, Facebook-identical notification system that can handle millions of users with sub-second delivery times and intelligent aggregation.
