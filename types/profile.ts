// ==========================================
// UNIFIED PROFILE SYSTEM - TYPE DEFINITIONS
// ==========================================
// Step 1: Comprehensive TypeScript interfaces for the Facebook-style profile system
// Combines existing database schema with enhanced unified profile features

// ==========================================
// CORE PROFILE TYPES
// ==========================================

export interface UnifiedProfile {  // Core Identity (from User model)
  id: string;
  username: string;
  email: string;
  name: string;
  profilePictureUrl?: string; // Fixed: matches schema field
  coverPhotoUrl?: string; // Fixed: matches schema field
  bio?: string;
  profession: UserProfession;
  isVerified: boolean;
  
  // Professional Summary & Headlines (from User model)
  professionalSummary?: string;
  headline?: string;
  currentPosition?: string;
  currentCompany?: string;
    // Contact & Location (from User model + enhanced)
  phoneNumber?: string;
  city?: string;
  country?: string;
  address?: string;
  websiteUrl?: string; // Single flexible URL field for any personal website
    // Enhanced Open for Work System
  openToWork: boolean;
  preferredWorkType?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  availableFrom?: Date;
  noticePeriod?: string;
  
  // Job Preferences (Enhanced)
  preferredRoles?: string[];
  preferredCompanySize?: CompanySize;
  preferredCompanyStage?: CompanyStage;
  preferredIndustries?: string[];
  openToRelocation: boolean;
  preferredLocations?: string[];
  workAuthorization?: string;
  
  // Career Goals
  careerGoalsShort?: string;
  careerGoalsLong?: string;
  prioritiesBenefits?: string[];
  
  // Recruiter Contact Preferences
  recruiterContact: boolean;
  preferredContactMethod?: ContactMethod;
  contactInstructions?: string;
  
  // Professional Experience (from User model)
  totalExperience?: number;
  keySkills: string[];
  languages: string[];
  
  // Educational Context (from User model)
  institutionId?: string;
  departmentId?: string;
  studentId?: string;
  employeeId?: string;
  major?: string;
  academicYear?: string;
  
  // Profile Sharing & Analytics (from User model + enhanced)
  resumeSlug?: string;
  isResumePublic: boolean;
  resumeViews: number;
  lastResumeView?: Date;
  resumeTemplate?: string;
  showContactInfo: boolean;
  showProfilePicture: boolean;
  // Enhanced Social & Analytics
  profileViewsCount: number; // Fixed: matches schema field
  lastProfileView?: Date;
  searchAppearances: number;
  connectionRequests: number;
  followersCount: number; // UPDATED: Changed from connectionsCount to followersCount for consistency
  followers: number;
  following: number;
  sharingCount: number;
  globalReach: number; // Countries viewed from
  totalLikesReceived: number; // Universal likes across all content
  
  // Privacy & Visibility (Enhanced)
  sectionPrivacy: SectionPrivacySettings;
  geographicRestrictions?: string[];
  professionalMode: boolean;
  
  // Profile Quality & Completion
  completionPercentage: number;
  profileStrength: ProfileStrength;
  lastOptimizationSuggestion?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date; // ✅ PRODUCTION-READY: Added for presence system integration
  
  // Relationships
  workExperiences: WorkExperience[];
  educations: Education[];
  projects: Project[];
  certifications: Certification[];
  achievements: Achievement[];
  profileViews: ProfileView[];
}

// ==========================================
// PROFILE SECTION TYPES
// ==========================================

export interface WorkExperience {
  id: string;
  userId: string;
  company?: string; // Made optional to support partial entries
  position?: string; // Made optional to support partial entries
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentJob: boolean;
  description?: string;
  achievements: string[];
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Education {
  id: string;
  userId: string;
  institution?: string; // Made optional to support partial entries
  degree?: string; // Made optional to support partial entries
  fieldOfStudy?: string;
  startYear?: number; // Made optional to support partial entries
  endYear?: number;
  gpa?: string;
  grade?: string;
  activities?: string[]; // Made optional for consistency
  achievements?: string[]; // Made optional for consistency
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title?: string; // Made optional to support partial entries
  description?: string; // Made optional to support partial entries
  technologies: string[];
  category?: string;
  liveUrl?: string;
  repositoryUrl?: string; // Repository URL (GitHub, GitLab, Bitbucket, etc.)
  imageUrls: string[];
  startDate: Date;
  endDate?: Date;
  isOngoing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certification {
  id: string;
  userId: string;
  name?: string; // Made optional to support partial entries
  issuer?: string; // Made optional to support partial entries
  issueDate?: Date; // Made optional to support partial entries
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  skills?: string[]; // Made optional for consistency
  // Removed badgeUrl and isVerified as they don't exist in database schema
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string; // Required field as per Prisma schema
  description: string; // Required field as per Prisma schema
  category?: AchievementCategory;
  date: Date;
  imageUrl?: string;
  issuer?: string; // Enhanced
  impact?: string; // Enhanced
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileView {
  id: string;
  viewerId: string;
  profileId: string;
  viewedAt: Date;
  viewType: ViewType;
  ipAddress?: string;
  userAgent?: string;
  country?: string; // Enhanced: for global analytics
  source?: string; // Enhanced: referrer tracking
  timeSpent?: number; // Enhanced: engagement tracking
}

// ==========================================
// ENUM TYPES
// ==========================================

export enum UserProfession {
  // Medical & Healthcare
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  DENTIST = 'DENTIST',
  THERAPIST = 'THERAPIST',
  MEDICAL_TECHNICIAN = 'MEDICAL_TECHNICIAN',
  HEALTHCARE_ADMIN = 'HEALTHCARE_ADMIN',

  // Education
  TEACHER = 'TEACHER',
  PROFESSOR = 'PROFESSOR',
  PRINCIPAL = 'PRINCIPAL',
  STUDENT = 'STUDENT',
  RESEARCHER = 'RESEARCHER',
  ACADEMIC_ADMIN = 'ACADEMIC_ADMIN',
  TUTOR = 'TUTOR',

  // Technology & Engineering
  SOFTWARE_ENGINEER = 'SOFTWARE_ENGINEER',
  DATA_SCIENTIST = 'DATA_SCIENTIST',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  WEB_DEVELOPER = 'WEB_DEVELOPER',
  MOBILE_DEVELOPER = 'MOBILE_DEVELOPER',
  DEVOPS_ENGINEER = 'DEVOPS_ENGINEER',
  CYBERSECURITY_EXPERT = 'CYBERSECURITY_EXPERT',
  NETWORK_ENGINEER = 'NETWORK_ENGINEER',

  // Business & Finance
  BUSINESS_ANALYST = 'BUSINESS_ANALYST',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  FINANCIAL_ADVISOR = 'FINANCIAL_ADVISOR',
  MARKETING_SPECIALIST = 'MARKETING_SPECIALIST',
  SALES_REPRESENTATIVE = 'SALES_REPRESENTATIVE',
  HR_SPECIALIST = 'HR_SPECIALIST',
  ENTREPRENEUR = 'ENTREPRENEUR',

  // Legal & Government
  LAWYER = 'LAWYER',
  JUDGE = 'JUDGE',
  PARALEGAL = 'PARALEGAL',
  GOVERNMENT_OFFICER = 'GOVERNMENT_OFFICER',
  POLICY_ANALYST = 'POLICY_ANALYST',

  // Arts & Media
  GRAPHIC_DESIGNER = 'GRAPHIC_DESIGNER',
  CONTENT_WRITER = 'CONTENT_WRITER',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  VIDEO_EDITOR = 'VIDEO_EDITOR',
  ARTIST = 'ARTIST',
  MUSICIAN = 'MUSICIAN',

  // Trades & Services
  ELECTRICIAN = 'ELECTRICIAN',
  PLUMBER = 'PLUMBER',
  CARPENTER = 'CARPENTER',
  MECHANIC = 'MECHANIC',
  CHEF = 'CHEF',
  FARMER = 'FARMER',
  CONSTRUCTION_WORKER = 'CONSTRUCTION_WORKER',

  // Other Professions
  CONSULTANT = 'CONSULTANT',
  FREELANCER = 'FREELANCER',
  RETIRED = 'RETIRED',
  UNEMPLOYED = 'UNEMPLOYED',
  OTHER = 'OTHER'
}

export enum WorkStatus {
  ACTIVELY_SEEKING = 'ACTIVELY_SEEKING',
  OPEN_TO_OPPORTUNITIES = 'OPEN_TO_OPPORTUNITIES',
  NOT_LOOKING = 'NOT_LOOKING',
  EMPLOYED_HAPPY = 'EMPLOYED_HAPPY'
}

export enum SalaryPeriod {
  ANNUAL = 'ANNUAL',
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
  PROJECT = 'PROJECT'
}

export enum CompanySize {
  STARTUP = 'STARTUP', // 1-10 employees
  SMALL = 'SMALL', // 11-50 employees  
  MEDIUM = 'MEDIUM', // 51-200 employees
  LARGE = 'LARGE', // 201-1000 employees
  ENTERPRISE = 'ENTERPRISE' // 1000+ employees
}

export enum CompanyStage {
  IDEA = 'IDEA',
  SEED = 'SEED',
  SERIES_A = 'SERIES_A',
  SERIES_B = 'SERIES_B',
  SERIES_C = 'SERIES_C',
  SERIES_D_PLUS = 'SERIES_D_PLUS',
  IPO = 'IPO',
  PUBLIC = 'PUBLIC',
  ESTABLISHED = 'ESTABLISHED'
}

export enum ContactMethod {
  EMAIL = 'EMAIL',
  LINKEDIN = 'LINKEDIN',
  PHONE = 'PHONE',
  PLATFORM_MESSAGE = 'PLATFORM_MESSAGE'
}

export enum WorkType {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  ONSITE = 'ONSITE',
  FLEXIBLE = 'FLEXIBLE'
}

export enum InstitutionType {
  UNIVERSITY = 'UNIVERSITY',
  COLLEGE = 'COLLEGE',
  COMMUNITY_COLLEGE = 'COMMUNITY_COLLEGE',
  TRADE_SCHOOL = 'TRADE_SCHOOL',
  ONLINE_UNIVERSITY = 'ONLINE_UNIVERSITY',
  BOOTCAMP = 'BOOTCAMP',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  MIDDLE_SCHOOL = 'MIDDLE_SCHOOL',
  ELEMENTARY_SCHOOL = 'ELEMENTARY_SCHOOL'
}

export enum ProjectCategory {
  WEB_APPLICATION = 'WEB_APPLICATION',
  MOBILE_APPLICATION = 'MOBILE_APPLICATION',
  DESKTOP_APPLICATION = 'DESKTOP_APPLICATION',
  AI_MACHINE_LEARNING = 'AI_MACHINE_LEARNING',
  DATA_SCIENCE = 'DATA_SCIENCE',
  BLOCKCHAIN = 'BLOCKCHAIN',
  GAME_DEVELOPMENT = 'GAME_DEVELOPMENT',
  DESIGN = 'DESIGN',
  RESEARCH = 'RESEARCH',
  OPEN_SOURCE = 'OPEN_SOURCE',
  PERSONAL = 'PERSONAL',
  CLIENT_WORK = 'CLIENT_WORK',
  STARTUP = 'STARTUP',
  OTHER = 'OTHER'
}

export enum AchievementCategory {
  ACADEMIC = 'ACADEMIC',
  PROFESSIONAL = 'PROFESSIONAL',
  PERSONAL = 'PERSONAL',
  VOLUNTEER = 'VOLUNTEER',
  LEADERSHIP = 'LEADERSHIP',
  TECHNICAL = 'TECHNICAL',
  CREATIVE = 'CREATIVE',
  ATHLETIC = 'ATHLETIC',
  COMMUNITY = 'COMMUNITY'
}

export enum ViewType {
  PROFILE = 'PROFILE',
  RESUME = 'RESUME',
  SECTION = 'SECTION',
  EMBED = 'EMBED'
}

export enum ProfileStrength {
  WEAK = 'WEAK',
  FAIR = 'FAIR',
  GOOD = 'GOOD',
  STRONG = 'STRONG',
  EXCELLENT = 'EXCELLENT'
}

// ==========================================
// PRIVACY & SETTINGS TYPES
// ==========================================

export interface SectionPrivacySettings {
  about: PrivacyLevel;
  workExperience: PrivacyLevel;
  education: PrivacyLevel;
  projects: PrivacyLevel;
  skills: PrivacyLevel;
  certifications: PrivacyLevel;
  achievements: PrivacyLevel;
  contact: PrivacyLevel;
  analytics: PrivacyLevel;
  openForWork: PrivacyLevel;
}

export enum PrivacyLevel {
  PUBLIC = 'PUBLIC', // Visible to everyone
  LOGGED_IN = 'LOGGED_IN', // Visible to logged-in users
  CONNECTIONS = 'CONNECTIONS', // Visible to connections only
  PRIVATE = 'PRIVATE' // Visible only to profile owner
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ProfileResponse {
  profile: UnifiedProfile;
  canEdit: boolean;
  viewerRelation?: ViewerRelation;
  suggestions?: ProfileSuggestion[];
}

export interface ViewerRelation {
  isOwner: boolean;
  isConnected: boolean;
  hasRequested: boolean;
  canMessage: boolean;
  canViewContact: boolean;
}

export interface ProfileSuggestion {
  type: SuggestionType;
  title: string;
  description: string;
  action?: string;
  priority: SuggestionPriority;
}

export enum SuggestionType {
  COMPLETE_SECTION = 'COMPLETE_SECTION',
  ADD_SKILLS = 'ADD_SKILLS',
  UPDATE_PHOTO = 'UPDATE_PHOTO',
  IMPROVE_SUMMARY = 'IMPROVE_SUMMARY',
  ADD_PROJECTS = 'ADD_PROJECTS',
  VERIFY_CREDENTIALS = 'VERIFY_CREDENTIALS',
  OPTIMIZE_KEYWORDS = 'OPTIMIZE_KEYWORDS',
  UPDATE_WORK_STATUS = 'UPDATE_WORK_STATUS'
}

export enum SuggestionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// ==========================================
// FORM & VALIDATION TYPES
// ==========================================

export interface ProfileEditMode {
  section: ProfileSection;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  lastSaved?: Date;
}

export enum ProfileSection {
  HEADER = 'HEADER',
  ABOUT = 'ABOUT',
  WORK_EXPERIENCE = 'WORK_EXPERIENCE',
  EDUCATION = 'EDUCATION',
  PROJECTS = 'PROJECTS',
  SKILLS = 'SKILLS',
  CERTIFICATIONS = 'CERTIFICATIONS',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  OPEN_FOR_WORK = 'OPEN_FOR_WORK',
  ANALYTICS = 'ANALYTICS',
  SHARING = 'SHARING'
}

// ==========================================
// SHARING & ANALYTICS TYPES
// ==========================================

export interface SharingURLs {
  primary: string; // edumatrix.com/profile/username
  short: string; // edumatrix.com/u/username
  professional: string; // edumatrix.com/pro/username-year
  social: string; // edumatrix.com/@username
  custom?: string; // edumatrix.com/profiles/custom-slug
}

export interface GlobalAnalytics {
  totalViews: number;
  uniqueViews: number;
  viewsByCountry: Record<string, number>;
  viewsBySource: Record<string, number>;
  shareCount: number;
  searchAppearances: number;
  jobInquiries: number;
  connectionRequests: number;
  timeSpentAverage: number;
  popularSections: Record<ProfileSection, number>;
}

export interface ShareMetrics {
  platform: SharePlatform;
  count: number;
  lastShared: Date;
  clickThroughRate: number;
}

export enum SharePlatform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  DIRECT_LINK = 'DIRECT_LINK',
  QR_CODE = 'QR_CODE',
  EMBED = 'EMBED'
}

// ==========================================
// COMPONENT PROPS TYPES
// ==========================================

export interface ProfileSectionProps {
  profile: UnifiedProfile;
  isOwner: boolean;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export interface EditFormProps<T> {  data: T;
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

// ==========================================
// UNIVERSAL LIKES SYSTEM TYPES
// ==========================================

export interface UniversalLike {
  id: string;
  likerId: string;
  recipientId: string;
  contentType: ContentType;
  contentId: string;
  schemaName: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  liker?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
    username: string;
  };
}

export interface UserLikeStats {
  userId: string;
  totalLikes: number;
  likesByType: Record<ContentType, number>;
  lastUpdated: Date;
  monthlyStats?: Record<string, {
    total: number;
    [contentType: string]: number;
  }>;
}

export interface LikeNotification {
  id: string;
  recipientId: string;
  likerId: string;
  contentType: ContentType;
  contentId: string;
  isRead: boolean;
  createdAt: Date;
  liker?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
    username: string;
  };
}

export type ContentType = 
  | 'post' 
  | 'story' 
  | 'comment' 
  | 'project' 
  | 'achievement' 
  | 'work_experience' 
  | 'education' 
  | 'certification'
  | 'skill_endorsement'
  | 'profile_view'
  | 'connection'
  | 'profile'
  | 'profile'; // ADDED: Support for profile likes

export interface LikeButtonProps {
  contentType: ContentType;
  contentId: string;
  recipientId: string;
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
  onLikeChange?: (liked: boolean, newCount: number) => void;
  showCount?: boolean;
  disabled?: boolean;
}

export interface LikesAnalyticsData {
  totalLikes: number;
  totalThisMonth: number;
  totalLastMonth: number;
  growthPercentage: number;
  likesByType: Record<ContentType, number>;
  monthlyBreakdown: Array<{
    month: string;
    total: number;
    types: Record<ContentType, number>;
  }>;
  topContent: Array<{
    contentType: ContentType;
    contentId: string;
    likes: number;
    title?: string;
  }>;
  recentLikers: Array<{
    id: string;
    name: string;
    profilePictureUrl?: string;
    username: string;
    likedAt: Date;
    contentType: ContentType;
  }>;
}

// ==========================================
// LIKE SERVICE TYPES
// ==========================================

export interface LikeActionResult {
  success: boolean;
  liked: boolean;
  totalLikes: number;
  error?: string;
}

export interface BulkLikeOperation {
  contentType: ContentType;
  contentId: string;
  recipientId: string;
}

export interface LikeCountUpdate {
  contentType: ContentType;
  contentId: string;
  count: number;
  delta: number; // +1 for like, -1 for unlike
}
