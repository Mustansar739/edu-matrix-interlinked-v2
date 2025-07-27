import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Certification update schema for individual item operations
const certificationUpdateSchema = z.object({
  name: z.string().max(100, 'Name too long').optional(),
  issuer: z.string().max(100, 'Issuer name too long').optional(),
  issueDate: z.string().datetime('Invalid issue date format').optional(),
  expiryDate: z.string().datetime('Invalid expiry date format').optional(),
  credentialId: z.string().max(100, 'Credential ID too long').optional(),
  credentialUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid credential URL' }),
  description: z.string().max(1000, 'Description too long').optional(),
  skills: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
  category: z.string().max(50, 'Category too long').optional(),
  badgeUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid badge URL' }),
}).refine((data) => {
  if (data.expiryDate && data.issueDate && new Date(data.expiryDate) < new Date(data.issueDate)) {
    return false;
  }
  return true;
}, {
  message: "Expiry date must be after issue date",
  path: ["expiryDate"]
});

// GET /api/profile/[username]/certifications/[id] - Get individual certification record
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

    console.log('Fetching certification record for user:', profileUser.username, 'ID:', id);

    // Get specific certification record
    const certification = await prisma.certification.findFirst({
      where: { 
        id,
        userId: profileUser.id 
      }
    });

    if (!certification) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Certification record not found' 
        },
        { status: 404 }
      );
    }

    console.log('Found certification record:', certification.id);

    return NextResponse.json({ 
      success: true,
      data: {
        certification
      }
    });

  } catch (error) {
    console.error('Certification fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch certification record' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[username]/certifications/[id] - Update individual certification record
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
    console.log('Updating certification record for user:', profileUser.username, 'ID:', id, 'Data:', body);
    
    const validatedData = certificationUpdateSchema.parse(body);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership first
      const existingCertification = await tx.certification.findFirst({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (!existingCertification) {
        throw new Error('Certification record not found or access denied');
      }

      // Prepare update data with proper date conversion
      const updateFields: any = { ...validatedData };
      if (updateFields.issueDate) {
        updateFields.issueDate = new Date(updateFields.issueDate);
      }
      if (updateFields.expiryDate) {
        updateFields.expiryDate = new Date(updateFields.expiryDate);
      }

      // Update certification record
      const certification = await tx.certification.update({
        where: { id },
        data: updateFields
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return certification;
    });

    console.log('Certification record updated successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Certification updated successfully',
      data: {
        certification: result
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Certification validation error:', error.errors);
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
          error: 'Certification record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Certification update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update certification record' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/[username]/certifications/[id] - Delete individual certification record
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

    console.log('Deleting certification record for user:', profileUser.username, 'ID:', id);

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify ownership and delete
      const deletedCertification = await tx.certification.deleteMany({
        where: {
          id,
          userId: profileUser.id
        }
      });

      if (deletedCertification.count === 0) {
        throw new Error('Certification record not found or access denied');
      }

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return deletedCertification;
    });

    console.log('Certification record deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Certification deleted successfully',
      data: {
        deletedCount: result.count
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Certification record not found' 
        },
        { status: 404 }
      );
    }

    console.error('Certification deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete certification record' 
      },
      { status: 500 }
    );
  }
}
