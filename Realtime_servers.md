# Real-Time Servers Architecture
## Edu Matrix Interlinked - Facebook/LinkedIn Style Real-Time Platform

---

## 🏗️ **SYSTEM ARCHITECTURE OVERVIEW**

### **Technology Stack**
- **Frontend**: React/Next.js with real-time hooks
- **API Layer**: Next.js API routes with business logic
- **Cache Layer**: Redis for performance and sessions
- **Event Stream**: Kafka for reliable message delivery
- **Real-Time Layer**: Socket.IO standalone server
- **Database**: PostgreSQL for persistent data storage

### **Service Communication Flow**
```
📱 React Frontend
    ↕️ WebSocket & HTTP
🔗 Next.js APIs (Business Logic)
    ↕️ Cache & Events
💨 Redis Cache ←→ 📡 Kafka Events
    ↕️ Shared Infrastructure
🔄 Socket.IO Server
    ↕️ Real-time Delivery
👥 Connected Users
```

---

## 🔄 **DATA FLOW PATTERNS**

### **Example 1: User Sends Message**
```
1. 📱 Frontend → POST /api/messages
2. 🔗 API → Save to PostgreSQL (permanent storage)
3. 🔗 API → Cache in Redis (performance layer)
4. 🔗 API → Publish to Kafka ('messages' topic)
5. 🔄 Socket.IO → Consume Kafka event
6. 🔄 Socket.IO → Emit to conversation room
7. 📱 Frontend → Receive real-time update
```

### **Example 2: User Goes Online**
```
1. 📱 Frontend → Connect to Socket.IO
2. 🔄 Socket.IO → Update Redis (user presence)
3. 🔄 Socket.IO → Publish to Kafka ('user-activity')
4. 🔄 Socket.IO → Broadcast to user's contacts
5. 📱 Frontend → Show online status
```

### **Example 3: Load Conversation History**
```
1. 📱 Frontend → GET /api/conversations/{id}/messages
2. 🔗 API → Check Redis cache first
3. 🔗 API → If cache miss, query PostgreSQL
4. 🔗 API → Cache result in Redis (TTL: 5 minutes)
5. 🔗 API → Return cached data (sub-second response)
6. 📱 Frontend → Display messages instantly
```

### **Example 4: User Typing Indicator**
```
1. 📱 Frontend → Socket emit 'typing:start'
2. 🔄 Socket.IO → Update Redis (temporary state)
3. 🔄 Socket.IO → Broadcast to conversation room
4. 📱 Other Users → See typing indicator
5. 🔄 Socket.IO → Auto-expire after 3 seconds
```

---

## 📊 **REDIS USAGE PATTERNS**

### **Caching Strategy**
| Data Type | Key Pattern | TTL | Purpose |
|-----------|-------------|-----|---------|
| Conversations | `user:{userId}:conversations` | 5 min | Fast conversation list |
| Recent Messages | `conversation:{id}:messages:recent` | 10 min | Quick message history |
| User Profile | `user:{userId}:profile` | 30 min | Profile data cache |
| Online Users | `user:{userId}:presence` | 5 min | Presence tracking |

### **Session Management**
| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{sessionId}` | 24h | User authentication |
| `connection:{socketId}` | 1h | Socket connection state |
| `typing:{conversationId}:{userId}` | 3s | Typing indicators |

### **Rate Limiting**
| Key Pattern | Window | Limit | Purpose |
|-------------|--------|-------|---------|
| `ratelimit:{userId}:messages` | 1 min | 30 | Message sending limit |
| `ratelimit:{userId}:api` | 1 hour | 1000 | API call protection |
| `ratelimit:{ip}:signup` | 1 day | 5 | Registration abuse prevention |

---

## 📡 **KAFKA TOPIC STRUCTURE**

### **Core Topics**
| Topic Name | Events | Consumers | Purpose |
|------------|--------|-----------|---------|
| `messages` | MESSAGE_SENT, MESSAGE_EDITED, MESSAGE_DELETED, REACTION_ADDED | Socket.IO, Analytics | Real-time messaging |
| `user-activity` | USER_ONLINE, USER_OFFLINE, TYPING_START, TYPING_STOP | Socket.IO, Presence | User presence tracking |
| `notifications` | MENTION, ASSIGNMENT_DUE, GRADE_POSTED, ANNOUNCEMENT | Socket.IO, Push Service | Educational notifications |
| `system-events` | USER_REGISTERED, PROFILE_UPDATED, COURSE_ENROLLED | Analytics, Recommendations | System activity |

### **Event Schema Example**
```json
{
  "timestamp": "2025-06-15T10:30:00Z",
  "type": "MESSAGE_SENT",
  "userId": "user_123",
  "conversationId": "conv_456",
  "data": {
    "messageId": "msg_789",
    "content": "Hello everyone!",
    "participants": ["user_123", "user_456", "user_789"]
  }
}
```

---

## 🔄 **SOCKET.IO EVENT HANDLING**

### **Client → Server Events**
| Event | Handler | Purpose |
|-------|---------|---------|
| `join:conversation` | Join conversation room | Room management |
| `typing:start` | Broadcast typing indicator | Real-time typing |
| `typing:stop` | Stop typing indicator | Clean up typing state |
| `message:read` | Mark messages as read | Read receipts |

### **Server → Client Events**
| Event | Data | Purpose |
|-------|------|---------|
| `message:new` | Message object | New message delivery |
| `typing:start` | User info | Show typing indicator |
| `user:online` | User presence | Update online status |
| `notification:new` | Notification object | Real-time alerts |
| `reaction:added` | Reaction data | Message reactions |

### **Room Management Strategy**
| Room Pattern | Members | Purpose |
|--------------|---------|---------|
| `conversation:{id}` | Conversation participants | Message delivery |
| `user:{userId}` | Single user connections | Personal notifications |
| `course:{courseId}` | Course members | Educational announcements |
| `global:announcements` | All online users | System-wide notifications |

---

## ⚡ **PERFORMANCE OPTIMIZATIONS**

### **Redis Optimizations**
- **Pipeline Operations**: Batch multiple Redis commands
- **Connection Pooling**: Reuse Redis connections efficiently
- **Memory Management**: Use appropriate TTL values
- **Data Serialization**: Compress large cached objects

### **Kafka Optimizations**
- **Batch Processing**: Process events in batches for efficiency
- **Partition Strategy**: Distribute load across partitions
- **Consumer Groups**: Scale processing with multiple consumers
- **Retention Policy**: Configure appropriate message retention

### **Socket.IO Optimizations**
- **Room Filtering**: Send events only to relevant users
- **Connection Clustering**: Scale across multiple server instances
- **Heartbeat Tuning**: Optimize connection health checks
- **Event Compression**: Reduce payload sizes for mobile clients

---

## 🛡️ **SECURITY & RELIABILITY**

### **Authentication Flow**
```
1. 📱 Frontend → Login with NextAuth
2. 🔗 API → Generate JWT token
3. 📱 Frontend → Connect to Socket.IO with token
4. 🔄 Socket.IO → Validate JWT with Redis
5. 🔄 Socket.IO → Allow/deny connection
```

### **Error Handling Strategy**
| Component | Failure Mode | Recovery Action |
|-----------|--------------|-----------------|
| Redis | Cache miss | Fallback to database |
| Kafka | Event delivery failure | Retry with exponential backoff |
| Socket.IO | Connection drop | Auto-reconnect with queue replay |
| API | Database timeout | Return cached data if available |

### **Data Consistency**
- **Database First**: Always save to PostgreSQL before caching
- **Cache Invalidation**: Clear Redis when data changes
- **Event Ordering**: Use Kafka partitions for message ordering
- **Eventual Consistency**: Accept temporary inconsistencies for performance

---

## 📈 **MONITORING & METRICS**

### **Key Performance Indicators**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Message Delivery Time | < 100ms | Socket.IO event latency |
| API Response Time | < 200ms | Redis cache hit ratio |
| Cache Hit Ratio | > 80% | Redis performance metrics |
| Event Processing Rate | > 1000/sec | Kafka consumer lag |
| Concurrent Users | 10,000+ | Socket.IO connection count |

### **Health Checks**
- **Redis**: Connection and memory usage monitoring
- **Kafka**: Consumer lag and partition health
- **Socket.IO**: Connection count and event delivery rates
- **API**: Response times and error rates

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Docker Compose Services**
```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  kafka:
    image: confluentinc/cp-kafka:latest
    ports: ["29092:29092"]
    
  socketio:
    build: ./socketio-standalone-server
    ports: ["3001:3001"]
    depends_on: [redis, kafka]
    
  nextjs:
    build: .
    ports: ["3000:3000"]
    depends_on: [redis, kafka, postgres]
```

### **Environment Configuration**
- **Development**: Single instance of each service
- **Production**: Multiple Socket.IO instances behind load balancer
- **Scaling**: Horizontal scaling with Redis Cluster and Kafka partitions