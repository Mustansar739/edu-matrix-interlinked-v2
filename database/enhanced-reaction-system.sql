-- =============================================================================
-- ENHANCED REACTION SYSTEM DATABASE SCHEMA
-- =============================================================================
-- 
-- PURPOSE:
-- Advanced database schema to support both Universal Like System and 
-- Facebook-style reactions in a single, unified system.
-- 
-- FEATURES:
-- - Hybrid reaction support (simple likes + complex reactions)
-- - Backward compatibility with existing like system
-- - Performance-optimized indexes
-- - Real-time aggregation support
-- - Analytics and reporting capabilities
-- 
-- UPDATED: 2025-01-04
-- =============================================================================

-- Enhanced Universal Reaction Model
-- Supports both simple likes and complex Facebook-style reactions
CREATE TABLE IF NOT EXISTS "UniversalReaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "contentType" TEXT NOT NULL, -- 'post', 'comment', 'story', 'message'
  "contentId" TEXT NOT NULL,
  "reactionType" TEXT NOT NULL, -- 'LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'
  "isUniversalLike" BOOLEAN NOT NULL DEFAULT true, -- true for simple likes, false for reactions
  "reactionMode" TEXT NOT NULL DEFAULT 'universal', -- 'universal', 'facebook', 'auto'
  "weight" DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Reaction weight for algorithms
  "schemaName" TEXT NOT NULL DEFAULT 'social_schema',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  -- Constraints
  CONSTRAINT "UniversalReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UniversalReaction_unique_per_content" UNIQUE("userId", "contentType", "contentId")
);

-- Reaction Analytics Table
-- Stores aggregated reaction data for performance optimization
CREATE TABLE IF NOT EXISTS "ReactionAnalytics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "totalReactions" INTEGER NOT NULL DEFAULT 0,
  "totalLikes" INTEGER NOT NULL DEFAULT 0, -- Universal likes only
  "reactionCounts" JSONB NOT NULL DEFAULT '{}', -- {"LIKE": 5, "LOVE": 3, "LAUGH": 1}
  "reactionWeight" DECIMAL(10,2) NOT NULL DEFAULT 0.0, -- Weighted score
  "topReaction" TEXT, -- Most common reaction type
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "schemaName" TEXT NOT NULL DEFAULT 'social_schema',
  
  -- Constraints
  CONSTRAINT "ReactionAnalytics_unique_content" UNIQUE("contentType", "contentId", "schemaName")
);

-- Reaction Settings Table
-- User preferences for reaction display and behavior
CREATE TABLE IF NOT EXISTS "UserReactionSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "preferredMode" TEXT NOT NULL DEFAULT 'auto', -- 'universal', 'facebook', 'auto'
  "showReactionCounts" BOOLEAN NOT NULL DEFAULT true,
  "enableReactionPicker" BOOLEAN NOT NULL DEFAULT true,
  "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
  "reactionAnimations" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  -- Constraints
  CONSTRAINT "UserReactionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserReactionSettings_userId_unique" UNIQUE("userId")
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS "UniversalReaction_contentType_contentId_idx" ON "UniversalReaction"("contentType", "contentId");
CREATE INDEX IF NOT EXISTS "UniversalReaction_userId_idx" ON "UniversalReaction"("userId");
CREATE INDEX IF NOT EXISTS "UniversalReaction_reactionType_idx" ON "UniversalReaction"("reactionType");
CREATE INDEX IF NOT EXISTS "UniversalReaction_isUniversalLike_idx" ON "UniversalReaction"("isUniversalLike");
CREATE INDEX IF NOT EXISTS "UniversalReaction_createdAt_idx" ON "UniversalReaction"("createdAt");

CREATE INDEX IF NOT EXISTS "ReactionAnalytics_contentType_contentId_idx" ON "ReactionAnalytics"("contentType", "contentId");
CREATE INDEX IF NOT EXISTS "ReactionAnalytics_totalReactions_idx" ON "ReactionAnalytics"("totalReactions");
CREATE INDEX IF NOT EXISTS "ReactionAnalytics_lastUpdated_idx" ON "ReactionAnalytics"("lastUpdated");

-- Trigger Functions for Real-time Updates
-- Automatically update ReactionAnalytics when reactions change

CREATE OR REPLACE FUNCTION update_reaction_analytics()
RETURNS TRIGGER AS $$
DECLARE
  reaction_counts JSONB;
  total_reactions INTEGER;
  total_likes INTEGER;
  weighted_score DECIMAL(10,2);
  top_reaction TEXT;
BEGIN
  -- Calculate aggregated data
  SELECT 
    jsonb_object_agg(reaction_type, reaction_count),
    SUM(reaction_count)::INTEGER,
    SUM(CASE WHEN reaction_type = 'LIKE' THEN reaction_count ELSE 0 END)::INTEGER,
    SUM(reaction_count * weight)::DECIMAL(10,2)
  INTO reaction_counts, total_reactions, total_likes, weighted_score
  FROM (
    SELECT 
      "reactionType" as reaction_type,
      COUNT(*)::INTEGER as reaction_count,
      AVG("weight")::DECIMAL(10,2) as weight
    FROM "UniversalReaction" 
    WHERE "contentType" = COALESCE(NEW."contentType", OLD."contentType") 
      AND "contentId" = COALESCE(NEW."contentId", OLD."contentId")
    GROUP BY "reactionType"
  ) reaction_summary;
  
  -- Find top reaction
  SELECT reaction_type INTO top_reaction
  FROM (
    SELECT 
      "reactionType" as reaction_type,
      COUNT(*) as count
    FROM "UniversalReaction" 
    WHERE "contentType" = COALESCE(NEW."contentType", OLD."contentType") 
      AND "contentId" = COALESCE(NEW."contentId", OLD."contentId")
    GROUP BY "reactionType"
    ORDER BY count DESC
    LIMIT 1
  ) top_reaction_query;
  
  -- Update or insert analytics record
  INSERT INTO "ReactionAnalytics" (
    "id",
    "contentType", 
    "contentId", 
    "totalReactions", 
    "totalLikes",
    "reactionCounts", 
    "reactionWeight",
    "topReaction",
    "lastUpdated",
    "schemaName"
  ) VALUES (
    COALESCE(NEW."contentType", OLD."contentType") || '_' || COALESCE(NEW."contentId", OLD."contentId"),
    COALESCE(NEW."contentType", OLD."contentType"),
    COALESCE(NEW."contentId", OLD."contentId"),
    COALESCE(total_reactions, 0),
    COALESCE(total_likes, 0),
    COALESCE(reaction_counts, '{}'::JSONB),
    COALESCE(weighted_score, 0.0),
    top_reaction,
    CURRENT_TIMESTAMP,
    COALESCE(NEW."schemaName", OLD."schemaName", 'social_schema')
  )
  ON CONFLICT ("contentType", "contentId", "schemaName") 
  DO UPDATE SET
    "totalReactions" = EXCLUDED."totalReactions",
    "totalLikes" = EXCLUDED."totalLikes",
    "reactionCounts" = EXCLUDED."reactionCounts",
    "reactionWeight" = EXCLUDED."reactionWeight",
    "topReaction" = EXCLUDED."topReaction",
    "lastUpdated" = EXCLUDED."lastUpdated";
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS reaction_analytics_trigger ON "UniversalReaction";
CREATE TRIGGER reaction_analytics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "UniversalReaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_reaction_analytics();

-- Migration Script to Convert Existing Likes
-- Run this to migrate existing UniversalLike records to the new system
INSERT INTO "UniversalReaction" (
  "id",
  "userId", 
  "contentType", 
  "contentId", 
  "reactionType", 
  "isUniversalLike",
  "reactionMode",
  "weight",
  "schemaName",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "userId",
  "contentType",
  "contentId",
  'LIKE' as "reactionType",
  true as "isUniversalLike", 
  'universal' as "reactionMode",
  1.0 as "weight",
  "schemaName",
  "createdAt",
  "updatedAt"
FROM "UniversalLike" 
WHERE NOT EXISTS (
  SELECT 1 FROM "UniversalReaction" ur 
  WHERE ur."userId" = "UniversalLike"."userId" 
    AND ur."contentType" = "UniversalLike"."contentType"
    AND ur."contentId" = "UniversalLike"."contentId"
)
ON CONFLICT ("userId", "contentType", "contentId") DO NOTHING;

-- Views for Easy Querying
-- Simplified view for Universal Like compatibility
CREATE OR REPLACE VIEW "UniversalLikeView" AS
SELECT 
  "id",
  "userId",
  "contentType",
  "contentId",
  "schemaName",
  "createdAt",
  "updatedAt"
FROM "UniversalReaction"
WHERE "reactionType" = 'LIKE' AND "isUniversalLike" = true;

-- Comprehensive reaction summary view
CREATE OR REPLACE VIEW "ReactionSummaryView" AS
SELECT 
  r."contentType",
  r."contentId",
  r."schemaName",
  COUNT(*) as "totalReactions",
  COUNT(CASE WHEN r."reactionType" = 'LIKE' THEN 1 END) as "likes",
  COUNT(CASE WHEN r."reactionType" = 'LOVE' THEN 1 END) as "loves", 
  COUNT(CASE WHEN r."reactionType" = 'LAUGH' THEN 1 END) as "laughs",
  COUNT(CASE WHEN r."reactionType" = 'WOW' THEN 1 END) as "wows",
  COUNT(CASE WHEN r."reactionType" = 'SAD' THEN 1 END) as "sads",
  COUNT(CASE WHEN r."reactionType" = 'ANGRY' THEN 1 END) as "angrys",
  AVG(r."weight") as "avgWeight",
  MIN(r."createdAt") as "firstReaction",
  MAX(r."createdAt") as "lastReaction"
FROM "UniversalReaction" r
GROUP BY r."contentType", r."contentId", r."schemaName";

-- Comments for documentation
COMMENT ON TABLE "UniversalReaction" IS 'Enhanced reaction system supporting both Universal likes and Facebook-style reactions';
COMMENT ON TABLE "ReactionAnalytics" IS 'Aggregated reaction data for performance optimization and analytics';
COMMENT ON TABLE "UserReactionSettings" IS 'User preferences for reaction display and behavior';
COMMENT ON FUNCTION update_reaction_analytics() IS 'Automatically updates reaction analytics when reactions change';
COMMENT ON VIEW "UniversalLikeView" IS 'Backward compatibility view for existing Universal Like system';
COMMENT ON VIEW "ReactionSummaryView" IS 'Comprehensive reaction summary for reporting and analytics';
