import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/educational/courses - Stub endpoint for educational courses
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return stub data for courses
    const courses = [
      {
        id: '1',
        name: 'Introduction to Programming',
        code: 'CS101',
        subject: 'Computer Science',
        credits: 3,
        level: 'undergraduate'
      },
      {
        id: '2',
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        subject: 'Computer Science', 
        credits: 4,
        level: 'undergraduate'
      },
      {
        id: '3',
        name: 'Calculus I',
        code: 'MATH101',
        subject: 'Mathematics',
        credits: 4,
        level: 'undergraduate'
      },
      {
        id: '4',
        name: 'Statistics',
        code: 'STAT101',
        subject: 'Mathematics',
        credits: 3,
        level: 'undergraduate'
      }
    ]

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
