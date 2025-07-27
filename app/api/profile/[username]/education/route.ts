import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Enhanced education schemas with better validation
const educationBaseSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(100, 'Institution name too long').optional(),
  degree: z.string().min(1, 'Degree is required').max(100, 'Degree name too long').optional(),
  fieldOfStudy: z.string().max(100, 'Field of study too long').optional(),
  startYear: z.number().int().min(1900, 'Start year must be after 1900').max(2100, 'Start year too far in future').optional(),
  endYear: z.number().int().min(1900, 'End year must be after 1900').max(2100, 'End year too far in future').optional(),
  gpa: z.string().max(20, 'GPA too long').optional(),
  grade: z.string().max(20, 'Grade too long').optional(),
  activities: z.array(z.string()).optional().default([]),
  achievements: z.array(z.string()).optional().default([]),
});

const educationCreateSchema = educationBaseSchema.refine((data) => {
  if (data.endYear && data.startYear && data.endYear < data.startYear) {
    return false;
  }
  return true;
}, {
  message: "End year must be after start year",
  path: ["endYear"]
});

const educationUpdateSchema = educationBaseSchema.partial().extend({
  id: z.string().optional() // For PATCH operations that include the ID in body
}).refine((data) => {
  if (data.endYear && data.startYear && data.endYear < data.startYear) {
    return false;
  }
  return true;
}, {
  message: "End year must be after start year",
  path: ["endYear"]
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
      select: { id: true, username: true }
    });

    if (!profileUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Profile not found' 
        },
        { status: 404 }
      );
    }

    console.log('Fetching education for user:', profileUser.username);    // Get education records
    const education = await prisma.education.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { startYear: { sort: 'desc', nulls: 'last' } }
      ]
    });

    console.log('Found', education.length, 'education records for user:', profileUser.username);

    return NextResponse.json({ 
      success: true,
      data: {
        education,
        count: education.length
      }
    });

  } catch (error) {
    console.error('Education fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch education records' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
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
      select: { id: true, username: true }
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
    console.log('Creating education for user:', profileUser.username, 'Data:', body);
    
    const validatedData = educationCreateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create education record
      const education = await tx.education.create({
        data: {
          ...validatedData,
          userId: profileUser.id,
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return education;
    });

    console.log('Education created successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Education created successfully',
      data: {
        education: result
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Education validation error:', error.errors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Education creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create education record' 
      },
      { status: 500 }
    );
  }
}