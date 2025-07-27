import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Skills schemas
const skillsUpdateSchema = z.object({
  skills: z.array(z.object({
    name: z.string().min(1).max(50),
    category: z.string().max(50).optional(),
    proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
    yearsOfExperience: z.number().min(0).max(50).optional(),
    endorsements: z.number().min(0).optional(),
    featured: z.boolean().default(false),
  }))
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
      select: { id: true, skills: true }
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // For now, return skills from user model (JSON field)
    // In a more complex setup, you might have a separate Skills table
    return NextResponse.json({ 
      skills: profileUser.skills || [] 
    });

  } catch (error) {
    console.error('Skills fetch error:', error);
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
    const validatedData = skillsUpdateSchema.parse(body);

    // Update user skills
    const updatedUser = await prisma.user.update({
      where: { id: profileUser.id },
      data: {
        skills: validatedData.skills
      },
      select: {
        skills: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      message: 'Skills updated successfully',
      skills: updatedUser.skills
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Skills update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
