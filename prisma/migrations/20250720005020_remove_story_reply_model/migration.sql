/*
  Warnings:

  - You are about to drop the `StoryReply` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "social_schema"."StoryReply" DROP CONSTRAINT "StoryReply_storyId_fkey";

-- DropForeignKey
ALTER TABLE "social_schema"."StoryReply" DROP CONSTRAINT "StoryReply_userId_fkey";

-- DropTable
DROP TABLE "social_schema"."StoryReply";
