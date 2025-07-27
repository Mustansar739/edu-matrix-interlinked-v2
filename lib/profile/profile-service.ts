// ==========================================
// PROFILE SERVICE - Data Access Layer
// ==========================================
// Core service for fetching and manipulating profile data

import { prisma } from '@/lib/prisma';
import { UnifiedProfile, ProfileResponse, ViewerRelation } from '@/types/profile';
import { calculateProfileCompletion } from '@/lib/profile/profile-utils';
import { checkProfilePermissions } from '@/lib/profile/profile-permissions';

// ==========================================
// MAIN PROFILE FETCHING FUNCTION
// ==========================================

async function getProfileByUsername(
  username: string,
  viewerId?: string
): Promise<ProfileResponse | null> {
  try {
    // Fetch user with all related profile data
    const user = await prisma.user.findUnique({
      where: { 
        username,
        deletedAt: null // Exclude soft deleted profiles
      },
      include: {
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
        },
        profileViews: {
          where: {
            viewedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },          select: {
            viewerId: true,
            viewedAt: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    // Transform database user to UnifiedProfile    // Helper function to convert null to undefined
    const nullToUndefined = <T>(value: T | null): T | undefined => value === null ? undefined : value;

    const profile: UnifiedProfile = {
      // Core Identity
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      profilePictureUrl: nullToUndefined(user.avatar),
      coverPhotoUrl: undefined, // TODO: Add to schema
      bio: nullToUndefined(user.bio),
      profession: user.profession as any,
      isVerified: user.isVerified,

      // Professional Summary
      professionalSummary: nullToUndefined(user.professionalSummary),
      headline: nullToUndefined(user.headline),
      currentPosition: nullToUndefined(user.currentPosition),
      currentCompany: nullToUndefined(user.currentCompany),      // Contact & Location
      phoneNumber: nullToUndefined(user.phoneNumber),
      city: nullToUndefined(user.city),
      country: nullToUndefined(user.country),
      address: nullToUndefined(user.address),
      websiteUrl: nullToUndefined(user.websiteUrl),

      // Open for Work (Basic from schema)
      openToWork: user.openToWork,
      preferredWorkType: nullToUndefined(user.preferredWorkType),
      expectedSalaryMin: undefined, // TODO: Parse from expectedSalary
      expectedSalaryMax: undefined, // TODO: Parse from expectedSalary
      salaryCurrency: 'USD',
      salaryPeriod: 'ANNUAL' as any,
      availableFrom: nullToUndefined(user.availableFrom),
      noticePeriod: undefined, // TODO: Add to schema      // Job Preferences (TODO: Add to schema)
      preferredRoles: [],
      preferredCompanySize: undefined,
      preferredCompanyStage: undefined,
      preferredIndustries: [],
      openToRelocation: false,
      preferredLocations: [],
      workAuthorization: undefined,

      // Career Goals (TODO: Add to schema)
      careerGoalsShort: undefined,
      careerGoalsLong: undefined,
      prioritiesBenefits: [],

      // Recruiter Contact (TODO: Add to schema)
      recruiterContact: true,
      preferredContactMethod: 'EMAIL' as any,
      contactInstructions: undefined,

      // Professional Experience
      totalExperience: nullToUndefined(user.totalExperience),
      keySkills: user.keySkills,
      languages: user.languages,

      // Educational Context
      institutionId: nullToUndefined(user.institutionId),
      departmentId: nullToUndefined(user.departmentId),
      studentId: nullToUndefined(user.studentId),
      employeeId: nullToUndefined(user.employeeId),
      major: nullToUndefined(user.major),
      academicYear: nullToUndefined(user.academicYear),

      // Profile Sharing & Analytics
      resumeSlug: nullToUndefined(user.resumeSlug),
      isResumePublic: user.isResumePublic,
      resumeViews: user.resumeViews,
      lastResumeView: nullToUndefined(user.lastResumeView),      resumeTemplate: nullToUndefined(user.resumeTemplate),
      showContactInfo: user.showContactInfo,
      showProfilePicture: user.showProfilePicture,

      // Enhanced Analytics (calculated)
      profileViewsCount: user.profileViews.length,
      lastProfileView: user.profileViews[0]?.viewedAt ? nullToUndefined(user.profileViews[0].viewedAt) : undefined,
      searchAppearances: 0, // TODO: Implement search tracking
      connectionRequests: 0, // TODO: Connect to social schema
      followersCount: 0, // UPDATED: Changed from connectionsCount - TODO: Connect to social schema
      followers: 0, // TODO: Connect to social schema
      following: 0, // TODO: Connect to social schema
      sharingCount: 0, // TODO: Implement sharing tracking
      globalReach: 0, // TODO: Implement global reach tracking when country field exists
      totalLikesReceived: 0, // TODO: Connect to social schema

      // Privacy & Visibility (TODO: Implement)
      sectionPrivacy: {
        about: 'PUBLIC',
        workExperience: 'PUBLIC',
        education: 'PUBLIC',
        projects: 'PUBLIC',
        skills: 'PUBLIC',
        certifications: 'PUBLIC',
        achievements: 'PUBLIC',
        contact: user.showContactInfo ? 'PUBLIC' : 'CONNECTIONS',
        analytics: 'PRIVATE',
        openForWork: user.openToWork ? 'PUBLIC' : 'PRIVATE'
      } as any,
      geographicRestrictions: [],
      professionalMode: false,

      // Profile Quality
      completionPercentage: 0, // Will be calculated
      profileStrength: 'FAIR' as any,
      lastOptimizationSuggestion: undefined,

      // Timestamps
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActivity: nullToUndefined(user.lastActivity),

      // Relationships
      workExperiences: user.workExperiences.map(exp => ({
        ...exp,
        companyLogo: null,
        companySize: null,
        industry: null,
        workType: null
      })) as any,
      educations: user.educations.map(edu => ({
        ...edu,
        institutionLogo: null,
        institutionType: null,
        location: null,
        honors: []
      })) as any,
      projects: user.projects.map(proj => ({
        ...proj,
        isFeatured: false,
        collaborators: [],
        impact: null
      })) as any,
      certifications: user.certifications.map(cert => ({
        ...cert,
        badgeUrl: null,        isVerified: false
      })) as any,
      achievements: user.achievements.map(ach => ({
        ...ach,
        issuer: null,
        impact: null
      })) as any,
      profileViews: [] // Don't expose individual views for security
    };

    // Calculate profile completion
    profile.completionPercentage = calculateProfileCompletion(profile);

    // Determine viewer relationship and permissions
    const canEdit = viewerId === user.id;
    const viewerRelation: ViewerRelation = {
      isOwner: canEdit,
      isConnected: false, // TODO: Check social connections
      hasRequested: false, // TODO: Check pending requests
      canMessage: false, // TODO: Check messaging permissions
      canViewContact: checkProfilePermissions(profile, viewerId, 'contact')
    };

    return {
      profile,
      canEdit,
      viewerRelation,
      suggestions: [] // TODO: Generate profile suggestions
    };

  } catch (error) {
    console.error('Error fetching profile by username:', error);
    throw new Error('Failed to fetch profile');
  }
}

// ==========================================
// PROFILE SEARCH AND DISCOVERY
// ==========================================

async function searchProfiles(query: string, options: {
  profession?: string;
  location?: string;
  skills?: string[];
  limit?: number;
  offset?: number;
} = {}) {
  const { profession, location, skills, limit = 20, offset = 0 } = options;

  try {
    const profiles = await prisma.user.findMany({
      where: {
        AND: [
          { deletedAt: null },
          { isResumePublic: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { headline: { contains: query, mode: 'insensitive' } },
              { professionalSummary: { contains: query, mode: 'insensitive' } },
              { keySkills: { hasSome: [query] } }
            ]
          },
          profession ? { profession: profession as any } : {},
          location ? {
            OR: [
              { city: { contains: location, mode: 'insensitive' } },
              { country: { contains: location, mode: 'insensitive' } }
            ]
          } : {},
          skills?.length ? { keySkills: { hasSome: skills } } : {}
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        headline: true,
        city: true,
        country: true,
        profession: true,
        keySkills: true,
        openToWork: true,
        resumeViews: true
      },
      orderBy: [
        { resumeViews: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    return profiles;
  } catch (error) {
    console.error('Error searching profiles:', error);
    throw new Error('Failed to search profiles');
  }
}

// ==========================================
// PROFILE UPDATES
// ==========================================

async function updateProfileSection(
  userId: string,
  section: string,
  data: any
) {
  try {
    // Validate user owns the profile
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Profile not found');
    }

    // Update based on section
    switch (section) {
      case 'basic':
        return await prisma.user.update({
          where: { id: userId },
          data: {
            name: data.name,
            headline: data.headline,
            professionalSummary: data.professionalSummary,
            city: data.city,
            country: data.country,
            phoneNumber: data.phoneNumber
          }
        });      case 'contact':
        return await prisma.user.update({
          where: { id: userId },
          data: {
            websiteUrl: data.websiteUrl,
            showContactInfo: data.showContactInfo
          }
        });

      case 'openForWork':
        return await prisma.user.update({
          where: { id: userId },
          data: {
            openToWork: data.openToWork,
            preferredWorkType: data.preferredWorkType,
            expectedSalary: data.expectedSalary,
            availableFrom: data.availableFrom
          }
        });

      default:
        throw new Error(`Unknown section: ${section}`);
    }
  } catch (error) {
    console.error('Error updating profile section:', error);
    throw new Error('Failed to update profile');
  }
}

// ==========================================
// PROFILE ANALYTICS
// ==========================================

async function getProfileAnalytics(userId: string, period: number = 30) {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);    const analytics = await prisma.profileView.groupBy({
      by: ['viewedAt'],
      where: {
        profileId: userId,
        viewedAt: { gte: startDate }
      },
      _count: {
        id: true
      }
    });

    return {
      totalViews: analytics.reduce((sum, item) => sum + (item._count?.id || 0), 0),
      uniqueCountries: 0, // TODO: Implement when country field is added to schema
      dailyViews: analytics.reduce((acc, item) => {
        const date = item.viewedAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + (item._count?.id || 0);
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (error) {
    console.error('Error fetching profile analytics:', error);
    throw new Error('Failed to fetch analytics');
  }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

export {
  getProfileByUsername,
  searchProfiles,
  updateProfileSection,
  getProfileAnalytics
};
