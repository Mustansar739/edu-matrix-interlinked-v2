-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notifications_schema"."NotificationType" ADD VALUE 'PROFILE_LIKED';
ALTER TYPE "notifications_schema"."NotificationType" ADD VALUE 'PROFILE_SHARED';

-- AlterTable
ALTER TABLE "auth_schema"."User" ADD COLUMN     "sharingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auth_schema"."ProfileShare" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sharerId" TEXT,
    "platform" TEXT NOT NULL,
    "shareUrl" TEXT NOT NULL,
    "message" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileShare_profileId_createdAt_idx" ON "auth_schema"."ProfileShare"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileShare_sharerId_createdAt_idx" ON "auth_schema"."ProfileShare"("sharerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileShare_platform_createdAt_idx" ON "auth_schema"."ProfileShare"("platform", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileShare_profileId_platform_idx" ON "auth_schema"."ProfileShare"("profileId", "platform");

-- AddForeignKey
ALTER TABLE "auth_schema"."ProfileShare" ADD CONSTRAINT "ProfileShare_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."ProfileShare" ADD CONSTRAINT "ProfileShare_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
