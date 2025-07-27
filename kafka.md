# Kafka Usage in Edu Matrix Interlinked

## Role in Project
Kafka serves as the **event streaming backbone** and **message broker** for this Facebook/LinkedIn-style educational platform. It enables reliable, scalable, and persistent real-time communication between all system components.

## Primary Use Cases

### Event-Driven Architecture
- Stream user events like message sending, profile updates, and notifications
- Decouple API operations from real-time delivery
- Enable multiple consumers to process the same events
- Provide event replay capability for system recovery

### Real-Time Message Distribution
- Publish message events from APIs to Socket.IO consumers
- Handle notification events across multiple user sessions
- Distribute typing indicators and presence updates
- Stream user activity for recommendations and analytics

### System Reliability
- Persist events even if Socket.IO server is temporarily down
- Enable message delivery guarantees and retry mechanisms
- Provide audit trail of all user interactions
- Support system scaling with multiple server instances

## Integration Points

### Next.js APIs
- Publish events after successful database operations
- Send user action events to Kafka topics
- Trigger notifications and real-time updates
- Log user activity for analytics and recommendations

### Socket.IO Server
- Consume events from Kafka topics
- Deliver real-time updates to connected users
- Process notification events and send to appropriate rooms
- Handle bulk event processing for efficiency

## Scalability Benefits
- Handle millions of events per second
- Support horizontal scaling of Socket.IO servers
- Enable microservices architecture with event communication
- Provide fault tolerance and data durability

## Key Topics Structure
- **user-events**: Profile updates, status changes, activity
- **messages**: New messages, reactions, edits, deletions
- **notifications**: System notifications, mentions, alerts
- **analytics**: User behavior, performance metrics

## Event Flow Pattern
API receives request → Save to database → Publish to Kafka → Socket.IO consumes → Deliver to users

## Key Principle
Kafka ensures **reliable event delivery** - even if real-time delivery fails temporarily, events are persisted and will be processed when systems recover. This guarantees no user actions are lost.

## Docker Integration
Kafka runs in Docker container and acts as the central nervous system connecting Next.js APIs with Socket.IO server, ensuring all events flow reliably through the system.

## Environment Variables Configuration

### Kafka Connection Settings
```
# External (host-to-container): Use for Next.js APIs from host machine
KAFKA_BROKERS=localhost:29092

# Internal (container-to-container): Use for Docker services
KAFKA_INTERNAL_BROKERS=kafka:19092

KAFKA_CLIENT_ID=edu-matrix-interlinked
KAFKA_ENABLED=true
```

### Connection Strategy
- **Host Applications**: Next.js APIs use `localhost:29092` to connect to Kafka from host machine
- **Docker Containers**: Socket.IO server uses `kafka:19092` for container-to-container communication  
- **Port Separation**: Completely separate ports strategy to avoid conflicts
- **Client Identification**: All services use `edu-matrix-interlinked` as client ID for monitoring
- **Feature Flag**: `KAFKA_ENABLED=true` allows toggling Kafka functionality for development/testing
