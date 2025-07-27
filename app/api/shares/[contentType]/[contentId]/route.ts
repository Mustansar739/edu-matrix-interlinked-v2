/**
 * @fileoverview General Content Sharing API (Simplified)
 * @module ContentSharingAPI
 * @category API
 * 
 * @description
 * Handle sharing of various content types (posts, messages, documents, etc.)
 * - Official Next.js 15 App Router patterns with async params
 * - NextAuth.js 5.0 for authentication  
 * - Simplified implementation without persistent share tracking
 * - Content-type agnostic sharing with URL generation
 * - Rate limiting for production performance
 */

// ==========================================
// GENERAL CONTENT SHARING API (SIMPLIFIED)
// ==========================================
// Handle sharing of various content types (posts, messages, documents, etc.)
// This API endpoint provides share URLs for different content types
// NOTE: This is a simplified implementation without persistent share tracking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/cache';

// Schema for creating a share
const createShareSchema = z.object({
  platform: z.enum(['INTERNAL', 'EMAIL', 'FACEBOOK', 'TWITTER', 'LINKEDIN', 'WHATSAPP']).default('INTERNAL'),
  message: z.string().max(500).optional(),
});

// GET /api/shares/[contentType]/[contentId] - Get shareable URL for content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string; contentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentType, contentId } = await params;

    // Validate content type
    const validContentTypes = ['post', 'message', 'document', 'event', 'profile'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ 
        error: 'Invalid content type',
        validTypes: validContentTypes 
      }, { status: 400 });
    }

    // Generate share URL (simplified - no persistent tracking for now)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${contentType}/${contentId}`;
    
    return NextResponse.json({
      success: true,
      shareUrl,
      contentType,
      contentId,
      note: 'This is a simplified share implementation without persistent tracking',
    });

  } catch (error) {
    console.error('Get share URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shares/[contentType]/[contentId] - Create a shareable URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string; contentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for shares
    const rateLimit = await checkRateLimit(`share:${session.user.id}`, 50, 3600); // 50/hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many shares',
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const { contentType, contentId } = await params;
    const data = createShareSchema.parse(await request.json());

    // Validate content type
    const validContentTypes = ['post', 'message', 'document', 'event', 'profile'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ 
        error: 'Invalid content type',
        validTypes: validContentTypes 
      }, { status: 400 });
    }

    // Verify content exists and user has permission to share
    let contentExists = false;
    let hasPermission = false;

    switch (contentType) {
      case 'post':
        const post = await prisma.socialPost.findUnique({
          where: { id: contentId },
          select: { 
            id: true, 
            authorId: true, 
            visibility: true, 
            status: true 
          },
        });
        contentExists = !!post && post.status !== 'DELETED';
        hasPermission = !!(contentExists && post && (
          post.visibility === 'PUBLIC' || 
          post.authorId === session.user.id
        ));
        break;

      case 'message':
        const message = await prisma.message.findFirst({
          where: { 
            id: contentId,
            conversation: {
              participants: {
                some: {
                  userId: session.user.id,
                  isHidden: false,
                },
              },
            },
          },
        });
        contentExists = !!message;
        hasPermission = contentExists;
        break;

      case 'profile':
        const profile = await prisma.user.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!profile;
        hasPermission = contentExists; // Profiles are generally shareable
        break;

      default:
        // For document, event, etc., we'll assume they exist for now
        contentExists = true;
        hasPermission = true;
        break;
    }

    if (!contentExists) {
      return NextResponse.json({ 
        error: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} not found` 
      }, { status: 404 });
    }

    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'Permission denied to share this content' 
      }, { status: 403 });
    }

    // Generate share URL (simplified)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${contentType}/${contentId}?shared=true&by=${session.user.id}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      platform: data.platform,
      message: data.message,
      contentType,
      contentId,
      note: 'Share URL generated successfully (simplified implementation)',
    });

  } catch (error) {
    console.error('Create share error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shares/[contentType]/[contentId] - Placeholder for future implementation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string; contentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentType, contentId } = await params;

    return NextResponse.json({
      success: true,
      message: 'Share management not implemented in simplified version',
      note: 'This would revoke shares in a full implementation',
    });

  } catch (error) {
    console.error('Revoke share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
