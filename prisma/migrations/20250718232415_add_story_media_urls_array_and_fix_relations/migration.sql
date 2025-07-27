/*
  Warnings:

  - Added the required column `updatedAt` to the `Story` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "social_schema"."Story_authorId_expiresAt_idx";

-- AlterTable
ALTER TABLE "social_schema"."Story" ADD COLUMN     "mediaTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Story_authorId_expiresAt_createdAt_idx" ON "social_schema"."Story"("authorId", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "Story_visibility_expiresAt_idx" ON "social_schema"."Story"("visibility", "expiresAt");

-- AddForeignKey
ALTER TABLE "social_schema"."Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
