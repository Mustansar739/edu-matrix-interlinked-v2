-- AlterTable
ALTER TABLE "messages_schema"."Conversation" ADD COLUMN     "customSettings" JSONB,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme" TEXT,
ADD COLUMN     "wallpaper" TEXT;
