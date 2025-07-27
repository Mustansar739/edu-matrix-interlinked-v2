// ==========================================
// PROFILE SEO METADATA SERVICE
// ==========================================
// Generates rich metadata for profile pages for SEO and social sharing

import { Metadata } from 'next';
import { UnifiedProfile } from '@/types/profile';

interface MetadataOptions {
  isEmbed?: boolean;
  section?: string;
  isPreview?: boolean;
}

// ==========================================
// MAIN METADATA GENERATION
// ==========================================

export function generateProfileMetadata(
  profile: UnifiedProfile,
  options: MetadataOptions = {}
): Metadata {
  const { isEmbed, section, isPreview } = options;

  // Base URL for the platform
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edumatrix.com';
  const profileUrl = `${baseUrl}/u/${profile.username}`;

  // Generate title
  const title = generateTitle(profile, section, isEmbed);
  
  // Generate description
  const description = generateDescription(profile, section);

  // Generate keywords
  const keywords = generateKeywords(profile);

  // Generate Open Graph data
  const openGraph = generateOpenGraph(profile, profileUrl, title, description);

  // Generate Twitter Card data
  const twitter = generateTwitterCard(profile, title, description);

  return {
    title,
    description,
    keywords,
    
    // Canonical URL
    alternates: {
      canonical: profileUrl
    },

    // Open Graph (Facebook, LinkedIn)
    openGraph,

    // Twitter Card
    twitter,

    // Additional SEO meta tags
    other: {
      'profile:first_name': profile.name.split(' ')[0],
      'profile:last_name': profile.name.split(' ').slice(1).join(' '),
      'profile:username': profile.username,
      'og:profile:profession': profile.profession,
      'author': profile.name,
      'robots': profile.isResumePublic ? 'index,follow' : 'noindex,nofollow',
      
      // Schema.org JSON-LD will be added separately
      'application-name': 'Edu Matrix Interlinked',
      'apple-mobile-web-app-title': 'Edu Matrix Interlinked',
      'msapplication-TileColor': '#0066CC',
      'theme-color': '#0066CC',
    },

    // Additional metadata for embeds
    ...(isEmbed && {
      other: {
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;"
      }
    })
  };
}

// ==========================================
// TITLE GENERATION
// ==========================================

function generateTitle(
  profile: UnifiedProfile, 
  section?: string, 
  isEmbed?: boolean
): string {
  const baseTitle = `${profile.name}`;
  const platformSuffix = ' - Edu Matrix Interlinked';

  if (isEmbed) {
    return `${baseTitle} | Professional Profile`;
  }

  if (section) {
    const sectionTitles: Record<string, string> = {
      about: 'About',
      experience: 'Work Experience',
      education: 'Education',
      projects: 'Projects',
      skills: 'Skills & Technologies',
      certifications: 'Certifications',
      achievements: 'Achievements'
    };
    
    const sectionTitle = sectionTitles[section] || section;
    return `${baseTitle} - ${sectionTitle}${platformSuffix}`;
  }

  // Include profession and key info in title
  const titleParts = [baseTitle];
  
  if (profile.headline) {
    titleParts.push(profile.headline);
  } else if (profile.currentPosition) {
    titleParts.push(profile.currentPosition);
  }

  if (profile.openToWork) {
    titleParts.push('Open for Work');
  }

  return `${titleParts.join(' | ')}${platformSuffix}`;
}

// ==========================================
// DESCRIPTION GENERATION
// ==========================================

function generateDescription(profile: UnifiedProfile, section?: string): string {
  if (section) {
    const sectionDescriptions: Record<string, string> = {
      about: `Learn about ${profile.name}'s professional background and expertise.`,
      experience: `Explore ${profile.name}'s work experience and career history.`,
      education: `View ${profile.name}'s educational background and qualifications.`,
      projects: `Discover projects and portfolio work by ${profile.name}.`,
      skills: `See ${profile.name}'s skills and technical expertise.`,
      certifications: `Browse ${profile.name}'s professional certifications and achievements.`
    };
    
    return sectionDescriptions[section] || `View ${profile.name}'s professional profile.`;
  }

  // Build comprehensive description
  const descriptionParts: string[] = [];

  // Professional summary or headline
  if (profile.professionalSummary) {
    descriptionParts.push(profile.professionalSummary.substring(0, 150));
  } else if (profile.headline) {
    descriptionParts.push(`${profile.headline}.`);
  }

  // Current position
  if (profile.currentPosition && profile.currentCompany) {
    descriptionParts.push(`Currently ${profile.currentPosition} at ${profile.currentCompany}.`);
  }

  // Key skills
  if (profile.keySkills.length > 0) {
    const skills = profile.keySkills.slice(0, 5).join(', ');
    descriptionParts.push(`Expertise in ${skills}.`);
  }

  // Location
  if (profile.city && profile.country) {
    descriptionParts.push(`Based in ${profile.city}, ${profile.country}.`);
  }

  // Open for work status
  if (profile.openToWork) {
    descriptionParts.push('Currently open for new opportunities.');
  }

  const description = descriptionParts.join(' ').substring(0, 160);
  return description || `View ${profile.name}'s professional profile on Edu Matrix Interlinked.`;
}

// ==========================================
// KEYWORDS GENERATION
// ==========================================

function generateKeywords(profile: UnifiedProfile): string[] {
  const keywords: string[] = [
    profile.name,
    profile.username,
    'professional profile',
    'resume',
    'portfolio'
  ];

  // Add profession
  if (profile.profession) {
    keywords.push(profile.profession.toLowerCase().replace('_', ' '));
  }

  // Add headline/position
  if (profile.headline) {
    keywords.push(...profile.headline.toLowerCase().split(' ').filter(word => word.length > 2));
  }

  // Add skills
  keywords.push(...profile.keySkills.map(skill => skill.toLowerCase()));

  // Add location
  if (profile.city) keywords.push(profile.city.toLowerCase());
  if (profile.country) keywords.push(profile.country.toLowerCase());

  // Add company
  if (profile.currentCompany) {
    keywords.push(profile.currentCompany.toLowerCase());
  }

  // Add technologies from projects
  profile.projects.forEach(project => {
    keywords.push(...project.technologies.map(tech => tech.toLowerCase()));
  });

  // Remove duplicates and return
  return [...new Set(keywords)].slice(0, 20);
}

// ==========================================
// OPEN GRAPH GENERATION
// ==========================================

function generateOpenGraph(
  profile: UnifiedProfile,
  profileUrl: string,
  title: string,
  description: string
) {
  return {
    type: 'profile',
    title,
    description,
    url: profileUrl,
    siteName: 'Edu Matrix Interlinked',
    
    // Profile-specific Open Graph
    profile: {
      firstName: profile.name.split(' ')[0],
      lastName: profile.name.split(' ').slice(1).join(' '),
      username: profile.username,
      gender: undefined // Don't assume gender
    },

    // Images
    images: [
      {
        url: profile.profilePictureUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/og/profile/${profile.username}`,
        width: 1200,
        height: 630,
        alt: `${profile.name}'s professional profile picture`
      }
    ],

    // Locale
    locale: 'en_US',
    
    // Additional Open Graph data
    emails: profile.showContactInfo ? [profile.email] : undefined,
    phoneNumbers: profile.showContactInfo && profile.phoneNumber ? [profile.phoneNumber] : undefined
  };
}

// ==========================================
// TWITTER CARD GENERATION
// ==========================================

function generateTwitterCard(
  profile: UnifiedProfile,
  title: string,
  description: string
) {
  return {
    card: 'summary_large_image',
    title,
    description,
    site: '@EduMatrixInterlnkd', // Platform Twitter handle
    creator: profile.username, // User's handle if available
    
    images: [
      {
        url: profile.profilePictureUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter-card/profile/${profile.username}`,
        alt: `${profile.name}'s professional profile`
      }
    ]
  };
}

// ==========================================
// STRUCTURED DATA (JSON-LD)
// ==========================================

export function generateProfileStructuredData(profile: UnifiedProfile): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/u/${profile.username}`,
    image: profile.profilePictureUrl,
    description: profile.professionalSummary || profile.headline,
    
    // Contact info (if public)
    ...(profile.showContactInfo && {
      email: profile.email,
      telephone: profile.phoneNumber
    }),

    // Location
    ...(profile.city && profile.country && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: profile.city,
        addressCountry: profile.country
      }
    }),

    // Job title
    ...(profile.currentPosition && {
      jobTitle: profile.currentPosition
    }),

    // Employer
    ...(profile.currentCompany && {
      worksFor: {
        '@type': 'Organization',
        name: profile.currentCompany
      }
    }),

    // Skills
    knowsAbout: profile.keySkills,    // Social links
    sameAs: [
      profile.websiteUrl
    ].filter(Boolean),

    // Alumni of (education)
    alumniOf: profile.educations.map(edu => ({
      '@type': 'EducationalOrganization',
      name: edu.institution
    }))
  };

  return JSON.stringify(structuredData);
}
