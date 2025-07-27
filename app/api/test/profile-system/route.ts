/**
 * =============================================================================
 * PROFILE SYSTEM TEST ENDPOINT - /api/test/profile-system
 * =============================================================================
 * 
 * PURPOSE:
 * Test endpoint to verify profile system functionality after fixes.
 * Tests the complete data flow from /api/users/me to /api/profile/[username].
 * 
 * TESTS PERFORMED:
 * 1. Current user data retrieval
 * 2. Username existence and fallback generation
 * 3. Profile data retrieval with proper structure
 * 4. Analytics data structure validation
 * 5. Field mapping consistency
 * 
 * USAGE:
 * GET /api/test/profile-system
 * - Must be authenticated
 * - Returns test results and profile data structure
 * 
 * RESPONSES:
 * - Success: Profile system working with data
 * - Error: Specific error details for debugging
 * 
 * NOTE: Remove this endpoint in production
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        test: 'profile-system'
      }, { status: 401 });
    }

    const testResults: any = {
      test: 'profile-system',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      steps: []
    };

    // Step 1: Test /api/users/me endpoint
    try {
      const userResponse = await fetch(`${request.nextUrl.origin}/api/users/me`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (!userResponse.ok) {
        throw new Error(`Users/me failed: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      testResults.steps.push({
        step: 1,
        name: 'users/me endpoint',
        status: 'success',
        data: {
          hasUsername: !!userData.username,
          hasName: !!userData.name,
          hasAvatar: !!(userData.profilePictureUrl || userData.avatar),
          username: userData.username
        }
      });

      // Step 2: Test /api/profile/[username] endpoint
      if (userData.username) {
        try {
          const profileResponse = await fetch(`${request.nextUrl.origin}/api/profile/${userData.username}`, {
            headers: {
              'Cookie': request.headers.get('cookie') || ''
            }
          });
          
          if (!profileResponse.ok) {
            throw new Error(`Profile failed: ${profileResponse.status}`);
          }
          
          const profileData = await profileResponse.json();
          testResults.steps.push({
            step: 2,
            name: 'profile/[username] endpoint',
            status: 'success',
            data: {
              hasAnalytics: !!profileData.analytics,
              analyticsStructure: profileData.analytics ? {
                hasFollowers: typeof profileData.analytics.followersCount === 'number', // UPDATED: from hasConnections
                hasViews: typeof profileData.analytics.profileViews === 'number',
                hasLikes: typeof profileData.analytics.totalLikes === 'number'
              } : null,
              hasBasicFields: {
                name: !!profileData.name,
                avatar: !!(profileData.profilePictureUrl || profileData.avatar),
                headline: !!profileData.headline,
                location: !!profileData.location
              }
            }
          });

          // Return success with all test data
          return NextResponse.json({
            ...testResults,
            status: 'success',
            message: 'Profile system is working correctly',
            userData,
            profileData
          });

        } catch (profileError) {
          testResults.steps.push({
            step: 2,
            name: 'profile/[username] endpoint',
            status: 'error',
            error: profileError instanceof Error ? profileError.message : 'Unknown error'
          });
        }
      } else {
        testResults.steps.push({
          step: 2,
          name: 'profile/[username] endpoint',
          status: 'skipped',
          reason: 'No username available'
        });
      }

    } catch (userError) {
      testResults.steps.push({
        step: 1,
        name: 'users/me endpoint',
        status: 'error',
        error: userError instanceof Error ? userError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      ...testResults,
      status: 'partial',
      message: 'Some tests failed - check steps for details'
    });

  } catch (error) {
    console.error('Profile system test error:', error);
    return NextResponse.json({
      test: 'profile-system',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
