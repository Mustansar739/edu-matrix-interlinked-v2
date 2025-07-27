import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Education update schema for individual item operations
const educationUpdateSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(100, 'Institution name too long').optional(),
  degree: z.string().min(1, 'Degree is required').max(100, 'Degree name too long').optional(),
  fieldOfStudy: z.string().max(100, 'Field of study too long').optional(),
  startYear: z.number().int().min(1900, 'Start year must be after 1900').max(2100, 'Start year too far in future').optional(),
  endYear: z.number().int().min(1900, 'End year must be after 1900').max(2100, 'End year too far in future').optional(),
  gpa: z.string().max(20, 'GPA too long').optional(),
  grade: z.string().max(20, 'Grade too long').optional(),
  activities: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.endYear && data.startYear && data.endYear < data.startYear) {
    return false;
  }
  return true;
}, {
  message: "End year must be after start year",
  path: ["endYear"]
});

// GET /api/profile/[username]/education/[id] - Get individual education record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  try {
    const { username, id } = await params;
    
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

    console.log('Fetching education record for user:', profileUser.username, 'ID:', id);

    // Get specific education record
    const education = await prisma.education.findFirst({
      where: { 
        id,
        userId: profileUser.id 
      }
    });

    if (!education) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Education record not found' 
        },
        { status: 404 }
      );
    }

    console.log('Found education record:', education.id);

    return NextResponse.json({ 
      success: true,
      data: {
        education
      }
    });

  } catch (error) {
    console.error('Education fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch education record' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[username]/education/[id] - Update individual education record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  try {
    const { username, id } = await params;
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
    console.log('Updating education record for user:', profileUser.username, 'ID:', id, 'Data:', body);
    
    const validatedData = educationUpdateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership first
      const existingEducation = await tx.education.findFirst({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (!existingEducation) {
        throw new Error('Education record not found or access denied');
      }

      // Update education record
      const education = await tx.education.update({
        where: { id },
        data: validatedData
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return education;
    });

    console.log('Education record updated successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Education updated successfully',
      data: {
        education: result
      }
    });

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

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Education record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Education update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update education record' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/[username]/education/[id] - Delete individual education record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  try {
    const { username, id } = await params;
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

    console.log('Deleting education record for user:', profileUser.username, 'ID:', id);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership and delete
      const deletedEducation = await tx.education.deleteMany({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (deletedEducation.count === 0) {
        throw new Error('Education record not found or access denied');
      }

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return deletedEducation;
    });

    console.log('Education record deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Education deleted successfully',
      data: {
        deletedCount: result.count
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Education record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Education deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete education record' 
      },
      { status: 500 }
    );
  }
}
