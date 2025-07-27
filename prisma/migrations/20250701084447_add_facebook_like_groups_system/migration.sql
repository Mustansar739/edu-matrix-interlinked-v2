-- CreateEnum
CREATE TYPE "social_schema"."GroupType" AS ENUM ('PUBLIC', 'PRIVATE', 'SECRET');

-- CreateEnum
CREATE TYPE "social_schema"."GroupPrivacy" AS ENUM ('PUBLIC', 'PRIVATE', 'SECRET');

-- CreateEnum
CREATE TYPE "social_schema"."GroupVisibility" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "social_schema"."GroupCategory" AS ENUM ('EDUCATION', 'STUDY_GROUPS', 'ACADEMIC_SUBJECTS', 'INSTITUTIONS', 'CAREER_DEVELOPMENT', 'HOBBIES', 'SPORTS', 'TECHNOLOGY', 'ARTS_CULTURE', 'SOCIAL_CAUSES', 'LOCAL_COMMUNITY', 'PROFESSIONAL', 'ENTERTAINMENT', 'HEALTH_WELLNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "social_schema"."GroupMemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "social_schema"."GroupPostType" AS ENUM ('GENERAL', 'ANNOUNCEMENT', 'QUESTION', 'DISCUSSION', 'EVENT', 'POLL', 'RESOURCE_SHARE', 'ACHIEVEMENT', 'WELCOME');

-- CreateEnum
CREATE TYPE "social_schema"."JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "social_schema"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "social_schema"."SocialGroup" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "about" TEXT,
    "coverPhotoUrl" TEXT,
    "profilePhotoUrl" TEXT,
    "groupType" "social_schema"."GroupType" NOT NULL DEFAULT 'PUBLIC',
    "privacy" "social_schema"."GroupPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "visibility" "social_schema"."GroupVisibility" NOT NULL DEFAULT 'VISIBLE',
    "category" "social_schema"."GroupCategory" NOT NULL DEFAULT 'EDUCATION',
    "subcategory" TEXT,
    "tags" TEXT[],
    "rules" TEXT[],
    "guidelines" TEXT,
    "location" TEXT,
    "website" TEXT,
    "email" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "activeMembers" INTEGER NOT NULL DEFAULT 1,
    "allowMemberPosts" BOOLEAN NOT NULL DEFAULT true,
    "requirePostApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowMemberInvites" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "social_schema"."GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "postPermissions" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupModerator" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GroupModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupPost" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "videoUrls" TEXT[],
    "documentUrls" TEXT[],
    "postType" "social_schema"."GroupPostType" NOT NULL DEFAULT 'GENERAL',
    "tags" TEXT[],
    "status" "social_schema"."SocialPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupPostCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPostCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupPostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPostShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupJoinRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "social_schema"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."GroupInvitation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "message" TEXT,
    "status" "social_schema"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialGroup_category_privacy_idx" ON "social_schema"."SocialGroup"("category", "privacy");

-- CreateIndex
CREATE INDEX "SocialGroup_createdById_idx" ON "social_schema"."SocialGroup"("createdById");

-- CreateIndex
CREATE INDEX "SocialGroup_groupType_isActive_idx" ON "social_schema"."SocialGroup"("groupType", "isActive");

-- CreateIndex
CREATE INDEX "SocialGroup_privacy_isActive_idx" ON "social_schema"."SocialGroup"("privacy", "isActive");

-- CreateIndex
CREATE INDEX "SocialGroup_memberCount_isActive_idx" ON "social_schema"."SocialGroup"("memberCount", "isActive");

-- CreateIndex
CREATE INDEX "SocialGroup_createdAt_isActive_idx" ON "social_schema"."SocialGroup"("createdAt", "isActive");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_role_idx" ON "social_schema"."GroupMember"("groupId", "role");

-- CreateIndex
CREATE INDEX "GroupMember_userId_isActive_idx" ON "social_schema"."GroupMember"("userId", "isActive");

-- CreateIndex
CREATE INDEX "GroupMember_joinedAt_isActive_idx" ON "social_schema"."GroupMember"("joinedAt", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "social_schema"."GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupModerator_groupId_isActive_idx" ON "social_schema"."GroupModerator"("groupId", "isActive");

-- CreateIndex
CREATE INDEX "GroupModerator_userId_isActive_idx" ON "social_schema"."GroupModerator"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GroupModerator_groupId_userId_key" ON "social_schema"."GroupModerator"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_status_idx" ON "social_schema"."GroupPost"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupPost_authorId_status_idx" ON "social_schema"."GroupPost"("authorId", "status");

-- CreateIndex
CREATE INDEX "GroupPost_createdAt_pinned_idx" ON "social_schema"."GroupPost"("createdAt", "pinned");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_postType_idx" ON "social_schema"."GroupPost"("groupId", "postType");

-- CreateIndex
CREATE INDEX "GroupPost_status_requiresApproval_idx" ON "social_schema"."GroupPost"("status", "requiresApproval");

-- CreateIndex
CREATE INDEX "GroupPostLike_postId_idx" ON "social_schema"."GroupPostLike"("postId");

-- CreateIndex
CREATE INDEX "GroupPostLike_userId_idx" ON "social_schema"."GroupPostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPostLike_postId_userId_key" ON "social_schema"."GroupPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "GroupPostComment_postId_createdAt_idx" ON "social_schema"."GroupPostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupPostComment_userId_idx" ON "social_schema"."GroupPostComment"("userId");

-- CreateIndex
CREATE INDEX "GroupPostComment_parentId_idx" ON "social_schema"."GroupPostComment"("parentId");

-- CreateIndex
CREATE INDEX "GroupPostCommentLike_commentId_idx" ON "social_schema"."GroupPostCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "GroupPostCommentLike_userId_idx" ON "social_schema"."GroupPostCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPostCommentLike_commentId_userId_key" ON "social_schema"."GroupPostCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "GroupPostShare_postId_idx" ON "social_schema"."GroupPostShare"("postId");

-- CreateIndex
CREATE INDEX "GroupPostShare_userId_idx" ON "social_schema"."GroupPostShare"("userId");

-- CreateIndex
CREATE INDEX "GroupPostShare_groupId_idx" ON "social_schema"."GroupPostShare"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPostShare_postId_userId_groupId_key" ON "social_schema"."GroupPostShare"("postId", "userId", "groupId");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_groupId_status_idx" ON "social_schema"."GroupJoinRequest"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_userId_status_idx" ON "social_schema"."GroupJoinRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_status_createdAt_idx" ON "social_schema"."GroupJoinRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupJoinRequest_groupId_userId_key" ON "social_schema"."GroupJoinRequest"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_status_idx" ON "social_schema"."GroupInvitation"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupInvitation_inviteeId_status_idx" ON "social_schema"."GroupInvitation"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "GroupInvitation_inviterId_status_idx" ON "social_schema"."GroupInvitation"("inviterId", "status");

-- CreateIndex
CREATE INDEX "GroupInvitation_status_expiresAt_idx" ON "social_schema"."GroupInvitation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_groupId_inviteeId_key" ON "social_schema"."GroupInvitation"("groupId", "inviteeId");

-- AddForeignKey
ALTER TABLE "social_schema"."GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "social_schema"."SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupModerator" ADD CONSTRAINT "GroupModerator_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "social_schema"."SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPost" ADD CONSTRAINT "GroupPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "social_schema"."SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPostLike" ADD CONSTRAINT "GroupPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_schema"."GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPostComment" ADD CONSTRAINT "GroupPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_schema"."GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPostComment" ADD CONSTRAINT "GroupPostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "social_schema"."GroupPostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPostCommentLike" ADD CONSTRAINT "GroupPostCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "social_schema"."GroupPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupPostShare" ADD CONSTRAINT "GroupPostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_schema"."GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "social_schema"."SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "social_schema"."SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
