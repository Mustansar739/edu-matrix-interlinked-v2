-- AlterTable
ALTER TABLE "social_schema"."Story" ALTER COLUMN "visibility" SET DEFAULT 'FOLLOWERS';

-- CreateIndex
CREATE INDEX "Follow_followerId_status_idx" ON "social_schema"."Follow"("followerId", "status");

-- CreateIndex
CREATE INDEX "Follow_followingId_status_idx" ON "social_schema"."Follow"("followingId", "status");

-- CreateIndex
CREATE INDEX "Follow_status_createdAt_idx" ON "social_schema"."Follow"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "social_schema"."Story"("expiresAt");

-- CreateIndex
CREATE INDEX "StoryReaction_storyId_createdAt_idx" ON "social_schema"."StoryReaction"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryReaction_userId_createdAt_idx" ON "social_schema"."StoryReaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryReply_userId_createdAt_idx" ON "social_schema"."StoryReply"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryView_storyId_viewedAt_idx" ON "social_schema"."StoryView"("storyId", "viewedAt");

-- CreateIndex
CREATE INDEX "StoryView_userId_viewedAt_idx" ON "social_schema"."StoryView"("userId", "viewedAt");

-- AddForeignKey
ALTER TABLE "social_schema"."StoryView" ADD CONSTRAINT "StoryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."StoryReaction" ADD CONSTRAINT "StoryReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."StoryReply" ADD CONSTRAINT "StoryReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
