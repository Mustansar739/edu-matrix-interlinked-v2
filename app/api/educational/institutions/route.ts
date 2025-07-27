import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/educational/institutions - Stub endpoint for educational institutions
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return stub data for institutions
    const institutions = [
      {
        id: '1',
        name: 'University of Technology',
        type: 'university',
        country: 'US',
        verified: true
      },
      {
        id: '2', 
        name: 'Community College',
        type: 'college',
        country: 'US',
        verified: true
      },
      {
        id: '3',
        name: 'Technical Institute',
        type: 'institute',
        country: 'US',
        verified: false
      }
    ]

    return NextResponse.json(institutions)
  } catch (error) {
    console.error('Error fetching institutions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch institutions' },
      { status: 500 }
    )
  }
}
