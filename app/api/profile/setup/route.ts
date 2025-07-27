import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Validate username format
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
      }, { status: 400 })
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    // Update user with username
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        username,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    })

    return NextResponse.json({ 
      success: true,
      user: updatedUser 
    })

  } catch (error) {
    console.error('Profile setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup profile' },
      { status: 500 }
    )
  }
}
