/**
 * ==========================================
 * STORY SYSTEM TEST API - TEMPORARY DEBUGGING
 * ==========================================
 * 
 * Creates test data to verify story visibility system
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 Creating test stories for debugging...')

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create a test PUBLIC story from current user
    const publicStory = await prisma.story.create({
      data: {
        content: `Test PUBLIC story from ${currentUser.name} - ${new Date().toLocaleTimeString()}`,
        visibility: 'PUBLIC',
        authorId: currentUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        allowReplies: true,
        allowReactions: true,
      }
    })

    // Create a test FOLLOWERS story from current user
    const followersStory = await prisma.story.create({
      data: {
        content: `Test FOLLOWERS story from ${currentUser.name} - ${new Date().toLocaleTimeString()}`,
        visibility: 'FOLLOWERS',
        authorId: currentUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        allowReplies: true,
        allowReactions: true,
      }
    })

    // Create a test PRIVATE story from current user
    const privateStory = await prisma.story.create({
      data: {
        content: `Test PRIVATE story from ${currentUser.name} - ${new Date().toLocaleTimeString()}`,
        visibility: 'PRIVATE',
        authorId: currentUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        allowReplies: true,
        allowReactions: true,
      }
    })

    console.log('✅ Created test stories:', {
      publicStory: publicStory.id,
      followersStory: followersStory.id,
      privateStory: privateStory.id
    })

    // Get all stories to verify
    const allStories = await prisma.story.findMany({
      where: {
        authorId: currentUser.id,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        content: true,
        visibility: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      success: true,
      message: 'Test stories created successfully',
      created: {
        publicStory: { id: publicStory.id, content: publicStory.content },
        followersStory: { id: followersStory.id, content: followersStory.content },
        privateStory: { id: privateStory.id, content: privateStory.content }
      },
      allUserStories: allStories,
      instructions: 'Now test the stories API to see if visibility works correctly'
    })

  } catch (error) {
    console.error('❌ Test creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create test stories' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clean up test stories
    const deleted = await prisma.story.deleteMany({
      where: {
        authorId: session.user.id,
        content: {
          contains: 'Test'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} test stories`
    })

  } catch (error) {
    console.error('❌ Test cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean up test stories' },
      { status: 500 }
    )
  }
}
