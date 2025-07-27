import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Project update schema for individual item operations
const projectUpdateSchema = z.object({
  title: z.string().max(100, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  liveUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid live URL' }),  repositoryUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid repository URL' }),
  imageUrls: z.array(z.string()).optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  isOngoing: z.boolean().optional(),
  technologies: z.array(z.string()).optional(),
  category: z.string().max(50, 'Category too long').optional(),
}).refine((data) => {
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
    return false;
  }
  if (data.isOngoing && data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End date must be after start date, and ongoing projects should not have end dates",
  path: ["endDate"]
});

// GET /api/profile/[username]/projects/[id] - Get individual project record
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

    console.log('Fetching project record for user:', profileUser.username, 'ID:', id);

    // Get specific project record
    const project = await prisma.project.findFirst({
      where: { 
        id,
        userId: profileUser.id 
      }
    });

    if (!project) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project record not found' 
        },
        { status: 404 }
      );
    }

    console.log('Found project record:', project.id);

    return NextResponse.json({ 
      success: true,
      data: {
        project
      }
    });

  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch project record' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[username]/projects/[id] - Update individual project record
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
    console.log('Updating project record for user:', profileUser.username, 'ID:', id, 'Data:', body);
    
    const validatedData = projectUpdateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership first
      const existingProject = await tx.project.findFirst({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (!existingProject) {
        throw new Error('Project record not found or access denied');
      }

      // Prepare update data with proper date conversion
      const updateFields: any = { ...validatedData };
      if (updateFields.startDate) {
        updateFields.startDate = new Date(updateFields.startDate);
      }
      if (updateFields.endDate) {
        updateFields.endDate = new Date(updateFields.endDate);
      }

      // Update project record
      const project = await tx.project.update({
        where: { id },
        data: updateFields
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return project;
    });

    console.log('Project record updated successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project: result
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Project validation error:', error.errors);
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
          error: 'Project record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Project update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update project record' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/[username]/projects/[id] - Delete individual project record
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

    console.log('Deleting project record for user:', profileUser.username, 'ID:', id);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership and delete
      const deletedProject = await tx.project.deleteMany({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (deletedProject.count === 0) {
        throw new Error('Project record not found or access denied');
      }

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return deletedProject;
    });

    console.log('Project record deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
      data: {
        deletedCount: result.count
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Project deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete project record' 
      },
      { status: 500 }
    );
  }
}
