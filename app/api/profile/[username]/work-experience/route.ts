import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Enhanced work experience schemas with better validation
const workExperienceBaseSchema = z.object({
  position: z.string().min(1, 'Position is required').max(100, 'Position name too long'),
  company: z.string().min(1, 'Company is required').max(100, 'Company name too long'),
  location: z.string().max(100, 'Location too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format').nullable().optional(),
  isCurrentJob: z.boolean().default(false),
  skills: z.array(z.string()).optional().default([]),
  achievements: z.array(z.string()).optional().default([]),
});

const workExperienceCreateSchema = workExperienceBaseSchema.refine((data) => {
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

const workExperienceUpdateSchema = workExperienceBaseSchema.partial().extend({
  id: z.string().optional() // For PATCH operations that include the ID in body
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

    console.log('Fetching work experience for user:', profileUser.username);

    // Get work experience records
    const workExperience = await prisma.workExperience.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { isCurrentJob: 'desc' },
        { startDate: 'desc' }
      ]
    });

    console.log('Found', workExperience.length, 'work experience records for user:', profileUser.username);

    return NextResponse.json({ 
      success: true,
      data: {
        workExperience,
        count: workExperience.length
      }
    });

  } catch (error) {
    console.error('Work experience fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch work experience records' 
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
    console.log('Creating work experience for user:', profileUser.username, 'Data:', body);
    
    const validatedData = workExperienceCreateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // If marking as current, unmark other current positions
      if (validatedData.isCurrentJob) {
        await tx.workExperience.updateMany({
          where: {
            userId: profileUser.id,
            isCurrentJob: true
          },
          data: { isCurrentJob: false }
        });
      }

      // Create work experience record
      const workExperience = await tx.workExperience.create({
        data: {
          ...validatedData,
          userId: profileUser.id,
          startDate: new Date(validatedData.startDate),
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return workExperience;
    });

    console.log('Work experience created successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Work experience created successfully',
      data: {
        workExperience: result
      }
    }, { status: 201 });

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
      );    }

    console.error('Work experience creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create work experience record' 
      },
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
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Work experience ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Updating work experience for user:', profileUser.username, 'ID:', id, 'Data:', updateData);
    
    const validatedData = workExperienceUpdateSchema.parse(updateData);

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

    console.log('Work experience updated successfully:', result.id);

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
      { status: 500 }    );
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Work experience ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Deleting work experience for user:', profileUser.username, 'ID:', id);

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

    console.log('Work experience deleted successfully:', id);

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