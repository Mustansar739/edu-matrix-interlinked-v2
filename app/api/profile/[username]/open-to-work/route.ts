import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Open to work schema
const openToWorkUpdateSchema = z.object({
  openToWork: z.boolean(),
  jobPreferences: z.object({
    roles: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    workType: z.array(z.enum(['REMOTE', 'HYBRID', 'ON_SITE'])).optional(),
    employmentType: z.array(z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE'])).optional(),
    salaryRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
    startDate: z.string().datetime().optional(),
    recruiterContact: z.boolean().optional(),
    message: z.string().max(500).optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    // Get the profile user
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { 
        id: true, 
        openToWork: true, 
        jobPreferences: true 
      }
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      openToWork: profileUser.openToWork,
      jobPreferences: profileUser.jobPreferences || {}
    });

  } catch (error) {
    console.error('Open to work fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the profile user
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user can edit this profile
    if (profileUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = openToWorkUpdateSchema.parse(body);

    // Update open to work status and preferences
    const updatedUser = await prisma.user.update({
      where: { id: profileUser.id },
      data: {
        openToWork: validatedData.openToWork,
        jobPreferences: validatedData.jobPreferences || {},
      },
      select: {
        openToWork: true,
        jobPreferences: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      message: 'Open to work status updated successfully',
      openToWork: updatedUser.openToWork,
      jobPreferences: updatedUser.jobPreferences
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Open to work update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
