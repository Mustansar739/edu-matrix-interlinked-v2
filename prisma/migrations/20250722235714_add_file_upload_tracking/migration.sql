-- CreateEnum
CREATE TYPE "social_schema"."UploadType" AS ENUM ('PROFILE_AVATAR', 'PROFILE_COVER', 'POST_IMAGE', 'MESSAGE_IMAGE', 'DOCUMENT');

-- DropForeignKey
ALTER TABLE "social_schema"."SocialPost" DROP CONSTRAINT "SocialPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "social_schema"."SocialPostComment" DROP CONSTRAINT "SocialPostComment_userId_fkey";

-- CreateTable
CREATE TABLE "social_schema"."FileUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadType" "social_schema"."UploadType" NOT NULL,
    "imagekitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileUpload_userId_idx" ON "social_schema"."FileUpload"("userId");

-- CreateIndex
CREATE INDEX "FileUpload_uploadType_idx" ON "social_schema"."FileUpload"("uploadType");

-- CreateIndex
CREATE INDEX "FileUpload_createdAt_idx" ON "social_schema"."FileUpload"("createdAt");

-- AddForeignKey
ALTER TABLE "social_schema"."FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
