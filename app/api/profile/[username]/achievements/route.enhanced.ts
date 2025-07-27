import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Enhanced achievement schemas with better validation
const achievementBaseSchema = z.object({
  title: z.string().min(1, 'Achievement title is required').max(100, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  category: z.string().max(50, 'Category too long').optional(),
  date: z.string().datetime('Invalid date format'),
  imageUrl: z.string().url('Invalid image URL').optional(),
  organization: z.string().max(100, 'Organization name too long').optional(),
  relevantSkills: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().default(true),
});

const achievementCreateSchema = achievementBaseSchema;

const achievementUpdateSchema = achievementBaseSchema.partial().extend({
  id: z.string().optional() // For PATCH operations that include the ID in body
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

    console.log('Fetching achievements for user:', profileUser.username);

    // Get achievement records
    const achievements = await prisma.achievement.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { date: 'desc' }
      ]
    });

    console.log('Found', achievements.length, 'achievement records for user:', profileUser.username);

    return NextResponse.json({ 
      success: true,
      data: {
        achievements,
        count: achievements.length
      }
    });

  } catch (error) {
    console.error('Achievement fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch achievement records' 
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
    console.log('Creating achievement for user:', profileUser.username, 'Data:', body);
    
    const validatedData = achievementCreateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create achievement record
      const achievement = await tx.achievement.create({
        data: {
          ...validatedData,
          userId: profileUser.id,
          date: new Date(validatedData.date),
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return achievement;
    });

    console.log('Achievement created successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Achievement created successfully',
      data: {
        achievement: result
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Achievement validation error:', error.errors);
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

    console.error('Achievement creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create achievement record' 
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
          error: 'Achievement ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Updating achievement for user:', profileUser.username, 'ID:', id, 'Data:', updateData);
    
    const validatedData = achievementUpdateSchema.parse(updateData);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership first
      const existingAchievement = await tx.achievement.findFirst({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (!existingAchievement) {
        throw new Error('Achievement record not found or access denied');
      }

      // Prepare update data with proper date conversion
      const updateFields: any = { ...validatedData };
      if (updateFields.date) {
        updateFields.date = new Date(updateFields.date);
      }

      // Update achievement record
      const achievement = await tx.achievement.update({
        where: { id },
        data: updateFields
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return achievement;
    });

    console.log('Achievement updated successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Achievement updated successfully',
      data: {
        achievement: result
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Achievement validation error:', error.errors);
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
          error: 'Achievement record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Achievement update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update achievement record' 
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
          error: 'Achievement ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Deleting achievement for user:', profileUser.username, 'ID:', id);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership and delete
      const deletedAchievement = await tx.achievement.deleteMany({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (deletedAchievement.count === 0) {
        throw new Error('Achievement record not found or access denied');
      }

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return deletedAchievement;
    });

    console.log('Achievement deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Achievement deleted successfully',
      data: {
        deletedCount: result.count
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Achievement record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Achievement deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete achievement record' 
      },
      { status: 500 }
    );
  }
}
