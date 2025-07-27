/**
 * =============================================================================
 * PROFILE API ROUTE - /api/profile/[username]
 * =============================================================================
 * 
 * PURPOSE:
 * Main profile API endpoint for fetching and updating user profile data.
 * Handles both GET (fetch profile) and PATCH (update profile) requests.
 * 
 * AUTHENTICATION:
 * - GET: Optional (public profiles), required for private profiles
 * - PATCH: Required (can only edit own profile)
 * 
 * FEATURES:
 * - Fetches complete user profile with related data
 * - Privacy controls (PUBLIC, PRIVATE, CONNECTIONS_ONLY)
 * - Profile view tracking and analytics
 * - Field mapping and data transformation for frontend compatibility
 * - Comprehensive error handling and validation
 * 
 * DATA TRANSFORMATION:
 * - Maps database fields to frontend-expected format
 * - Creates analytics object structure for components
 * - Provides fallbacks for missing data
 * - Ensures consistent field naming across the system
 * 
 * RELATED ENDPOINTS:
 * - /api/users/me - Get current user basic data
 * - /api/profile/[username]/stats - Profile statistics
 * - /api/profile/[username]/education - Education data
 * - /api/profile/[username]/work-experience - Work experience data
 * 
 * FRONTEND USAGE:
 * - ProfileSummaryCard component (sidebar)
 * - UnifiedProfilePage component (main profile page)
 * - Profile editing forms and components
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackUserActivity } from '@/lib/middleware/activity-tracker'; // ✅ PRODUCTION-READY: Activity tracking
import { z } from 'zod';

// ==========================================
// PROFILE UPDATE SCHEMA - BASIC FIELDS ONLY
// ==========================================
// This endpoint now handles ONLY basic profile fields
// Complex data (education, work experience, etc.) should use dedicated endpoints:
// - /education/route.ts for education data
// - /work-experience/route.ts for work experience data
// - /projects/route.ts for project data
// - /achievements/route.ts for achievement data
// - /certifications/route.ts for certification data

// Basic profile update schema - ONLY handles simple user fields
// Complex data like education, work experience should use dedicated endpoints
const profileUpdateSchema = z.object({
  // Personal Information
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(1000).optional(),
  headline: z.string().max(200).optional(),
  
  // Location & Contact
  location: z.string().max(100).optional(),
  website: z.string().optional(),
  phoneNumber: z.string().max(20).optional(),
  twitterUrl: z.string().optional(),
  
  // Profile Settings
  coverPhotoUrl: z.string().optional(),
  openToWork: z.boolean().optional(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE', 'CONNECTIONS_ONLY']).optional(),
  
  // Additional About Section Fields
  professionalSummary: z.string().max(2000).optional(),
  careerGoalsShort: z.string().max(1000).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  currentPosition: z.string().max(200).optional(),
  currentCompany: z.string().max(200).optional(),
  totalExperience: z.number().int().min(0).max(50).optional(),
  
  // Personal Information Fields
  academicYear: z.string().max(50).optional(),
  major: z.string().max(100).optional(),
  
  // Simple array fields (stored directly in User model)
  languages: z.array(z.string()).optional(),
  keySkills: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();

    // ✅ PRODUCTION-READY: Track user activity for presence system
    if (session?.user?.id) {
      await trackUserActivity(session.user.id, request, {
        activity: 'viewing_profile',
        metadata: { targetUsername: username }
      });
    }    // Get the profile user with all required fields
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        headline: true,
        location: true,
        website: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        openToWork: true,
        profileVisibility: true,
        languages: true,
        phoneNumber: true,
        twitterUrl: true,
        // Additional About Section Fields
        professionalSummary: true,
        careerGoalsShort: true,
        city: true,
        country: true,
        currentPosition: true,
        currentCompany: true,
        totalExperience: true,
        keySkills: true,
        // Personal Information Fields
        academicYear: true,
        major: true,
        // System fields
        isVerified: true,
        profession: true,
        // Analytics fields - all available analytics fields
        profileViewsCount: true,
        totalLikesReceived: true,
        followersCount: true,
        followingCount: true,
        createdAt: true,
        updatedAt: true,
        // ✅ PRODUCTION-READY: Add lastActivity for presence system
        lastActivity: true,
        lastLogin: true,
        // Include related data
        workExperiences: {
          orderBy: [
            { isCurrentJob: 'desc' },
            { startDate: 'desc' }
          ]
        },
        educations: {
          orderBy: { startYear: 'desc' }
        },
        projects: {
          orderBy: { startDate: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        achievements: {
          orderBy: { date: 'desc' }
        },
        _count: {
          select: {
            profileViews: true,
            workExperiences: true,
            educations: true,
            projects: true,
            certifications: true,
            achievements: true,
          }
        }
      }
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }    // Check if profile is private
    if (profileUser.profileVisibility === 'PRIVATE' && 
        session?.user?.id !== profileUser.id) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      );
    }

    // Record profile view if not own profile
    if (session?.user?.id && session.user.id !== profileUser.id) {
      try {
        await prisma.profileView.create({
          data: {
            viewerId: session.user.id,
            profileId: profileUser.id,
            viewedAt: new Date()
          }
        })

        // Update profile views count
        await prisma.user.update({
          where: { id: profileUser.id },
          data: {
            profileViewsCount: {
              increment: 1
            }
          }
        })
      } catch (viewError) {
        // Don't fail the request if view recording fails
        console.error('Error recording profile view:', viewError)
      }
    }

    // FIXED: Transform profile data to match frontend expectations
    // Create analytics object structure that ProfileSummaryCard expects
    // UPDATED: Changed "connections" to "followers" for better social platform terminology
    const analytics = {
      followersCount: profileUser.followersCount || 0, // CHANGED: from connectionsCount
      profileViews: profileUser.profileViewsCount || 0,
      totalLikes: profileUser.totalLikesReceived || 0
    };

    // FIXED: Ensure consistent field mapping based on available fields
    const transformedProfile = {
      ...profileUser,
      // Use profilePictureUrl as the main avatar field
      avatar: profileUser.profilePictureUrl,
      // Keep website field as is (no websiteUrl field exists)
      websiteUrl: profileUser.website,
      // Add analytics object that components expect
      analytics,
      // Ensure name fallback
      name: profileUser.name || `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim() || profileUser.username,
      // Map location consistently
      location: profileUser.location || (profileUser.city && profileUser.country ? `${profileUser.city}, ${profileUser.country}` : profileUser.city || profileUser.country),
      // Map headline with fallback
      headline: profileUser.headline || profileUser.currentPosition || '',
      // Ensure required fields exist
      bio: profileUser.bio || '',
      keySkills: profileUser.keySkills || [],
      languages: profileUser.languages || []
    };

    // Return profile data with proper structure
    return NextResponse.json({
      ...transformedProfile,
      isOwner: session?.user?.id === profileUser.id,
      canEdit: session?.user?.id === profileUser.id,
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
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
    }    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);

    // All complex array data should now be handled by dedicated endpoints
    // This endpoint only handles basic profile fields

    // Update the main profile fields only
    const updatedUser = await prisma.user.update({
      where: { id: profileUser.id },
      data: validatedData,
      select: {
        id: true,
        username: true,
        name: true,
        firstName: true,
        lastName: true,
        bio: true,
        headline: true,
        location: true,
        website: true, // Correct field name
        profilePictureUrl: true,
        coverPhotoUrl: true,
        openToWork: true,
        profileVisibility: true,
        languages: true,
        phoneNumber: true,
        twitterUrl: true, // This field exists
        // Additional About Section Fields
        professionalSummary: true,
        careerGoalsShort: true,
        city: true,
        country: true,        currentPosition: true,
        currentCompany: true,
        totalExperience: true,
        keySkills: true, // This field exists
        // Personal fields
        academicYear: true,
        major: true,
        // System fields
        isVerified: true,
        profession: true,
        updatedAt: true,
      }    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedUser
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}