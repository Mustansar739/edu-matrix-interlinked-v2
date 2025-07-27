import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Enhanced project schemas with better validation
const projectBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
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
  imageUrls: z.array(z.string()).optional().default([]),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format').nullable().optional(),
  isOngoing: z.boolean().default(false),
  technologies: z.array(z.string()).optional().default([]),
  category: z.string().max(50, 'Category too long').optional(),
});

const projectCreateSchema = projectBaseSchema.refine((data) => {
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

const projectUpdateSchema = projectBaseSchema.partial().extend({
  id: z.string().optional() // For PATCH operations that include the ID in body
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

    console.log('Fetching projects for user:', profileUser.username);    // Get project records
    const projects = await prisma.project.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { isOngoing: 'desc' },
        { startDate: 'desc' }
      ]
    });

    console.log('Found', projects.length, 'project records for user:', profileUser.username);

    return NextResponse.json({ 
      success: true,
      data: {
        projects,
        count: projects.length
      }
    });
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch project records' 
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
    console.log('Creating project for user:', profileUser.username, 'Data:', body);
    
    const validatedData = projectCreateSchema.parse(body);    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create project record - only include fields that exist in database
      const project = await tx.project.create({
        data: {          title: validatedData.title,
          description: validatedData.description,
          technologies: validatedData.technologies || [],
          category: validatedData.category,
          liveUrl: validatedData.liveUrl,
          repositoryUrl: validatedData.repositoryUrl,
          imageUrls: validatedData.imageUrls || [],
          startDate: new Date(validatedData.startDate),
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
          isOngoing: validatedData.isOngoing || false,
          userId: profileUser.id,
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return project;
    });

    console.log('Project created successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: {
        project: result
      }
    }, { status: 201 });

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

    console.error('Project creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create project record' 
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
          error: 'Project ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Updating project for user:', profileUser.username, 'ID:', id, 'Data:', updateData);
    
    const validatedData = projectUpdateSchema.parse(updateData);

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
        throw new Error('Project not found or access denied');
      }

      // Update project record - only include fields that exist in database
      const project = await tx.project.update({
        where: { id },
        data: {
          ...(validatedData.title !== undefined && { title: validatedData.title }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.technologies !== undefined && { technologies: validatedData.technologies }),
          ...(validatedData.category !== undefined && { category: validatedData.category }),
          ...(validatedData.liveUrl !== undefined && { liveUrl: validatedData.liveUrl }),
          ...(validatedData.repositoryUrl !== undefined && { repositoryUrl: validatedData.repositoryUrl }),
          ...(validatedData.imageUrls !== undefined && { imageUrls: validatedData.imageUrls }),
          ...(validatedData.startDate !== undefined && { startDate: new Date(validatedData.startDate) }),
          ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate ? new Date(validatedData.endDate) : null }),
          ...(validatedData.isOngoing !== undefined && { isOngoing: validatedData.isOngoing }),
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return project;
    });

    console.log('Project updated successfully:', result.id);

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

    if (error instanceof Error && error.message === 'Project not found or access denied') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project not found' 
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const deletedProject = await prisma.project.deleteMany({
      where: {
        id,
        userId: profileUser.id
      }
    });

    if (deletedProject.count === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}