// Simple profile interface that matches database fields
export interface SimpleProfile {
  // Core fields
  id: string;
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  
  // Profile fields
  bio?: string;
  headline?: string;
  professionalSummary?: string;
  careerGoalsShort?: string;
  
  // Location & Work
  city?: string;
  country?: string;
  currentPosition?: string;
  currentCompany?: string;
    // Contact
  phoneNumber?: string;
  websiteUrl?: string; // Single flexible URL field for any personal website
  
  // Additional fields
  languages?: string[];
  totalExperience?: number;
  major?: string;
  academicYear?: string;
  
  // Profile settings
  openToWork?: boolean;
  profileVisibility?: string;
  
  // Images
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  
  // Computed fields
  profileCompletion?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  
  // Relations
  workExperiences?: any[];
  educations?: any[];
  projects?: any[];
  certifications?: any[];
  achievements?: any[];
}
