import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if username is valid format
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
      }, { status: 400 })
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    })

    return NextResponse.json({ 
      available: !existingUser,
      username 
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    )
  }
}
