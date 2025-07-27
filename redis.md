# Redis Usage in Edu Matrix Interlinked

## Role in Project
Redis serves as the **high-speed cache layer** and **session store** for this Facebook/LinkedIn-style educational platform. It acts as the performance backbone that makes the application lightning-fast.

## Primary Use Cases

### Performance Optimization
- Cache frequently accessed data like user profiles, conversations, and recent messages
- Store session data and user authentication states
- Cache database query results to avoid repeated expensive operations
- Store user presence information (online/offline status)

### Rate Limiting
- Protect APIs from abuse by limiting requests per user
- Implement sliding window rate limiting for message sending
- Prevent spam and ensure fair usage across users

### Real-Time State Management
- Store typing indicators and temporary user states
- Manage active user sessions and connection tracking
- Cache recent activity for instant loading

## Integration Points

### Next.js APIs
- Use Redis before hitting the database for read operations
- Cache response data after successful database writes
- Implement rate limiting middleware in API routes
- Store and validate user sessions

### Socket.IO Server
- Share user presence data between API and real-time layers
- Store room membership and connection states
- Cache user permissions for real-time event authorization
- Manage temporary states like typing indicators

## Performance Benefits
- Sub-millisecond data retrieval speeds
- Reduced database load and improved scalability
- Instant user state updates across the platform
- Seamless user experience with cached data

## Key Principle
Redis should be used as a **speed layer** - never as the primary data store. Always save critical data to PostgreSQL first, then cache in Redis for performance. Redis data can be regenerated from the database if needed.

## Docker Integration
Redis runs in Docker container and is shared between Next.js APIs and Socket.IO server, creating a unified high-speed cache layer across all application components.

## Environment Variables Configuration

### Redis Connection Settings
```
REDIS_URL=redis://:9a8b7c6d5e4f3210987654321fedcba0987654321fedcba0987654321fedcba@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=9a8b7c6d5e4f3210987654321fedcba0987654321fedcba0987654321fedcba
```

### Connection Notes
- **Host Applications**: Use `localhost:6379` for Next.js APIs connecting from host machine
- **Docker Containers**: Use `redis:6379` for container-to-container communication (Socket.IO server)
- **Password Protected**: Redis instance is secured with authentication
- **Shared Instance**: Same Redis server is used by both Next.js APIs and Socket.IO server for unified state management
