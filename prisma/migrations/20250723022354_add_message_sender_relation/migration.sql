-- AddForeignKey
ALTER TABLE "messages_schema"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
