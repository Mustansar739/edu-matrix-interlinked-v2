/**
 * ==========================================
 * POSTS API WITH REDIS CACHING
 * ==========================================
 * Example showing Redis cache integration
 * Using ONLY official ioredis methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch user's posts with Redis caching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    
    // 1. Try Redis cache first (OFFICIAL ioredis method)
    console.log('🔍 Checking Redis cache for user posts...');
    const cachedPosts = await redisService.getUserPosts(userId);
    
    if (cachedPosts) {
      console.log('✅ Cache HIT - Returning cached posts');
      return NextResponse.json({
        posts: cachedPosts,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }    // 2. Cache MISS - Fetch from database
    console.log('❌ Cache MISS - Fetching from database...');
    const postsFromDB = await prisma.socialPost.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // 3. Cache the results (OFFICIAL ioredis method)
    if (postsFromDB.length > 0) {
      console.log('💾 Caching posts in Redis...');
      await redisService.cacheUserPosts(userId, postsFromDB, 1800); // 30 minutes
    }

    return NextResponse.json({
      posts: postsFromDB,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Posts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST: Create new post and invalidate cache
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    
    // Only allow users to create posts for themselves
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();    const { content, images, tags } = body;

    // 1. Create post in database
    const newPost = await prisma.socialPost.create({
      data: {
        content,
        imageUrls: images || [],
        tags: tags || [],
        authorId: userId,
      }
    });

    // 2. Cache the individual post (OFFICIAL ioredis method)
    await redisService.cachePost(newPost.id, newPost, 3600); // 1 hour

    // 3. Invalidate related caches (OFFICIAL ioredis methods)    console.log('🗑️ Invalidating caches...');
    await Promise.all([
      // Clear user's posts cache
      redisService.deleteCache(`user_posts:${userId}`),
      // Clear user's feed cache
      redisService.deleteCache(`feed:${userId}`),
      // Clear community feeds if user belongs to institutions
      redisService.deleteCachePattern(`community_feed:*`), // Pattern deletion
      // Clear trending posts
      redisService.deleteCachePattern('trending:*')
    ]);

    console.log('✅ Post created and caches invalidated');

    return NextResponse.json({
      post: newPost,
      message: 'Post created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Create post error:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

// DELETE: Delete post and invalidate cache
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Verify ownership
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post || post.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
    }

    // 1. Delete from database
    await prisma.socialPost.delete({
      where: { id: postId }
    });    // 2. Remove from all caches (OFFICIAL ioredis methods)
    console.log('🗑️ Removing from caches...');
    await Promise.all([
      // Remove individual post cache
      redisService.deleteCache(`post:${postId}`),
      // Remove post interactions cache
      redisService.deleteCache(`interactions:${postId}`),
      // Clear user's posts cache
      redisService.deleteCache(`user_posts:${session.user.id}`),
      // Clear user's feed cache
      redisService.deleteCache(`feed:${session.user.id}`),
      // Clear community feeds
      redisService.deleteCachePattern(`community_feed:*`),
      // Clear trending posts
      redisService.deleteCachePattern('trending:*')
    ]);

    console.log('✅ Post deleted and caches cleared');

    return NextResponse.json({
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete post error:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
