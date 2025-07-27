// ==========================================
// PROFILE PERMISSIONS UTILITY
// ==========================================
// Handles permission checking for profile access and visibility

import { UnifiedProfile, PrivacyLevel } from '@/types/profile';

// ==========================================
// PERMISSION CHECKING
// ==========================================

function checkProfilePermissions(
  profile: UnifiedProfile,
  viewerId?: string,
  section?: string
): boolean {
  // Profile owner can always access everything
  if (viewerId === profile.id) {
    return true;
  }

  // Check if profile is public
  if (!profile.isResumePublic && !viewerId) {
    return false;
  }

  // Check section-specific permissions
  if (section && profile.sectionPrivacy) {
    const sectionPrivacy = profile.sectionPrivacy[section as keyof typeof profile.sectionPrivacy];
    return checkPrivacyLevel(sectionPrivacy, viewerId, profile);
  }

  // Default: allow access to public profiles for logged-in users
  return profile.isResumePublic || !!viewerId;
}

// ==========================================
// PRIVACY LEVEL CHECKING
// ==========================================

function checkPrivacyLevel(
  privacyLevel: PrivacyLevel,
  viewerId?: string,
  profile?: UnifiedProfile
): boolean {
  switch (privacyLevel) {
    case 'PUBLIC':
      return true;

    case 'LOGGED_IN':
      return !!viewerId;

    case 'CONNECTIONS':
      if (!viewerId || !profile) return false;
      // TODO: Check if viewer is connected to profile owner
      // For now, treat as logged-in users
      return true;

    case 'PRIVATE':
      return false;

    default:
      return false;
  }
}

// ==========================================
// CONTACT INFO ACCESS
// ==========================================

function canViewContactInfo(
  profile: UnifiedProfile,
  viewerId?: string
): boolean {
  // Owner can always see their own contact info
  if (viewerId === profile.id) {
    return true;
  }

  // Check profile settings
  if (!profile.showContactInfo) {
    return false;
  }

  // Check section privacy
  return checkProfilePermissions(profile, viewerId, 'contact');
}

// ==========================================
// ANALYTICS ACCESS
// ==========================================

function canViewAnalytics(
  profile: UnifiedProfile,
  viewerId?: string
): boolean {
  // Only profile owner can view analytics
  return viewerId === profile.id;
}

// ==========================================
// EDITING PERMISSIONS
// ==========================================

function canEditProfile(
  profile: UnifiedProfile,
  userId?: string
): boolean {
  // Only profile owner can edit
  return userId === profile.id;
}

function canEditSection(
  profile: UnifiedProfile,
  section: string,
  userId?: string
): boolean {
  // Basic edit permission check
  if (!canEditProfile(profile, userId)) {
    return false;
  }

  // All sections are editable by owner for now
  // Could add section-specific permissions here
  return true;
}

// ==========================================
// MESSAGING PERMISSIONS
// ==========================================

function canMessage(
  profile: UnifiedProfile,
  viewerId?: string
): boolean {
  // Can't message yourself
  if (viewerId === profile.id) {
    return false;
  }

  // Need to be logged in
  if (!viewerId) {
    return false;
  }

  // TODO: Check if messaging is enabled and privacy settings
  // For now, allow messaging if profile is public
  return profile.isResumePublic;
}

// ==========================================
// CONNECTION PERMISSIONS
// ==========================================

function canConnect(
  profile: UnifiedProfile,
  viewerId?: string
): boolean {
  // Can't connect to yourself
  if (viewerId === profile.id) {
    return false;
  }

  // Need to be logged in
  if (!viewerId) {
    return false;
  }

  // TODO: Check if already connected or request pending
  // For now, allow connections to public profiles
  return profile.isResumePublic;
}

// ==========================================
// SECTION VISIBILITY
// ==========================================

function getVisibleSections(
  profile: UnifiedProfile,
  viewerId?: string
): string[] {
  const allSections = [
    'header',
    'about',
    'workExperience',
    'education',
    'projects',
    'skills',
    'certifications',
    'achievements',
    'openForWork'
  ];

  // Profile owner sees all sections
  if (viewerId === profile.id) {
    return [...allSections, 'analytics', 'sharing'];
  }

  // Filter sections based on privacy settings
  return allSections.filter(section => {
    // Special handling for certain sections
    if (section === 'openForWork' && !profile.openToWork) {
      return false;
    }

    return checkProfilePermissions(profile, viewerId, section);
  });
}

// ==========================================
// PROFILE DISCOVERY
// ==========================================

function isDiscoverable(profile: UnifiedProfile): boolean {
  // Profile must be public to be discoverable
  if (!profile.isResumePublic) {
    return false;
  }

  // Must have minimum profile completion
  const minCompletion = 40; // 40% minimum
  return profile.completionPercentage >= minCompletion;
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

export {
  checkProfilePermissions,
  canViewContactInfo,
  canViewAnalytics,
  canEditProfile,
  canEditSection,
  canMessage,
  canConnect,
  getVisibleSections,
  isDiscoverable
};
