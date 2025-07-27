import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UnifiedProfilePage } from '@/components/profile/UnifiedProfilePage'
import { Metadata } from 'next'
import { validateProfileParam } from '@/lib/utils/username'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

// ==========================================
// METADATA GENERATION FOR SEO 
// This function generates metadata for the profile page based on the username.
// ==========================================

export async function generateMetadata({ 
  params 
}: ProfilePageProps): Promise<Metadata> {
  try {
    const { username } = await params;
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        firstName: true,
        lastName: true,
        headline: true,
        bio: true,
        profilePictureUrl: true,
      }
    });
    
    if (!profileUser) {
      return {
        title: 'Profile Not Found - Edu Matrix Interlinked',
        description: 'The requested profile could not be found.',
      };
    }

    const fullName = `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim();
    const title = profileUser.headline 
      ? `${fullName} - ${profileUser.headline}` 
      : `${fullName} - Profile`;

    return {
      title,
      description: profileUser.bio || `View ${fullName}'s professional profile on Edu Matrix Interlinked`,
      openGraph: {
        title,
        description: profileUser.bio || `View ${fullName}'s professional profile`,
        images: profileUser.profilePictureUrl ? [profileUser.profilePictureUrl] : [],
      },
    };
  } catch (error) {
    console.error('Error generating profile metadata:', error);
    return {
      title: 'Profile - Edu Matrix Interlinked',
      description: 'Professional profile on Edu Matrix Interlinked platform.',
    };
  }
}

async function getProfileData(username: string) {
  try {
    // ✅ PRODUCTION: Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
      console.error('Invalid username parameter:', username);
      return null;
    }

    // ✅ PRODUCTION: Sanitize username to prevent injection attacks
    const sanitizedUsername = username.trim().toLowerCase();
    
    // ✅ PRODUCTION: Check if username looks like a UUID and resolve to username
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let lookupField: 'username' | 'id' = 'username';
    let lookupValue = sanitizedUsername;
    
    if (uuidRegex.test(sanitizedUsername)) {
      console.warn('Profile URL contains UUID, attempting UUID-to-username resolution:', sanitizedUsername);
      lookupField = 'id';
      lookupValue = sanitizedUsername;
    }

    const session = await auth()
      const user = await prisma.user.findUnique({
      where: lookupField === 'username' ? { username: lookupValue } : { id: lookupValue },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        profilePictureUrl: true, // Use correct field name
        profession: true,
        isVerified: true,
        phoneNumber: true,
        // Profile fields with correct names
        firstName: true,
        lastName: true,
        coverPhotoUrl: true,
        headline: true,
        openToWork: true,
        profileVisibility: true,
        // Contact fields with correct names
        website: true, // Not websiteUrl
        twitterUrl: true,
        // Location fields
        city: true,
        country: true,
        location: true,
        // Professional fields
        professionalSummary: true,
        currentPosition: true,
        currentCompany: true,
        totalExperience: true,
        keySkills: true,
        languages: true,
        // Social counts - CRITICAL FIX: Include follower, following, and profile view counts
        followersCount: true,
        followingCount: true,
        profileViewsCount: true,
        totalLikesReceived: true,
        // Career goals
        careerGoalsShort: true,
        // Personal info
        academicYear: true,
        major: true,
        // Timestamps
        createdAt: true,
        updatedAt: true,
        // Relationships
        workExperiences: {
          orderBy: { startDate: 'desc' }
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
        }
      }
    })

    if (!user) {
      return null
    }    // NEXT.JS OFFICIAL: Data transformation with proper error handling
    let displayName = user.name;
    if (!displayName || !displayName.trim()) {
      // Fallback construction using optional chaining
      const firstName = user.firstName?.trim() || '';
      const lastName = user.lastName?.trim() || '';
      if (firstName || lastName) {
        displayName = `${firstName} ${lastName}`.trim();
      } else {
        displayName = user.username; // Ultimate fallback
      }
    }

    // Next.js pattern: Create properly typed response object
    const profileData = {
      ...user,
      name: displayName,
      // Use profilePictureUrl directly 
      profilePictureUrl: user.profilePictureUrl,
      // Ensure required fields have fallbacks
      headline: user.headline || '',
      bio: user.bio || '',
      // Map website field correctly
      websiteUrl: user.website,
      // ✅ CRITICAL FIX: Include social counts for consistent data display
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      profileViewsCount: user.profileViewsCount || 0,
      totalLikesReceived: user.totalLikesReceived || 0,
      // Ensure arrays are defined
      workExperiences: user.workExperiences || [],
      educations: user.educations || [],
      projects: user.projects || [],
      certifications: user.certifications || [],
      achievements: user.achievements || [],
      keySkills: user.keySkills || [],
      languages: user.languages || [],
    };    // Next.js pattern: Check privacy settings
    if (user.profileVisibility === 'PRIVATE') {
      const canView = session?.user?.id === user.id;
      if (!canView) {
        return null; // Return null to trigger notFound()
      }
    }

    return profileData;  } catch (error) {
    // ✅ PRODUCTION: Enhanced error handling with proper logging
    console.error('Error fetching profile data:', {
      username,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    // ✅ PRODUCTION: Different error handling for development vs production
    if (process.env.NODE_ENV === 'development') {
      console.error('Profile fetch error details:', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    return null; // Triggers Next.js notFound()
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  try {
    const { username } = await params;
    
    // ✅ PRODUCTION: Validate username parameter before processing
    if (!username || typeof username !== 'string' || username.trim() === '') {
      console.error('Invalid username parameter received:', username);
      notFound();
    }

    const session = await auth();
    const profile = await getProfileData(username);

    // ✅ PRODUCTION: Enhanced debugging for profile resolution
    if (process.env.NODE_ENV === 'development') {
      console.log('=== PROFILE PAGE DEBUG ===');
      console.log('Requested username:', username);
      console.log('Profile found:', !!profile);
      console.log('Session user:', session?.user?.username);
    }

    // Next.js pattern: Handle not found case
    if (!profile) {
      console.error('Profile not found for username:', username);
      notFound();
    }

    // Next.js pattern: Determine edit permissions
    const canEdit = session?.user?.id === profile.id || session?.user?.username === profile.username;
    
    // ✅ PRODUCTION: Remove development logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log('=== PROFILE PAGE DEBUG ===');
      console.log('Profile loaded successfully:', {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        canEdit
      });
    }

    // Next.js component rendering pattern
    return (
      <UnifiedProfilePage 
        profile={profile as any} 
        canEdit={canEdit}
        viewerRelation={canEdit ? 'self' : 'public'}
      />
    );
  } catch (error) {
    // Next.js error boundary pattern
    console.error('ProfilePage error:', error);
    notFound(); // Fallback to 404
  }
}
