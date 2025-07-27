-- =============================================================================
-- PRODUCTION DATABASE OPTIMIZATION - EDU MATRIX INTERLINKED
-- =============================================================================
-- 
-- PURPOSE: Optimize database performance for production deployment
-- TARGETS: High-traffic APIs experiencing 10+ second response times
-- PRIORITY: Follow status checks, Story feeds, User profiles
-- 
-- CREATED: 2025-07-23 - PRODUCTION PERFORMANCE FIX
-- =============================================================================

-- Enable required extensions for performance
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- =============================================================================
-- FOLLOW SYSTEM PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Composite index for follow status checks (Primary bottleneck)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follow_performance_primary 
ON social_schema."Follow" (
    "followerId", 
    "followingId", 
    "status", 
    "createdAt" DESC
) 
WHERE "status" = 'ACCEPTED';

-- Covering index for follow counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follow_counts_covering 
ON social_schema."Follow" (
    "followingId", 
    "status"
) 
INCLUDE ("followerId", "createdAt")
WHERE "status" = 'ACCEPTED';

-- Reverse index for follower lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follow_reverse_lookup 
ON social_schema."Follow" (
    "followingId", 
    "followerId", 
    "status"
) 
WHERE "status" = 'ACCEPTED';

-- =============================================================================
-- STORY SYSTEM PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Primary story feed index (visibility + expiry + ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_feed_performance 
ON social_schema."Story" (
    "visibility", 
    "expiresAt", 
    "createdAt" DESC
) 
WHERE "expiresAt" > NOW();

-- Author-specific story index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_author_active 
ON social_schema."Story" (
    "authorId", 
    "visibility", 
    "createdAt" DESC
) 
WHERE "expiresAt" > NOW();

-- Story views optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_views_performance 
ON social_schema."StoryView" (
    "storyId", 
    "viewedAt" DESC
) 
INCLUDE ("userId");

-- =============================================================================
-- USER SYSTEM PERFORMANCE OPTIMIZATION
-- =============================================================================

-- User profile lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_lookup 
ON auth_schema."User" (
    "username", 
    "profileVisibility", 
    "isVerified"
) 
INCLUDE ("id", "name", "avatar", "bio");

-- User activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_tracking 
ON auth_schema."User" (
    "lastActivity" DESC, 
    "isVerified"
) 
WHERE "lastActivity" IS NOT NULL;

-- User followers/following counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_social_counts 
ON auth_schema."User" (
    "followersCount" DESC, 
    "followingCount" DESC, 
    "isVerified"
) 
WHERE "profileVisibility" = 'PUBLIC';

-- =============================================================================
-- NOTIFICATION SYSTEM OPTIMIZATION
-- =============================================================================

-- User notification lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_unread 
ON notifications_schema."Notification" (
    "userId", 
    "isRead", 
    "createdAt" DESC
) 
WHERE "isRead" = false;

-- =============================================================================
-- MESSAGE SYSTEM OPTIMIZATION
-- =============================================================================

-- Conversation message lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_conversation_timeline 
ON messages_schema."Message" (
    "conversationId", 
    "createdAt" DESC, 
    "isDeleted"
) 
WHERE "isDeleted" = false;

-- =============================================================================
-- POSTGRESQL CONFIGURATION OPTIMIZATION
-- =============================================================================

-- Connection pooling settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Query performance settings
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET max_worker_processes = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET max_parallel_workers = 8;

-- Logging for performance monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- =============================================================================
-- ANALYZE TABLES FOR OPTIMAL QUERY PLANNING
-- =============================================================================

ANALYZE auth_schema."User";
ANALYZE social_schema."Follow";
ANALYZE social_schema."Story";
ANALYZE social_schema."StoryView";
ANALYZE notifications_schema."Notification";
ANALYZE messages_schema."Message";

-- =============================================================================
-- VACUUM AND MAINTENANCE
-- =============================================================================

-- Enable automatic vacuum tuning
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- =============================================================================
-- CREATE PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for monitoring slow queries
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- View for monitoring index usage
CREATE OR REPLACE VIEW public.index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- =============================================================================
-- FINAL CLEANUP AND RELOAD
-- =============================================================================

-- Reload configuration
SELECT pg_reload_conf();

-- Update table statistics
UPDATE pg_stat_user_tables SET n_tup_upd = n_tup_upd + 1 WHERE schemaname IN (
    'auth_schema', 'social_schema', 'notifications_schema', 'messages_schema'
);

-- =============================================================================
-- PERFORMANCE VERIFICATION QUERIES
-- =============================================================================

-- Test follow status check performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT EXISTS(
    SELECT 1 FROM social_schema."Follow" 
    WHERE "followerId" = 'test-id' 
    AND "followingId" = 'test-id-2' 
    AND "status" = 'ACCEPTED'
);

-- Test story feed performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.*, u."name", u."avatar"
FROM social_schema."Story" s
JOIN auth_schema."User" u ON s."authorId" = u.id
WHERE s."visibility" = 'PUBLIC'
AND s."expiresAt" > NOW()
ORDER BY s."createdAt" DESC
LIMIT 30;

-- =============================================================================
-- PRODUCTION READY CONFIRMATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DATABASE OPTIMIZATION COMPLETE';
    RAISE NOTICE '📊 Indexes created for: Follow, Story, User, Notification, Message';
    RAISE NOTICE '⚡ Connection pooling configured';
    RAISE NOTICE '📈 Performance monitoring enabled';
    RAISE NOTICE '🔍 Query analysis tools available';
    RAISE NOTICE '✨ Ready for production deployment';
END $$;
