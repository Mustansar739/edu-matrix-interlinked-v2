-- Check if followersCount column exists in the User table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND table_schema = 'auth_schema' 
  AND column_name = 'followersCount';

-- If the column doesn't exist, add it
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "followersCount" INTEGER NOT NULL DEFAULT 0;

-- Also check for followingCount
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND table_schema = 'auth_schema' 
  AND column_name = 'followingCount';

-- Add followingCount if it doesn't exist
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "followingCount" INTEGER NOT NULL DEFAULT 0;

-- Add endorsementsCount if it doesn't exist
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "endorsementsCount" INTEGER NOT NULL DEFAULT 0;

-- Add totalLikesReceived if it doesn't exist
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "totalLikesReceived" INTEGER NOT NULL DEFAULT 0;

-- Add profileViewsCount if it doesn't exist
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "profileViewsCount" INTEGER NOT NULL DEFAULT 0;

-- Add searchAppearances if it doesn't exist
ALTER TABLE auth_schema."User" 
ADD COLUMN IF NOT EXISTS "searchAppearances" INTEGER NOT NULL DEFAULT 0;
