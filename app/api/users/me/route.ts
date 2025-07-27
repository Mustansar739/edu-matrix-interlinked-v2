/**
 * =============================================================================
 * CURRENT USER API ENDPOINT - /api/users/me
 * =============================================================================
 * 
 * PURPOSE:
 * Fetch current authenticated user's basic data for UI components.
 * Used as the first step in profile data retrieval chain.
 * 
 * AUTHENTICATION: 
 * Required - uses NextAuth session authentication
 * 
 * FEATURES:
 * - Returns essential user data (id, username, name, email, avatar)
 * - Automatic username generation from email if missing
 * - Consistent field mapping for frontend compatibility
 * - Fallback data handling for incomplete profiles
 * 
 * USAGE PATTERN:
 * 1. Components call this endpoint to get username
 * 2. Then use username to call /api/profile/[username] for full profile
 * 
 * AUTOMATIC USERNAME GENERATION:
 * - If user has no username, generates from email prefix
 * - Handles conflicts by appending user ID suffix
 * - Updates database with generated username
 * 
 * FRONTEND COMPONENTS USING THIS:
 * - ProfileSummaryCard (main consumer)
 * - Any component needing current user basic info
 * 
 * RETURNS:
 * {
 *   id: string,
 *   username: string (always present after auto-generation),
 *   name: string,
 *   email: string,
 *   avatar: string,
 *   profilePictureUrl: string,
 *   firstName: string,
 *   lastName: string,
 *   isVerified: boolean,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 * 
 * ERROR HANDLING:
 * - 401: Unauthorized (no session)
 * - 404: User not found in database
 * - 500: Database or server errors
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current user data including all required fields for profile system
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        profilePictureUrl: true, // Main profile picture field
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // FIXED: Ensure username exists, generate fallback if needed
    let username = user.username;
    if (!username && user.email) {
      // Generate username from email if not exists
      username = user.email.split('@')[0];
      
      // Update user with generated username (if it's unique)
      try {
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        
        if (!existingUser) {
          await prisma.user.update({
            where: { id: user.id },
            data: { username }
          });
        } else {
          // If username exists, append user ID
          username = `${username}-${user.id.slice(-8)}`;
          await prisma.user.update({
            where: { id: user.id },
            data: { username }
          });
        }
      } catch (error) {
        console.error('Error updating username:', error);
        // Use fallback username without updating DB
        username = `user-${user.id.slice(-8)}`;
      }
    }

    // FIXED: Return consistent field mapping
    const userData = {
      ...user,
      username, // Ensure username is always present
      // Map avatar consistently
      avatar: user.profilePictureUrl,
      profilePictureUrl: user.profilePictureUrl,
      // Ensure name fallback
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || username
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
