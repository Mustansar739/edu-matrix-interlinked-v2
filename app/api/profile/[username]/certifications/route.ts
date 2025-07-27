import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Certification schemas
const certificationCreateSchema = z.object({
  name: z.string().max(100).optional(),
  issuer: z.string().max(100).optional(),
  issueDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
});

const certificationUpdateSchema = certificationCreateSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
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

    // Get certifications
    const certifications = await prisma.certification.findMany({
      where: { userId: profileUser.id },
      orderBy: [
        { issueDate: 'desc' }
      ]
    });

    return NextResponse.json({ certifications });

  } catch (error) {
    console.error('Certifications fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const validatedData = certificationCreateSchema.parse(body);    // Create certification
    const certification = await prisma.certification.create({
      data: {
        name: validatedData.name,
        issuer: validatedData.issuer,
        issueDate: validatedData.issueDate ? new Date(validatedData.issueDate) : null,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        credentialId: validatedData.credentialId,
        credentialUrl: validatedData.credentialUrl,
        skills: validatedData.skills || [],
        userId: profileUser.id,
      }
    });    return NextResponse.json({
      success: true,
      message: 'Certification created successfully',
      data: {
        certification: certification
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Certification creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { id, ...updateData } = body;
    const validatedData = certificationUpdateSchema.parse(updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Certification ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingCertification = await prisma.certification.findFirst({
      where: {
        id,
        userId: profileUser.id
      }
    });

    if (!existingCertification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    // Update certification
    const updatedData: any = { ...validatedData };
    if (validatedData.issueDate) {
      updatedData.issueDate = new Date(validatedData.issueDate);
    }
    if (validatedData.expiryDate) {
      updatedData.expiryDate = new Date(validatedData.expiryDate);
    }

    const certification = await prisma.certification.update({
      where: { id },
      data: updatedData
    });    return NextResponse.json({
      success: true,
      message: 'Certification updated successfully',
      data: {
        certification
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Certification update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        { error: 'Certification ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const deletedCertification = await prisma.certification.deleteMany({
      where: {
        id,
        userId: profileUser.id
      }
    });

    if (deletedCertification.count === 0) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Certification deleted successfully'
    });

  } catch (error) {
    console.error('Certification deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}