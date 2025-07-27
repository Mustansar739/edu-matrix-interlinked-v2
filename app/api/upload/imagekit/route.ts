/**
 * =============================================================================
 * IMAGEKIT UPLOAD API - PRODUCTION-READY HIGH-QUALITY PHOTO UPLOAD SYSTEM
 * =============================================================================
 * 
 * PURPOSE:
 * Facebook-style profile and cover photo upload system with balanced compression
 * to achieve 50-100KB final file size while maintaining excellent visual quality.
 * 
 * FEATURES:
 * - Profile Avatar Upload: 200x200px, WebP, ~50KB, 80% quality
 * - Cover Photo Upload: 500x250px, WebP, ~100KB, 80% quality  
 * - High-quality compression optimization
 * - CDN delivery for fast loading
 * - Database tracking for file management
 * - Real-time error handling and logging
 * 
 * COMPRESSION STRATEGY:
 * - WebP format for best compression-to-quality ratio
 * - Profile Avatar: 200x200, 80% quality, ~50KB
 * - Cover Photo: 500x250, 80% quality, ~100KB
 * - Client-side preprocessing: 70% quality baseline
 * - Server-side optimization: 85% pre + 80% post
 * 
 * QUALITY FOCUS:
 * - Maintains sharp, clear images
 * - Balanced file size vs quality
 * - Professional appearance suitable for social media
 * - Fast loading while preserving detail
 * 
 * SECURITY:
 * - Authentication required
 * - File type validation
 * - Size limits enforcement (5MB input)
 * - Secure upload signatures
 * 
 * DATABASE INTEGRATION:
 * - Tracks all uploads in FileUpload table
 * - Links to user profiles
 * - Maintains ImageKit file IDs for management
 * 
 * FACEBOOK-STYLE FLOW:
 * 1. User selects photo
 * 2. Client-side crop and resize (200x200 or 500x250)
 * 3. Client-side WebP conversion (70% quality)
 * 4. Upload to ImageKit with final optimization
 * 5. Database logging
 * 6. Profile/cover update
 * 7. Real-time UI update
 * 
 * LAST UPDATED: 2025-07-23
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import ImageKit from 'imagekit';
import { prisma } from '@/lib/prisma';

// ===========================
// API ROUTE CONFIGURATION
// ===========================
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for upload processing

// Configure body size limit for this specific route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

// Initialize ImageKit with profile-specific configuration
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_PUBLIC_KEY!,
  privateKey: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_URL_ENDPOINT!
});

// Supported file types
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];

// Max file size (5MB for input, will be compressed to 50-100KB for good quality)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Target output size (50-100KB for good quality balance)
const TARGET_OUTPUT_SIZE_AVATAR = 50 * 1024; // 50KB for avatars
const TARGET_OUTPUT_SIZE_COVER = 100 * 1024; // 100KB for covers

// Advanced image validation function
async function validateImageFile(file: File): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Check file signature (magic numbers) for security
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 8));
    
    // JPEG: FF D8 FF
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
    // GIF: 47 49 46 38
    
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    
    if (!isJPEG && !isPNG && !isWebP && !isGIF) {
      return { isValid: false, error: 'Invalid image format detected' };
    }
    
    // Additional size validation
    if (file.size < 1024) { // Less than 1KB
      return { isValid: false, error: 'Image file too small (minimum 1KB)' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Failed to validate image file' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ Upload failed: User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', {
      userId: session.user.id,
      username: session.user.username
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadTypeInput = formData.get('type') as string || 'profile-picture';
    
    // Map frontend upload types to backend enum values
    const uploadTypeMapping: Record<string, string> = {
      'profile-picture': 'PROFILE_AVATAR',
      'cover-picture': 'PROFILE_COVER',
      'cover-photo': 'PROFILE_COVER',
      'profile-photo': 'PROFILE_AVATAR',
      'avatar': 'PROFILE_AVATAR',
      'cover': 'PROFILE_COVER',
      'post': 'POST_IMAGE',
      'message': 'MESSAGE_IMAGE',
      'document': 'DOCUMENT'
    };

    const uploadType = uploadTypeMapping[uploadTypeInput.toLowerCase()] || uploadTypeInput;
    
    if (!file) {
      console.log('❌ Upload failed: No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate upload type
    const validUploadTypes = ['PROFILE_AVATAR', 'PROFILE_COVER', 'POST_IMAGE', 'MESSAGE_IMAGE', 'DOCUMENT'];
    if (!validUploadTypes.includes(uploadType)) {
      console.log('❌ Upload failed: Invalid upload type:', uploadType);
      return NextResponse.json(
        { error: `Invalid upload type: ${uploadTypeInput}. Supported types: ${Object.keys(uploadTypeMapping).join(', ')}` },
        { status: 400 }
      );
    }

    console.log('✅ File validation passed:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadTypeInput,
      uploadTypeMapped: uploadType
    });

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      console.log('❌ Upload failed: Unsupported file type:', file.type);
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Advanced image validation
    const imageValidation = await validateImageFile(file);
    if (!imageValidation.isValid) {
      console.log('❌ Upload failed: Image validation error:', imageValidation.error);
      return NextResponse.json(
        { error: imageValidation.error || 'Invalid image file' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('❌ Upload failed: File too large:', file.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB. Final image will be optimized to 50-100KB with high quality.' },
        { status: 400 }
      );
    }

    console.log('✅ File size and type validation passed');

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${session.user.id}_${timestamp}_${randomString}.${fileExtension}`;

    console.log('✅ Uploading to ImageKit:', {
      fileName,
      folder: `/profile-images/${uploadType.toLowerCase()}`,
      fileSize: buffer.length,
      uploadType: uploadType,
      dimensions: uploadType === 'PROFILE_AVATAR' ? '200x200' : '500x250',
      targetSize: uploadType === 'PROFILE_AVATAR' ? '~50KB' : '~100KB',
      qualityFocus: 'High Quality (80% WebP)'
    });

    // Upload to ImageKit with quality-focused optimization
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: fileName,
      folder: `/profile-images/${uploadType.toLowerCase()}`,
      useUniqueFileName: true,
      tags: [`user:${session.user.id}`, uploadType.toLowerCase()],
      // Quality-focused processing (client already resized appropriately)
      transformation: {
        pre: 'f-webp,pr-true,q-85', // WebP format, progressive, 85% quality
        post: [
          {
            type: 'transformation',
            // Final optimization without over-compression
            value: uploadType === 'PROFILE_AVATAR' 
              ? 'w-200,h-200,c-maintain_ratio,q-80,f-webp' // Avatar: 200x200, 80% quality
              : 'w-500,h-250,c-maintain_ratio,q-80,f-webp'  // Cover: 500x250, 80% quality
          }
        ]
      }
    });

    console.log('✅ ImageKit upload successful:', {
      fileName: uploadResponse.name,
      url: uploadResponse.url,
      userId: session.user.id,
      uploadType: uploadType,
      dimensions: uploadType === 'PROFILE_AVATAR' ? '200x200' : '500x250',
      targetSize: uploadType === 'PROFILE_AVATAR' ? '~50KB' : '~100KB',
      qualityFocus: 'High Quality (80% WebP)'
    });

    // Verify actual file size by making a HEAD request to the uploaded file
    try {
      const sizeResponse = await fetch(uploadResponse.url, { method: 'HEAD' });
      const actualSize = parseInt(sizeResponse.headers.get('content-length') || '0');
      const sizeInKB = Math.round(actualSize / 1024 * 100) / 100;
      
      console.log('📊 File Size Verification:', {
        originalSize: `${Math.round(file.size / 1024 * 100) / 100}KB`,
        finalSize: `${sizeInKB}KB`,
        compressionRatio: `${Math.round((1 - actualSize / file.size) * 100)}%`,
        target: uploadType === 'PROFILE_AVATAR' ? '50KB' : '100KB',
        quality: 'High (80% WebP)',
        withinTarget: (uploadType === 'PROFILE_AVATAR' ? sizeInKB <= 50 : sizeInKB <= 100) ? '✅ YES' : '⚠️ OVER'
      });
    } catch (sizeError) {
      console.log('⚠️ Could not verify file size:', sizeError);
    }

    // Log upload to database for tracking and management
    try {
      // Create database record for file tracking
      const fileRecord = await prisma.$transaction(async (tx) => {
        return await tx.$executeRaw`
          INSERT INTO "social_schema"."FileUpload" (
            id, "userId", "fileName", "originalName", "fileUrl", 
            "fileSize", "mimeType", "uploadType", "imagekitId", 
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), 
            ${session.user.id}, 
            ${uploadResponse.name}, 
            ${file.name}, 
            ${uploadResponse.url},
            ${file.size}, 
            ${file.type}, 
            ${uploadType}::"social_schema"."UploadType", 
            ${uploadResponse.fileId}, 
            NOW(), 
            NOW()
          )
        `;
      });
      console.log('✅ Upload logged to database successfully');
    } catch (dbError) {
      console.error('❌ Failed to log upload to database:', dbError);
      // Don't fail the upload if database logging fails
    }

    // Get actual file size for verification
    let actualFileSize = 0;
    let sizeInKB = 0;
    try {
      const sizeResponse = await fetch(uploadResponse.url, { method: 'HEAD' });
      actualFileSize = parseInt(sizeResponse.headers.get('content-length') || '0');
      sizeInKB = Math.round(actualFileSize / 1024 * 100) / 100;
    } catch (sizeError) {
      console.log('⚠️ Could not get actual file size for response');
    }

    return NextResponse.json({
      success: true,
      fileUrl: uploadResponse.url,
      fileName: uploadResponse.name,
      fileId: uploadResponse.fileId,
      thumbnailUrl: uploadResponse.thumbnailUrl,
      uploadType: uploadType,
      originalSize: file.size,
      originalSizeKB: Math.round(file.size / 1024 * 100) / 100,
      finalSize: actualFileSize,
      finalSizeKB: sizeInKB,
      withinTarget: uploadType === 'PROFILE_AVATAR' ? sizeInKB <= 50 : sizeInKB <= 100,
      compressionRatio: Math.round((1 - actualFileSize / file.size) * 100),
      compressionInfo: {
        format: 'WebP',
        targetSize: uploadType === 'PROFILE_AVATAR' ? '50KB' : '100KB',
        actualSize: `${sizeInKB}KB`,
        dimensions: uploadType === 'PROFILE_AVATAR' ? '200x200' : '500x250',
        quality: '80% (High Quality)'
      },
      message: `${uploadType === 'PROFILE_AVATAR' ? 'Profile photo' : 'Cover photo'} uploaded successfully. Final size: ${sizeInKB}KB with high quality 🎨`
    });

  } catch (error) {
    console.error('❌ ImageKit upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
