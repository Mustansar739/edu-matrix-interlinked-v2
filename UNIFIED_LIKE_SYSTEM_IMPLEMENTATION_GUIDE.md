# 🚀 UNIFIED LIKE SYSTEM - IMPLEMENTATION GUIDE

## Quick Start Guide for Developers

### 📦 Prerequisites
- Next.js 15
- TypeScript
- Prisma ORM
- Redis (for caching)
- Kafka (for real-time events)
- Socket.IO (for client real-time)

### 🏗️ Implementation Steps

#### 1. API Integration
```typescript
// Use the unified API endpoint
const response = await fetch('/api/unified-likes/post/123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'like',
    reaction: 'love',
    schemaName: 'social_schema'
  })
})
```

#### 2. React Hook Usage
```typescript
import { useUnifiedLikes } from '@/hooks/useUnifiedLikes'

function MyComponent({ postId, authorId }) {
  const {
    isLiked,
    likeCount,
    userReaction,
    toggleLike,
    setReaction
  } = useUnifiedLikes({
    contentType: 'post',
    contentId: postId,
    initialState: { isLiked: false, count: 0 },
    mode: 'reactions',
    recipientId: authorId
  })

  return (
    <div>
      <button onClick={toggleLike}>
        {isLiked ? '❤️' : '🤍'} {likeCount}
      </button>
    </div>
  )
}
```

#### 3. Component Integration
```typescript
import PostActions from '@/components/students-interlinked/posts/PostActions'

function PostCard({ post }) {
  return (
    <div>
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      
      <PostActions
        postId={post.id}
        authorId={post.authorId}
        counts={{
          likes: post.likeCount,
          comments: post.commentCount,
          shares: post.shareCount
        }}
        reactionMode="reactions"
        onLikeChange={(postId, isLiked, count) => {
          console.log('Like changed:', { postId, isLiked, count })
        }}
      />
    </div>
  )
}
```

### 🎯 Supported Content Types

| Type | Description | Example Usage |
|------|-------------|---------------|
| `post` | Social media posts | Feed interactions |
| `comment` | Comment reactions | Thread engagement |
| `profile` | Profile likes | User appreciation |
| `story` | Story reactions | Story engagement |
| `project` | Project likes | Portfolio interactions |

### 🔧 Configuration Options

#### Like Modes:
- **`simple`**: Basic like/unlike with heart icon
- **`reactions`**: Facebook-style reactions (👍❤️😂😮😢😡⭐)
- **`auto`**: Automatically choose based on context

#### Component Sizes:
- **`sm`**: Small size for compact layouts
- **`md`**: Medium size for standard usage  
- **`lg`**: Large size for prominent placement

#### Component Variants:
- **`default`**: Standard layout with all features
- **`compact`**: Minimal layout for space-constrained areas
- **`detailed`**: Extended layout with additional information

### 🛠️ Advanced Features

#### Real-time Updates:
```typescript
// Automatic real-time updates via Socket.IO
const { isLiked, likeCount } = useUnifiedLikes({
  contentType: 'post',
  contentId: 'post-123',
  enableRealtime: true, // Enable real-time updates
  onLikeChange: (state) => {
    // Handle real-time like changes
    console.log('Real-time update:', state)
  }
})
```

#### Error Handling:
```typescript
const { error, isLoading } = useUnifiedLikes({
  contentType: 'post',
  contentId: 'post-123',
  onError: (error) => {
    console.error('Like error:', error)
    toast.error('Failed to update like')
  }
})
```

#### Custom Callbacks:
```typescript
<PostActions
  postId="post-123"
  authorId="user-456"
  counts={{ likes: 42, comments: 12, shares: 8 }}
  onLikeChange={(postId, isLiked, count) => {
    // Update parent component state
    updatePostLikeCount(postId, count)
  }}
  onComment={(postId) => {
    // Navigate to comments section
    router.push(`/posts/${postId}#comments`)
  }}
  onShare={(postId, shareType) => {
    // Track share analytics
    analytics.track('post_shared', { postId, shareType })
  }}
/>
```

### 📊 Database Schema

```sql
-- Core likes table
CREATE TABLE social_schema.likes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  reaction_type VARCHAR(50) DEFAULT 'like',
  recipient_id VARCHAR(255),
  schema_name VARCHAR(100) DEFAULT 'social_schema',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, content_type, content_id),
  INDEX idx_content_lookup (content_type, content_id),
  INDEX idx_user_likes (user_id),
  INDEX idx_recipient_likes (recipient_id)
);

-- Reaction counts cache
CREATE TABLE social_schema.reaction_counts (
  content_type VARCHAR(50),
  content_id VARCHAR(255),
  reaction_type VARCHAR(50),
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (content_type, content_id, reaction_type)
);
```

### 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis
REDIS_URL="redis://localhost:6379"

# Kafka
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="edu-matrix-like-system"

# Socket.IO
SOCKET_IO_URL="http://localhost:3001"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 🧪 Testing

#### Demo Component:
```typescript
import PostActionsDemo from '@/components/students-interlinked/posts/PostActionsDemo'

// Use the demo component to test all features
<PostActionsDemo />
```

#### API Testing:
```javascript
// Run in browser console
await testUnifiedLikeAPI()
```

### 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] Redis cluster configured
- [ ] Kafka topics created
- [ ] Socket.IO server deployed
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] CDN configured for static assets
- [ ] Monitoring and logging setup
- [ ] Error tracking configured
- [ ] Performance monitoring enabled

### 📚 Best Practices

1. **Always use the unified API** - Don't create custom like endpoints
2. **Enable real-time updates** - Provides better user experience
3. **Handle errors gracefully** - Implement proper error boundaries
4. **Use optimistic UI** - Immediate feedback improves perceived performance
5. **Test all content types** - Ensure consistency across different content
6. **Monitor performance** - Track API response times and error rates
7. **Cache appropriately** - Use Redis for frequently accessed data
8. **Follow accessibility guidelines** - Ensure keyboard navigation and screen reader support

### 🆘 Troubleshooting

#### Common Issues:

**Issue**: Likes not updating in real-time
**Solution**: Check Socket.IO connection and Kafka event publishing

**Issue**: API returning 401 Unauthorized
**Solution**: Verify user authentication and session validity

**Issue**: Database constraint violations
**Solution**: Check for duplicate like entries and unique constraints

**Issue**: React hook not updating
**Solution**: Verify `contentType` and `contentId` props are correct

### 📞 Support

For issues or questions:
1. Check the comprehensive review document
2. Run the verification script
3. Test with the demo component
4. Check API logs and error messages

---

**System Status**: ✅ PRODUCTION-READY  
**Last Updated**: January 8, 2025  
**Version**: 1.0.0
