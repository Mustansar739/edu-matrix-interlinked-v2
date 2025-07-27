// Production-ready utility functions for profile handling

/**
 * Safely generates user initials with comprehensive fallback handling
 * @param name - User's full name
 * @param username - Username as fallback
 * @returns Two-character initials, guaranteed non-empty
 */
export function safeGetInitials(name?: string | null, username?: string | null): string {
  try {
    // First try: Use the provided name
    if (name && typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();
      const words = cleanName.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) {
        return safeGetInitials(null, username);
      }

      // Get initials from first and last word (or just first if only one word)
      const initials = words.length === 1 
        ? words[0].slice(0, 2) 
        : words[0].charAt(0) + (words[words.length - 1]?.charAt(0) || '');

      const result = initials.toUpperCase().slice(0, 2);
      return result || safeGetInitials(null, username);
    }

    // Second try: Use username
    if (username && typeof username === 'string' && username.trim()) {
      const cleanUsername = username.trim();
      return cleanUsername.slice(0, 2).toUpperCase();
    }

    // Ultimate fallback
    return 'US'; // "User"
  } catch (error) {
    console.error('Error generating initials:', error);
    return 'US';
  }
}

/**
 * Safely constructs a display name from various name sources
 * @param name - Primary name field
 * @param firstName - First name
 * @param lastName - Last name  
 * @param username - Username as final fallback
 * @returns Guaranteed non-empty display name
 */
export function safeGetDisplayName(
  name?: string | null,
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null
): string {
  try {
    // First try: Use primary name if available
    if (name && typeof name === 'string' && name.trim()) {
      return name.trim();
    }

    // Second try: Construct from first/last name
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    if (first || last) {
      const constructed = `${first} ${last}`.trim();
      if (constructed) {
        return constructed;
      }
    }

    // Third try: Use username
    if (username && typeof username === 'string' && username.trim()) {
      return username.trim();
    }

    // Ultimate fallback
    return 'Anonymous User';
  } catch (error) {
    console.error('Error constructing display name:', error);
    return 'Anonymous User';
  }
}

/**
 * Validates and sanitizes profile data for safe rendering
 * @param profile - Raw profile data from database
 * @returns Sanitized profile with guaranteed safe values
 */
export function sanitizeProfileData(profile: any): any {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Invalid profile data provided');
  }

  try {
    // Ensure critical fields are never null/undefined
    const sanitized = {
      ...profile,
      name: safeGetDisplayName(
        profile.name,
        profile.firstName,
        profile.lastName,
        profile.username
      ),
      username: profile.username || 'unknown',
      headline: profile.headline || '',
      bio: profile.bio || '',
      profession: profile.profession || 'USER',
      isVerified: Boolean(profile.isVerified),
      openToWork: Boolean(profile.openToWork),
      // Ensure arrays are always arrays
      workExperiences: Array.isArray(profile.workExperiences) ? profile.workExperiences : [],
      educations: Array.isArray(profile.educations) ? profile.educations : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
      certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
      // Ensure dates are valid
      createdAt: profile.createdAt instanceof Date ? profile.createdAt : new Date(profile.createdAt || Date.now()),
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt : new Date(profile.updatedAt || Date.now()),
    };

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing profile data:', error);
    throw new Error('Failed to sanitize profile data');
  }
}

/**
 * Type guard to check if a profile object has minimum required fields
 * @param profile - Profile object to validate
 * @returns True if profile has minimum required fields
 */
export function isValidProfile(profile: any): boolean {
  return (
    profile &&
    typeof profile === 'object' &&
    typeof profile.id === 'string' &&
    typeof profile.username === 'string' &&
    profile.username.length > 0
  );
}

/**
 * Production-ready error logging utility
 * @param error - Error object
 * @param context - Additional context information
 */
export function logProfileError(error: Error, context: Record<string, any> = {}): void {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  };

  console.error('Profile Error:', errorData);

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example integrations:
    // Sentry.captureException(error, { extra: errorData });
    // LogRocket.captureException(error);
    // Custom monitoring service API call
  }
}
