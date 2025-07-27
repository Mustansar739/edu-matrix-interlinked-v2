import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'followers' or 'following'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Validate parameters
    if (!type || !['followers', 'following'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Use "followers" or "following"' },
        { status: 400 }
      )
    }

    // Check Redis cache first for performance
    const cacheKey = `follow_list:${userId}:${type}:${page}:${limit}`
    
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        console.log(`🔥 FOLLOW LIST CACHE HIT: ${cacheKey}`)
        return NextResponse.json(JSON.parse(cachedResult))
      }
    } catch (cacheError) {
      console.warn('Redis cache error (non-critical):', cacheError)
    }

    console.log(`📊 FOLLOW LIST: Fetching ${type} for user ${userId}, page ${page}, limit ${limit}`)

    // Check if user exists with optimized query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        profileVisibility: true,
        followersCount: true,
        followingCount: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const session = await auth()
    const currentUserId = session?.user?.id

    // Check privacy settings
    if (user.profileVisibility === 'PRIVATE' && currentUserId !== userId) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      )
    }

    let result: any

    if (type === 'followers') {
      // PRODUCTION OPTIMIZATION: Single optimized query with join
      const followersData = await prisma.follow.findMany({
        where: {
          followingId: userId,
          status: 'ACCEPTED'
        },
        select: {
          followerId: true,
          createdAt: true,
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePictureUrl: true,
              avatar: true,
              headline: true,
              profession: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      })

      // Transform the data efficiently
      const followers = followersData.map(relation => ({
        id: relation.follower.id,
        name: relation.follower.name,
        username: relation.follower.username,
        profilePictureUrl: relation.follower.profilePictureUrl || relation.follower.avatar,
        headline: relation.follower.headline,
        profession: relation.follower.profession,
        isVerified: relation.follower.isVerified,
        followedAt: relation.createdAt
      }))

      // Use cached count if available, otherwise count
      const total = user.followersCount || await prisma.follow.count({
        where: {
          followingId: userId,
          status: 'ACCEPTED'
        }
      })

      result = {
        users: followers,
        total,
        page,
        hasMore: skip + limit < total,
        type: 'followers'
      }

    } else if (type === 'following') {
      // PRODUCTION OPTIMIZATION: Single optimized query with join
      const followingData = await prisma.follow.findMany({
        where: {
          followerId: userId,
          status: 'ACCEPTED'
        },
        select: {
          followingId: true,
          createdAt: true,
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePictureUrl: true,
              avatar: true,
              headline: true,
              profession: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      })

      // Transform the data efficiently
      const following = followingData.map(relation => ({
        id: relation.following.id,
        name: relation.following.name,
        username: relation.following.username,
        profilePictureUrl: relation.following.profilePictureUrl || relation.following.avatar,
        headline: relation.following.headline,
        profession: relation.following.profession,
        isVerified: relation.following.isVerified,
        followedAt: relation.createdAt
      }))

      // Use cached count if available, otherwise count
      const total = user.followingCount || await prisma.follow.count({
        where: {
          followerId: userId,
          status: 'ACCEPTED'
        }
      })

      result = {
        users: following,
        total,
        page,
        hasMore: skip + limit < total,
        type: 'following'
      }
    }

    // Cache the result for 5 minutes (balance between performance and freshness)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result))
      console.log(`✅ FOLLOW LIST CACHED: ${cacheKey}`)
    } catch (cacheError) {
      console.warn('Redis cache set error (non-critical):', cacheError)
    }

    console.log(`✅ FOLLOW LIST: Returning ${result.users.length} ${type} for user ${userId}`)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Followers/Following list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
