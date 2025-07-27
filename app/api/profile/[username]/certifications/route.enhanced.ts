import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Enhanced certification schemas with better validation
const certificationBaseSchema = z.object({
  name: z.string().min(1, 'Certification name is required').max(100, 'Name too long'),
  issuer: z.string().min(1, 'Issuer is required').max(100, 'Issuer name too long'),
  issueDate: z.string().datetime('Invalid issue date format'),
  expiryDate: z.string().datetime('Invalid expiry date format').optional(),
  credentialId: z.string().max(100, 'Credential ID too long').optional(),
  credentialUrl: z.string().url('Invalid credential URL').optional(),
  skills: z.array(z.string()).optional().default([]),
});

const certificationCreateSchema = certificationBaseSchema.refine((data) => {
  if (data.expiryDate && data.issueDate && new Date(data.expiryDate) < new Date(data.issueDate)) {
    return false;
  }
  return true;
}, {
  message: "Expiry date must be after issue date",
  path: ["expiryDate"]
});

const certificationUpdateSchema = certificationBaseSchema.partial().extend({
  id: z.string().optional() // For PATCH operations that include the ID in body
}).refine((data) => {
  if (data.expiryDate && data.issueDate && new Date(data.expiryDate) < new Date(data.issueDate)) {
    return false;
  }
  return true;
}, {
  message: "Expiry date must be after issue date",
  path: ["expiryDate"]
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

    console.log('Fetching certifications for user:', profileUser.username);    // Get certification records
    const certifications = await prisma.certification.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { issueDate: 'desc' }
      ]
    });

    console.log('Found', certifications.length, 'certification records for user:', profileUser.username);

    return NextResponse.json({ 
      success: true,
      data: {
        certifications,
        count: certifications.length
      }
    });

  } catch (error) {
    console.error('Certification fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch certification records' 
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
    console.log('Creating certification for user:', profileUser.username, 'Data:', body);
    
    const validatedData = certificationCreateSchema.parse(body);    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create certification record - only include fields that exist in database
      const certification = await tx.certification.create({
        data: {
          name: validatedData.name,
          issuer: validatedData.issuer,
          issueDate: new Date(validatedData.issueDate),
          expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
          credentialId: validatedData.credentialId,
          credentialUrl: validatedData.credentialUrl,
          skills: validatedData.skills || [],
          userId: profileUser.id,
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return certification;
    });

    console.log('Certification created successfully:', result.id);

    return NextResponse.json({
      success: true,
      message: 'Certification created successfully',
      data: {
        certification: result
      }
    }, { status: 201 });

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

    console.error('Certification creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create certification record' 
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
          error: 'Certification ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Updating certification for user:', profileUser.username, 'ID:', id, 'Data:', updateData);
    
    const validatedData = certificationUpdateSchema.parse(updateData);

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
      }      // Update certification record - only include fields that exist in database
      const certification = await tx.certification.update({
        where: { id },
        data: {
          ...(validatedData.name !== undefined && { name: validatedData.name }),
          ...(validatedData.issuer !== undefined && { issuer: validatedData.issuer }),
          ...(validatedData.issueDate !== undefined && { issueDate: new Date(validatedData.issueDate) }),
          ...(validatedData.expiryDate !== undefined && { expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null }),
          ...(validatedData.credentialId !== undefined && { credentialId: validatedData.credentialId }),
          ...(validatedData.credentialUrl !== undefined && { credentialUrl: validatedData.credentialUrl }),
          ...(validatedData.skills !== undefined && { skills: validatedData.skills }),
        }
      });

      // Update user's updated timestamp
      await tx.user.update({
        where: { id: profileUser.id },
        data: { updatedAt: new Date() }
      });

      return certification;
    });

    console.log('Certification updated successfully:', result.id);

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
          error: 'Certification ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Deleting certification for user:', profileUser.username, 'ID:', id);

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

    console.log('Certification deleted successfully:', id);

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
