// ==========================================
// PROFILE UTILITY FUNCTIONS
// ==========================================
// Helper functions for profile operations and calculations

import { UnifiedProfile, ProfileStrength } from '@/types/profile';

// ==========================================
// PROFILE COMPLETION CALCULATION
// ==========================================

function calculateProfileCompletion(profile: UnifiedProfile): number {
  const sections = {
    // Basic info (30 points)
    basicInfo: {
      weight: 30,
      completed: !!(
        profile.name &&
        profile.profilePictureUrl &&
        profile.headline &&
        profile.bio
      )
    },

    // Contact info (10 points)
    contact: {
      weight: 10,
      completed: !!(
        profile.email &&
        profile.phoneNumber &&
        profile.city &&
        profile.country
      )
    },

    // Professional summary (15 points)
    professional: {
      weight: 15,
      completed: !!(
        profile.professionalSummary &&
        profile.currentPosition &&
        profile.keySkills.length >= 3
      )
    },

    // Work experience (20 points)
    experience: {
      weight: 20,
      completed: profile.workExperiences.length >= 1
    },

    // Education (10 points)
    education: {
      weight: 10,
      completed: profile.educations.length >= 1
    },

    // Projects (10 points)
    projects: {
      weight: 10,
      completed: profile.projects.length >= 1
    },

    // Certifications (5 points)
    certifications: {
      weight: 5,
      completed: profile.certifications.length >= 1
    }
  };

  const totalPoints = Object.values(sections).reduce((sum, section) => {
    return sum + (section.completed ? section.weight : 0);
  }, 0);

  return Math.round(totalPoints);
}

// ==========================================
// PROFILE STRENGTH CALCULATION
// ==========================================

function calculateProfileStrength(profile: UnifiedProfile): ProfileStrength {
  const completionPercentage = calculateProfileCompletion(profile);
  
  if (completionPercentage >= 90) return ProfileStrength.EXCELLENT;
  if (completionPercentage >= 75) return ProfileStrength.STRONG;
  if (completionPercentage >= 60) return ProfileStrength.GOOD;
  if (completionPercentage >= 40) return ProfileStrength.FAIR;
  return ProfileStrength.WEAK;
}

// ==========================================
// PROFILE URL GENERATION
// ==========================================

function generateProfileUrls(username: string, resumeSlug?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edumatrix.com';
  
  return {
    primary: `${baseUrl}/u/${username}`,
    professional: resumeSlug ? `${baseUrl}/profile/${resumeSlug}` : `${baseUrl}/profile/${username}`,
    social: `${baseUrl}/@${username}`,
    embed: `${baseUrl}/u/${username}?embed=true`,
    qr: `${baseUrl}/api/qr/profile/${username}`
  };
}

// ==========================================
// SKILLS EXTRACTION AND CATEGORIZATION
// ==========================================

function categorizeSkills(skills: string[]) {
  const categories = {
    programming: ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'],
    frontend: ['react', 'vue', 'angular', 'html', 'css', 'typescript', 'nextjs', 'nuxt', 'svelte'],
    backend: ['nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'fastapi'],
    databases: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible'],
    design: ['figma', 'sketch', 'photoshop', 'illustrator', 'ux', 'ui', 'design'],
    data: ['sql', 'analytics', 'machine learning', 'ai', 'data science', 'tableau', 'power bi'],
    mobile: ['ios', 'android', 'react native', 'flutter', 'xamarin'],
    tools: ['git', 'jira', 'slack', 'notion', 'trello', 'jenkins', 'github']
  };

  const categorized: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  skills.forEach(skill => {
    const normalizedSkill = skill.toLowerCase();
    let categoryFound = false;

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => normalizedSkill.includes(keyword))) {
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(skill);
        categoryFound = true;
        break;
      }
    }

    if (!categoryFound) {
      uncategorized.push(skill);
    }
  });

  return { categorized, uncategorized };
}

// ==========================================
// PROFILE SUGGESTIONS GENERATION
// ==========================================

function generateProfileSuggestions(profile: UnifiedProfile) {
  const suggestions = [];
  const completion = calculateProfileCompletion(profile);

  // Basic profile completion suggestions
  if (!profile.profilePictureUrl) {
    suggestions.push({
      type: 'UPDATE_PHOTO',
      title: 'Add a profile photo',
      description: 'Profiles with photos get 14x more views',
      priority: 'HIGH'
    });
  }

  if (!profile.headline) {
    suggestions.push({
      type: 'IMPROVE_SUMMARY',
      title: 'Add a professional headline',
      description: 'A clear headline helps recruiters find you',
      priority: 'HIGH'
    });
  }

  if (profile.keySkills.length < 5) {
    suggestions.push({
      type: 'ADD_SKILLS',
      title: 'Add more skills',
      description: 'Add at least 5 skills to improve discoverability',
      priority: 'MEDIUM'
    });
  }

  if (profile.workExperiences.length === 0) {
    suggestions.push({
      type: 'COMPLETE_SECTION',
      title: 'Add work experience',
      description: 'Showcase your professional background',
      priority: 'HIGH'
    });
  }

  if (profile.projects.length === 0) {
    suggestions.push({
      type: 'ADD_PROJECTS',
      title: 'Add projects',
      description: 'Demonstrate your skills with project examples',
      priority: 'MEDIUM'
    });
  }

  if (!profile.professionalSummary) {
    suggestions.push({
      type: 'IMPROVE_SUMMARY',
      title: 'Write a professional summary',
      description: 'Tell your story in 2-3 sentences',
      priority: 'MEDIUM'
    });
  }

  // Open for work suggestions
  if (profile.openToWork && !profile.preferredWorkType) {
    suggestions.push({
      type: 'UPDATE_WORK_STATUS',
      title: 'Specify work preferences',
      description: 'Let recruiters know your preferred work type',
      priority: 'MEDIUM'
    });
  }

  return suggestions;
}

// ==========================================
// CONTACT INFORMATION FORMATTING
// ==========================================

function formatContactInfo(profile: UnifiedProfile, showSensitive: boolean = false) {
  const contacts = [];

  if (showSensitive && profile.email) {
    contacts.push({
      type: 'email',
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
      icon: '📧'
    });
  }

  if (showSensitive && profile.phoneNumber) {
    contacts.push({
      type: 'phone',
      label: 'Phone',
      value: profile.phoneNumber,
      href: `tel:${profile.phoneNumber}`,
      icon: '📱'
    });  }

  if (profile.websiteUrl) {
    contacts.push({
      type: 'website',
      label: 'Website',
      value: 'Personal Website',
      href: profile.websiteUrl,
      icon: '🔗'
    });
  }

  return contacts;
}

// ==========================================
// LOCATION FORMATTING
// ==========================================

function formatLocation(profile: UnifiedProfile): string {
  const parts = [];
  
  if (profile.city) parts.push(profile.city);
  if (profile.country) parts.push(profile.country);
  
  return parts.join(', ');
}

// ==========================================
// EXPERIENCE DURATION CALCULATION
// ==========================================

function calculateExperienceDuration(startDate: Date, endDate?: Date): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const diffMs = end.getTime() - start.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  
  const years = Math.floor(diffMonths / 12);
  const months = diffMonths % 12;
  
  if (years === 0) {
    return months === 1 ? '1 month' : `${months} months`;
  }
  
  if (months === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  
  return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

export {
  calculateProfileCompletion,
  calculateProfileStrength,
  generateProfileUrls,
  categorizeSkills,
  generateProfileSuggestions,
  formatContactInfo,
  formatLocation,
  calculateExperienceDuration
};
