/**
 * @fileoverview Unified Profile Page - Main Container
 * @module UnifiedProfilePage
 * @category PageComponent
 * 
 * @description
 * Main profile page serving as the single entry point for user profiles
 * - Official Next.js 15 App Router patterns with async params/searchParams
 * - NextAuth.js 5.0 authentication with server-side session handling
 * - SEO-optimized with dynamic metadata generation
 * - Analytics tracking for profile views
 * - Unified profile system with multiple view types
 */

// ==========================================
// UNIFIED PROFILE PAGE - Main Container
// ==========================================
// Step 2: Main profile page that serves as the single entry point
// Handles data fetching, authentication, and overall layout

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UnifiedProfilePage } from '@/components/profile/UnifiedProfilePage';
import { getProfileByUsername } from '@/lib/profile/profile-service';
import { trackProfileView } from '@/lib/analytics/profile-analytics';
import { generateProfileMetadata } from '@/lib/seo/profile-metadata';
import { ViewType } from '@/types/profile';

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    section?: string;
    embed?: string;
    preview?: string;
  }>;
}

// ==========================================
// METADATA GENERATION FOR SEO
// ==========================================

export async function generateMetadata({ 
  params,
  searchParams 
}: ProfilePageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const profile = await getProfileByUsername(resolvedParams.username);
    
    if (!profile) {
      return {
        title: 'Profile Not Found - Edu Matrix Interlinked',
        description: 'The requested profile could not be found.',
      };
    }

    return generateProfileMetadata(profile.profile, {
      isEmbed: !!resolvedSearchParams.embed,
      section: resolvedSearchParams.section
    });
  } catch (error) {
    console.error('Error generating profile metadata:', error);
    return {
      title: 'Profile - Edu Matrix Interlinked',
      description: 'Professional profile on Edu Matrix Interlinked platform.',
    };
  }
}

// ==========================================
// MAIN PROFILE PAGE COMPONENT
// ==========================================

export default async function ProfilePage({ 
  params, 
  searchParams 
}: ProfilePageProps) {
  const { username } = await params;
  const { section, embed, preview } = await searchParams;

  try {
    // Get current session for authentication
    const session = await auth();
    const currentUserId = session?.user?.id;

    // Fetch profile data
    const profileData = await getProfileByUsername(username);

    if (!profileData) {
      redirect('/404');
    }

    const { profile, canEdit, viewerRelation } = profileData;

    // Check if profile is accessible
    if (!profile.isResumePublic && !canEdit && !currentUserId) {
      redirect('/auth/signin?callbackUrl=' + encodeURIComponent(`/u/${username}`));
    }

    // Track profile view (only for non-owner views)
    if (currentUserId && currentUserId !== profile.id && !embed) {
      await trackProfileView({
        viewerId: currentUserId,
        profileId: profile.id,
        viewType: ViewType.PROFILE,
        section: section as any
      });
    }

    // Handle embed mode
    if (embed) {
      return (
        <div className="min-h-screen bg-background">          <UnifiedProfilePage
            profile={profile}
            canEdit={false}
            viewerRelation="public"
            embedMode={true}
            currentSection={section}
          />
        </div>
      );
    }

    // Handle preview mode (for profile owners)
    if (preview && canEdit) {
      return (
        <div className="min-h-screen bg-background">
          <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
            📱 Preview Mode - This is how others see your profile
          </div>          <UnifiedProfilePage
            profile={profile}
            canEdit={false}
            viewerRelation="public"
            previewMode={true}
            currentSection={section}
          />
        </div>
      );
    }

    // Main profile page
    return (
      <div className="min-h-screen bg-background">        <UnifiedProfilePage
          profile={profile}
          canEdit={canEdit}
          viewerRelation={canEdit ? 'self' : 'public'}
          currentSection={section}
        />
      </div>
    );

  } catch (error) {
    console.error('Error loading profile page:', error);
    
    // Handle different error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        redirect('/404');
      }
      if (error.message.includes('access denied')) {
        redirect('/403');
      }
    }

    // Generic error fallback
    redirect('/500');
  }
}

// ==========================================
// STATIC PARAMS GENERATION (Optional)
// ==========================================

// This would be used for static generation of popular profiles
// export async function generateStaticParams() {
//   // Get list of popular profiles to pre-generate
//   const popularProfiles = await getPopularProfiles(100);
//   
//   return popularProfiles.map((profile) => ({
//     username: profile.username,
//   }));
// }

// ==========================================
// ROUTE CONFIGURATION
// ==========================================

// Enable ISR for profile pages (revalidate every 1 hour)
export const revalidate = 3600;

// Enable edge runtime for better performance
export const runtime = 'nodejs';
