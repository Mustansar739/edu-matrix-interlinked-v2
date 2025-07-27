import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Upload types
const uploadSchema = z.object({
  type: z.enum(['profile-picture', 'cover-photo', 'project-image', 'achievement-image']),
  fileUrl: z.string(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});

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
    const validatedData = uploadSchema.parse(body);

    // Update user profile based on upload type
    const updateData: any = {};
    
    if (validatedData.type === 'profile-picture') {
      updateData.profilePictureUrl = validatedData.fileUrl;
    } else if (validatedData.type === 'cover-photo') {
      updateData.coverPhotoUrl = validatedData.fileUrl;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: profileUser.id },
        data: updateData
      });
    }

    return NextResponse.json({
      message: 'Upload successful',
      fileUrl: validatedData.fileUrl,
      type: validatedData.type
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
