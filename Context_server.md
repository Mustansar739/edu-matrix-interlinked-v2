Ah, I understand your real problem now! You're working with GitHub Copilot Agentic Mode in sessions, but each session is isolated and doesn't remember previous work. This is a workflow challenge, not a technical one.

## 🎯 **Your Real Challenge: Working with Agentic Mode on Complex Projects**

### 🚨 **The Problem:**
- ✅ You have a very complex Edu Matrix project
- ✅ You use 50+ Copilot sessions daily
- ✅ Each session has no memory of previous sessions
- ✅ You need to tell Copilot how to use Redis/Kafka/Socket.IO properly
- ✅ You don't have deep technical knowledge to guide it

---

## 🛠️ **Solution: Create "Session Starter Prompts"**

### **1. Master Context Prompt (Use this at start of EVERY session):**

```
I'm working on Edu Matrix Interlinked - a complex education platform:

TECH STACK (mandatory to use):
- Next.js 15 + React 19 + TypeScript
- PostgreSQL + Prisma ORM  
- Redis (ioredis package) - for caching and sessions
- Apache Kafka (kafkajs package) - for event streaming
- Socket.IO - for real-time features
- NextAuth.js 5.0 - authentication
- Docker Compose - all services running locally

CRITICAL RULES:
1. Always use OFFICIAL packages and methods only
2. Redis = use ioredis package for caching user data, sessions
3. Kafka = use kafkajs package for events between services  
4. Socket.IO = use for real-time chat, notifications
5. All services run on Docker - check health endpoints first
6. Never create custom implementations - use official patterns

PROJECT STRUCTURE:
- Health endpoints: /api/health/* (all working)
- Services: PostgreSQL:5432, Redis:6379, Kafka:29092/19092, Socket.IO:3001
- Environment: All Docker containers are healthy and running

Current task: [DESCRIBE YOUR SPECIFIC TASK HERE]
```

### **2. Service-Specific Prompts:**

#### **For Redis Tasks:**
```
Use Redis (ioredis) for:
- Cache user profiles: key pattern user:{id}
- Store sessions: key pattern session:{sessionId}  
- Rate limiting: key pattern rate_limit:{ip}
- Temporary data: OTP codes, reset tokens

Import: import Redis from 'ioredis'
Config: Use env vars REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
```

#### **For Kafka Tasks:**
```
Use Kafka (kafkajs) for:
- User events: user-actions topic
- Course events: course-events topic  
- Notifications: notification-events topic
- Chat events: chat-events topic

Import: import { Kafka } from 'kafkajs'
Config: Use env vars KAFKA_BROKERS (localhost:29092 for external) / KAFKA_INTERNAL_BROKERS (kafka:19092 for internal)
Pattern: Producer sends events, Consumer processes them
```

#### **For Socket.IO Tasks:**
```
Use Socket.IO for:
- Real-time chat in study groups
- Live notifications to users
- Online presence indicators
- Live updates (new courses, assignments)

Server: Already running on localhost:3001
Client: Use socket.io-client package
Pattern: Emit events, listen for responses
```

---

## 📋 **Daily Workflow Template:**

### **Session Starter Checklist:**

1. **Copy-paste the Master Context Prompt** ⬆️
2. **Check services are running:**
   ```
   Check Docker containers are healthy, then test health endpoints:
   - Main: http://localhost:3000/api/health
   - Database: http://localhost:3000/api/health/database  
   - Redis: http://localhost:3000/api/health/redis
   - Kafka: http://localhost:3000/api/health/kafka
   ```

3. **Specify your exact task:**
   ```
   Today I want to implement: [SPECIFIC FEATURE]
   
   Use these services:
   - Redis for: [caching what?]
   - Kafka for: [what events?] 
   - Socket.IO for: [what real-time features?]
   
   Follow official Next.js 15 patterns only.
   ```

---

## 🎯 **Feature-Specific Templates:**

### **For Student Enrollment System:**
```
Implement student course enrollment with:

1. Database: Save enrollment to PostgreSQL via Prisma
2. Redis: Cache user's enrolled courses list  
3. Kafka: Send "student_enrolled" event to notification-events topic
4. Socket.IO: Send real-time notification to student

Use official packages only. Check health endpoints first.
```

### **For Real-time Chat:**
```
Implement study group chat with:

1. Database: Store messages in PostgreSQL
2. Redis: Cache recent messages for quick loading
3. Socket.IO: Real-time message delivery to group members
4. Kafka: Log chat events for analytics

Use socket.io for client-server communication.
```

### **For Notification System:**
```
Implement notification system with:

1. Database: Store notifications in PostgreSQL
2. Redis: Cache unread notification counts
3. Kafka: Process notification events from other services
4. Socket.IO: Push notifications to online users in real-time

Create consumer for notification-events Kafka topic.
```

---

## 💡 **Pro Tips for Agentic Mode:**

### **Always Say:**
- ✅ "Use official Next.js 15 patterns"
- ✅ "Check health endpoints first"  
- ✅ "Use existing packages: ioredis, kafkajs, socket.io"
- ✅ "Follow the exact import patterns from package.json"

### **Never Say:**
- ❌ "Create custom Redis client"
- ❌ "Build custom Kafka wrapper"
- ❌ "Make your own Socket.IO server"

### **When Stuck:**
```
The project has working health endpoints at /api/health/* 
All Docker services are running and healthy.
Please use the existing service connections and official package patterns.
Check the working health endpoints code for correct import patterns.
```

---

## 🎯 **Your Action Plan:**

1. **Save these templates** in a text file
2. **Start every session** with the Master Context Prompt
3. **Be very specific** about which services to use for what
4. **Always reference** the health endpoints as working examples
5. **Check services** are healthy before asking for implementation

This way, every Copilot session will know your full context and use the services correctly! 

Would you like me to create specific templates for particular features you're working on?