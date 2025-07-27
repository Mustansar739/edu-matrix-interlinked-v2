/*
  Warnings:

  - The values [FRIEND_REQUEST,FRIEND_ACCEPTED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `connectionsCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Friend` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "notifications_schema"."NotificationType_new" AS ENUM ('SYSTEM_ALERT', 'COURSE_UPDATE', 'ASSIGNMENT_DUE', 'GRADE_POSTED', 'ENROLLMENT_CONFIRMED', 'CERTIFICATE_ISSUED', 'ACHIEVEMENT_UNLOCKED', 'POST_LIKED', 'POST_COMMENTED', 'POST_SHARED', 'COMMENT_LIKED', 'COMMENT_REPLIED', 'STORY_VIEWED', 'STORY_LIKED', 'STORY_COMMENTED', 'FOLLOW_REQUEST', 'USER_FOLLOWED', 'CONNECTION_REQUEST', 'MESSAGE_RECEIVED', 'MESSAGE_READ', 'MENTION_IN_POST', 'MENTION_IN_COMMENT', 'TAG_IN_POST', 'FEEDBACK_RESPONSE', 'JOB_APPLICATION', 'FREELANCE_PROPOSAL', 'NEWS_PUBLISHED', 'EVENT_REMINDER', 'PAYMENT_RECEIVED', 'PAYMENT_PENDING', 'SUBSCRIPTION_EXPIRING');
ALTER TABLE "notifications_schema"."Notification" ALTER COLUMN "type" TYPE "notifications_schema"."NotificationType_new" USING ("type"::text::"notifications_schema"."NotificationType_new");
ALTER TABLE "notifications_schema"."NotificationTemplate" ALTER COLUMN "type" TYPE "notifications_schema"."NotificationType_new" USING ("type"::text::"notifications_schema"."NotificationType_new");
ALTER TABLE "notifications_schema"."NotificationGroup" ALTER COLUMN "type" TYPE "notifications_schema"."NotificationType_new" USING ("type"::text::"notifications_schema"."NotificationType_new");
ALTER TYPE "notifications_schema"."NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "notifications_schema"."NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "notifications_schema"."NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "auth_schema"."User" DROP COLUMN "connectionsCount",
ADD COLUMN     "followersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followingCount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "social_schema"."Friend";

-- DropEnum
DROP TYPE "social_schema"."FriendStatus";

-- CreateTable
CREATE TABLE "social_schema"."SocialPostPoll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isEducational" BOOLEAN NOT NULL DEFAULT false,
    "correctAnswer" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanation" TEXT,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPostPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."SocialPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_schema"."SocialPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostPoll_postId_key" ON "social_schema"."SocialPostPoll"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPollVote_pollId_optionId_userId_key" ON "social_schema"."SocialPollVote"("pollId", "optionId", "userId");

-- AddForeignKey
ALTER TABLE "social_schema"."SocialPostPoll" ADD CONSTRAINT "SocialPostPoll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_schema"."SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."SocialPollOption" ADD CONSTRAINT "SocialPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "social_schema"."SocialPostPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."SocialPollVote" ADD CONSTRAINT "SocialPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "social_schema"."SocialPostPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."SocialPollVote" ADD CONSTRAINT "SocialPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "social_schema"."SocialPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
