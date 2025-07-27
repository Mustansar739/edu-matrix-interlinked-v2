import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/users/[userId]/educational-context - Stub endpoint for user educational context
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: Await params before accessing properties
    const { userId } = await params

    // Return stub educational context for the user
    const educationalContext = {
      userId,
      institutionId: '1',
      institutionName: 'University of Technology',
      major: 'Computer Science',
      level: 'undergraduate',
      year: 'sophomore',
      subjects: ['Computer Science', 'Mathematics'],
      courses: ['CS101', 'CS201', 'MATH101'],
      studyGroups: ['1', '2']
    }

    return NextResponse.json(educationalContext)
  } catch (error) {
    console.error('Error fetching user educational context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch educational context' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[userId]/educational-context - Update user educational context
export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: Await params before accessing properties
    const { userId } = await params
    
    // Check if user can update this context (must be their own)
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contextData = await request.json()
    
    // In a real implementation, this would update the database
    // For now, just return the updated context
    const updatedContext = {
      userId,
      ...contextData,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(updatedContext)
  } catch (error) {
    console.error('Error updating user educational context:', error)
    return NextResponse.json(
      { error: 'Failed to update educational context' },
      { status: 500 }
    )
  }
}
