-- AddForeignKey
ALTER TABLE "social_schema"."SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_schema"."SocialPostComment" ADD CONSTRAINT "SocialPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
