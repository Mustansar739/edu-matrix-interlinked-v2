import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// TODO: Install @vercel/blob package for production
// import { put } from '@vercel/blob';
import { z } from 'zod';

const uploadSchema = z.object({
  conversationId: z.string().uuid(),
  messageType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const conversationId = formData.get('conversationId') as string;
    const messageType = formData.get('messageType') as string;

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate input
    const { conversationId: validConversationId, messageType: validMessageType } = uploadSchema.parse({
      conversationId,
      messageType,
    });

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: validConversationId,
        userId: session.user.id,
        isHidden: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Upload files and create message
    const uploadedFiles = [];
    const mediaUrls = [];
    const mediaMetadata = [];

    for (const file of files) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large (max 10MB)` 
        }, { status: 400 });
      }      // TODO: Implement proper file upload with @vercel/blob or other storage solution
      // For now, creating a mock URL
      const mockUrl = `/uploads/messages/${validConversationId}/${Date.now()}-${file.name}`;

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: mockUrl,
      });

      mediaUrls.push(mockUrl);
      mediaMetadata.push({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      });
    }

    // Create message with media
    const message = await prisma.message.create({
      data: {
        conversationId: validConversationId,
        senderId: session.user.id,
        content: `Shared ${files.length} file(s)`,
        messageType: validMessageType,
        mediaUrls,
        mediaMetadata: { files: mediaMetadata },
      },
      include: {
        reactions: true,
        reads: true,
      },
    });

    // Update conversation last activity
    await prisma.conversation.update({
      where: { id: validConversationId },
      data: { lastActivity: new Date() },
    });

    return NextResponse.json({
      message,
      uploadedFiles,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
