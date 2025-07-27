import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/educational/subjects - Stub endpoint for educational subjects
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return stub data for subjects
    const subjects = [
      {
        id: '1',
        name: 'Computer Science',
        category: 'STEM',
        level: 'undergraduate'
      },
      {
        id: '2',
        name: 'Mathematics',
        category: 'STEM', 
        level: 'undergraduate'
      },
      {
        id: '3',
        name: 'Physics',
        category: 'STEM',
        level: 'undergraduate'
      },
      {
        id: '4',
        name: 'Business Administration',
        category: 'Business',
        level: 'undergraduate'
      },
      {
        id: '5',
        name: 'Psychology',
        category: 'Social Sciences',
        level: 'undergraduate'
      }
    ]

    return NextResponse.json(subjects)
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}
