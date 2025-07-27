import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Achievement update schema for individual item operations
const achievementUpdateSchema = z.object({
  title: z.string().max(100, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.string().max(50, 'Category too long').optional(),
  date: z.string().datetime('Invalid date format').optional(),
  imageUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid image URL' }),
  organization: z.string().max(100, 'Organization name too long').optional(),
  relevantSkills: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/profile/[username]/achievements/[id] - Get individual achievement record
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

    console.log('Fetching achievement record for user:', profileUser.username, 'ID:', id);

    // Get specific achievement record
    const achievement = await prisma.achievement.findFirst({
      where: { 
        id,
        userId: profileUser.id 
      }
    });

    if (!achievement) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Achievement record not found' 
        },
        { status: 404 }
      );
    }

    console.log('Found achievement record:', achievement.id);

    return NextResponse.json({ 
      success: true,
      data: {
        achievement
      }
    });

  } catch (error) {
    console.error('Achievement fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch achievement record' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[username]/achievements/[id] - Update individual achievement record
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
    console.log('Updating achievement record for user:', profileUser.username, 'ID:', id, 'Data:', body);
    
    const validatedData = achievementUpdateSchema.parse(body);

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

    console.log('Achievement record updated successfully:', result.id);

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

// DELETE /api/profile/[username]/achievements/[id] - Delete individual achievement record
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

    console.log('Deleting achievement record for user:', profileUser.username, 'ID:', id);

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

    console.log('Achievement record deleted successfully:', id);

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
