-- Production-ready performance indexes for nested comments system
-- These indexes optimize queries for nested comment retrieval and depth calculations

-- Index for fetching comments by post and parent relationship (most common query)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_post_parent 
ON "SocialPostComment" ("postId", "parentId");

-- Index for ordering comments by creation date (for pagination and sorting)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_created_at 
ON "SocialPostComment" ("createdAt" DESC);

-- Index for finding parent comment hierarchy (for depth calculation)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_parent_id 
ON "SocialPostComment" ("parentId") 
WHERE "parentId" IS NOT NULL;

-- Index for user's comments (for profile pages and user-specific queries)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_user_created 
ON "SocialPostComment" ("userId", "createdAt" DESC);

-- Composite index for nested comment queries with like counts (for popular sorting)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_post_likes 
ON "SocialPostComment" ("postId", "likeCount" DESC, "createdAt" DESC);

-- Index for reply count updates (when parent comments need reply count updates)
CREATE INDEX IF NOT EXISTS idx_social_post_comment_reply_count 
ON "SocialPostComment" ("parentId", "replyCount") 
WHERE "parentId" IS NOT NULL;
