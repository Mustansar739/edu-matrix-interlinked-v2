-- AddForeignKey
ALTER TABLE "messages_schema"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_user_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
