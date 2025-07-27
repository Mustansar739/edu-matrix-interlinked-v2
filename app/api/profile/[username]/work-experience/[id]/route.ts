import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Work experience update schema for individual item operations
const workExperienceUpdateSchema = z.object({
  position: z.string().max(100, 'Position name too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  location: z.string().max(100, 'Location too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  isCurrentJob: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
    return false;
  }
  if (data.isCurrentJob && data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End date must be after start date, and current jobs should not have end dates",
  path: ["endDate"]
});

// GET /api/profile/[username]/work-experience/[id] - Get individual work experience record
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

    console.log('Fetching work experience record for user:', profileUser.username, 'ID:', id);

    // Get specific work experience record
    const workExperience = await prisma.workExperience.findFirst({
      where: { 
        id,
        userId: profileUser.id 
      }
    });

    if (!workExperience) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Work experience record not found' 
        },
        { status: 404 }
      );
    }

    console.log('Found work experience record:', workExperience.id);

    return NextResponse.json({ 
      success: true,
      data: {
        workExperience
      }
    });

  } catch (error) {
    console.error('Work experience fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch work experience record' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[username]/work-experience/[id] - Update individual work experience record
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
    console.log('Updating work experience record for user:', profileUser.username, 'ID:', id, 'Data:', body);
    
    const validatedData = workExperienceUpdateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership first
      const existingExperience = await tx.workExperience.findFirst({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (!existingExperience) {
        throw new Error('Work experience record not found or access denied');
      }

      // If marking as current, unmark other current positions
      if (validatedData.isCurrentJob) {
        await tx.workExperience.updateMany({
          where: {
            userId: profileUser.id,
            isCurrentJob: true,
            id: { not: id }
          },
          data: { isCurrentJob: false }
        });
      }

      // Prepare update data with proper date conversion
      const updateFields: any = { ...validatedData };
      if (updateFields.startDate) {
        updateFields.startDate = new Date(updateFields.startDate);
      }
      if (updateFields.endDate) {
        updateFields.endDate = new Date(updateFields.endDate);
      }

      // Update work experience record
      const workExperience = await tx.workExperience.update({
        where: { id },
        data: updateFields
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return workExperience;
    });

    console.log('Work experience record updated successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Work experience updated successfully',
      data: {
        workExperience: result
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Work experience validation error:', error.errors);
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
          error: 'Work experience record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Work experience update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update work experience record' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/[username]/work-experience/[id] - Delete individual work experience record
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

    console.log('Deleting work experience record for user:', profileUser.username, 'ID:', id);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership and delete
      const deletedExperience = await tx.workExperience.deleteMany({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (deletedExperience.count === 0) {
        throw new Error('Work experience record not found or access denied');
      }

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return deletedExperience;
    });

    console.log('Work experience record deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Work experience deleted successfully',
      data: {
        deletedCount: result.count
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Work experience record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Work experience deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete work experience record' 
      },
      { status: 500 }
    );
  }
}
