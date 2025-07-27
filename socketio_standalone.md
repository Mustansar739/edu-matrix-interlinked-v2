# Socket.IO Standalone Server Usage in Edu Matrix Interlinked

## Role in Project
The Socket.IO standalone server provides **real-time WebSocket connections** for this Facebook/LinkedIn-style educational platform. It handles all live user interactions and instant communication features.

## Primary Use Cases

### Real-Time Communication
- Deliver instant messages between users in conversations
- Broadcast typing indicators and user presence status
- Send real-time notifications and alerts
- Handle live reactions and message interactions

### Live User Experience
- Show online/offline status of other users
- Display typing indicators in conversations
- Provide instant delivery confirmations for messages
- Enable real-time collaboration features

### Room Management
- Organize users into conversation rooms
- Manage user permissions and access to rooms
- Handle join/leave events for conversations
- Broadcast events to specific user groups

## Integration Points

### Kafka Consumer
- Listen to event streams from Next.js APIs
- Process message events and deliver to connected users
- Handle notification events and route to appropriate rooms
- Consume user activity events for real-time updates

### Redis Integration
- Store connection states and user presence data
- Cache room memberships and user permissions
- Share session data with Next.js APIs
- Manage temporary states like typing indicators

### Client Connections
- Accept WebSocket connections from React frontend
- Authenticate users using NextAuth sessions
- Manage connection lifecycle and reconnection
- Handle client-side event emissions

## Real-Time Events Handled
- **message:new** - Instant message delivery
- **typing:start/stop** - Typing indicators
- **user:online/offline** - Presence updates
- **notification:new** - Real-time alerts
- **reaction:add/remove** - Message reactions
- **conversation:updated** - Live conversation changes

## Performance Features
- Connection pooling and efficient event broadcasting
- Room-based event filtering to reduce unnecessary traffic
- Graceful handling of connection drops and reconnections
- Optimized message queuing for offline users

## Authentication & Security
- Validate user sessions through NextAuth JWT tokens
- Support internal API authentication for system events
- Implement room-based access control
- Secure event emission with user permission checks

## Key Principle
Socket.IO server handles **only real-time delivery** - it does not store data permanently. All persistent operations go through Next.js APIs first, then events are streamed to Socket.IO for live updates.

## Docker Integration
Runs as standalone Docker container, connects to shared Redis and Kafka instances, and communicates with Next.js APIs through HTTP endpoints for secure event emission.

## Environment Variables Configuration

### Socket.IO Server Settings
```
# Server Configuration (Docker Container)
SOCKET_IO_PORT=3001
SOCKET_IO_HOST=0.0.0.0
SOCKET_IO_CORS_ORIGIN=http://localhost:3000

# Client Configuration (Frontend connections from host)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Internal Docker Communication (container-to-container)
SOCKET_IO_INTERNAL_URL=http://socketio:3001

# Real-time API Configuration
SOCKETIO_SERVER_URL=http://localhost:3001
SOCKETIO_API_KEY=edu-matrix-internal-2024-secure-key-89d7f6e5c4b3a291
```

### Authentication & Security Settings
```
# NextAuth Integration (for user session validation)
NEXTAUTH_SECRET=2eb8467486bebce6d805da3087b46ac54d5c593cd79913c1a51093d3462c24fb
JWT_SECRET=0ef2b3bd4d5c3277d152a4c1f2cf51a30bce46700d5a0cd5d0e05703fbae749d

# Internal API Authentication (for system events)
INTERNAL_API_KEY=edu-matrix-internal-2024-secure-key-89d7f6e5c4b3a291
```

### Connection Strategy
- **Frontend Clients**: Connect to `http://localhost:3001` from browser/React components
- **Next.js APIs**: Use internal API key for secure event emission to Socket.IO server
- **Docker Network**: Internal communication uses `http://socketio:3001` between containers
- **CORS Security**: Only allows connections from `http://localhost:3000` (Next.js frontend)
- **Dual Authentication**: Supports both NextAuth JWT tokens and internal API keys for different use cases
