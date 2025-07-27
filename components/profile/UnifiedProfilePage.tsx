// ==========================================
// UNIFIED PROFILE PAGE - Facebook-Style Profile
// ==========================================
// Main component that renders the complete unified profile system
// Features: Facebook-style layout, inline editing, global sharing, professional branding

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, WorkExperience } from '@/types/profile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
// Removed tabs import for single page layout
import { toast } from 'sonner';
import {
  Edit,
  Share2,
  Eye,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Trophy,
  Code,
  Heart,
  MessageCircle,
  Users,
  Globe,
  ChevronRight,
  Star,
  TrendingUp,
  Zap,
  CheckCircle,
  Phone,
  Mail,
  Linkedin,
  Github,
  ExternalLink,
  Download,
  QrCode,
  Copy,
  Settings
} from 'lucide-react';

import { ProfileErrorBoundary } from './ProfileErrorBoundary';

// Section Components
import { ProfileHeaderSection } from './sections/ProfileHeaderSection';
import { AboutSection } from './sections/AboutSection';
import { WorkExperienceSection } from './sections/WorkExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { SkillsSection } from './sections/SkillsSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { AchievementsSection } from './sections/AchievementsSection';
import { OpenToWorkSection } from './sections/OpenToWorkSection';
import { ProfileAnalyticsSection } from './sections/ProfileAnalyticsSection';
import { ContactSection } from './sections/ContactSection';
import { LikesAnalyticsSection } from './sections/LikesAnalyticsSection';

interface UnifiedProfilePageProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  viewerRelation?: 'self' | 'connected' | 'public';
  currentSection?: string;
  embedMode?: boolean;
  previewMode?: boolean;
}

export function UnifiedProfilePage({
  profile,
  canEdit,
  viewerRelation = 'public',
  currentSection,
  embedMode = false,
  previewMode = false
}: UnifiedProfilePageProps) {  const [isEditMode, setIsEditMode] = useState(false);
  const [profileData, setProfileData] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  // Handle section navigation
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle scroll to show/hide quick navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowQuickNav(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);  // Handle profile updates
  const handleProfileUpdate = async (updatedData: Partial<UnifiedProfile>) => {
    // Route different data types to their specific handlers
    if (updatedData.workExperiences) {
      return handleWorkExperienceUpdate(updatedData.workExperiences);
    }
    if (updatedData.educations) {
      return handleEducationUpdate(updatedData.educations);
    }
    if (updatedData.projects) {
      return handleProjectsUpdate(updatedData.projects);
    }
    if (updatedData.certifications) {
      return handleCertificationsUpdate(updatedData.certifications);
    }
    if (updatedData.achievements) {
      return handleAchievementsUpdate(updatedData.achievements);
    }
    if (updatedData.keySkills) {
      return handleSkillsUpdate(updatedData.keySkills);
    }

    // Handle main profile fields (bio, name, etc.)
    setIsLoading(true);
    try {
      console.log('Sending profile update:', updatedData);
      
      // Update profile data using username
      const response = await fetch(`/api/profile/${profile.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Profile update failed:', response.status, errorData);
        throw new Error(`Failed to update profile: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Profile update result:', result);
      
      // Update local state with the updated profile data
      setProfileData({ ...profileData, ...result.profile });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile. Please try again.');
      throw error; // Re-throw to prevent dialog from closing
    } finally {
      setIsLoading(false);
    }
  };  // Handle work experience updates - now only updates local state since components handle API calls
  const handleWorkExperienceUpdate = async (workExperiences: WorkExperience[]) => {
    try {
      console.log('Updating local work experiences state:', workExperiences.length);
      
      // Update local state for immediate UI feedback
      setProfileData({ 
        ...profileData, 
        workExperiences: workExperiences 
      });
      
      // No API call needed - components handle this via dedicated endpoints
      console.log('Work experience local state updated successfully');
      
    } catch (error) {
      console.error('Work experience update error:', error);
      throw error;
    }
  };

  // Handle education updates separately with debouncing  // Handle education updates - now only updates local state since components handle API calls
  const handleEducationUpdate = async (educations: any[]) => {
    try {
      console.log('Updating local education state:', {
        count: educations.length,
        timestamp: new Date().toISOString()
      });
      
      // Update local state for immediate UI feedback
      setProfileData({ ...profileData, educations: educations });
      
      // No API call needed - components handle this via dedicated endpoints
      console.log('Education local state updated successfully');
      
    } catch (error) {
      console.error('Education update error:', error);
      throw error;
    }
  };
  // Handle projects updates - now only updates local state since components handle API calls  
  const handleProjectsUpdate = async (projects: any[]) => {
    try {
      console.log('Updating local projects state:', projects.length);
      
      // Update local state for immediate UI feedback
      setProfileData({ ...profileData, projects: projects });
      
      // No API call needed - components handle this via dedicated endpoints
      console.log('Projects local state updated successfully');
      
    } catch (error) {
      console.error('Projects update error:', error);
      throw error;
    }
  };  // Handle certifications updates - now only updates local state since components handle API calls
  const handleCertificationsUpdate = async (certifications: any[]) => {
    try {
      console.log('Updating local certifications state:', certifications.length);
      
      // Update local state for immediate UI feedback
      setProfileData({ ...profileData, certifications: certifications });
      
      // No API call needed - components handle this via dedicated endpoints
      console.log('Certifications local state updated successfully');
      
    } catch (error) {
      console.error('Certifications update error:', error);
      throw error;
    }
  };  // Handle achievements updates - now only updates local state since components handle API calls
  const handleAchievementsUpdate = async (achievements: any[]) => {
    try {
      console.log('Updating local achievements state:', achievements.length);
      
      // Update local state for immediate UI feedback
      setProfileData({ ...profileData, achievements: achievements });
      
      // No API call needed - components handle this via dedicated endpoints
      console.log('Achievements local state updated successfully');
      
    } catch (error) {
      console.error('Achievements update error:', error);
      throw error;
    }
  };
  // Handle skills updates separately
  const handleSkillsUpdate = async (keySkills: string[]) => {
    setIsLoading(true);
    try {
      console.log('Updating skills:', keySkills);
      
      // First update local state for immediate UI feedback
      setProfileData({ ...profileData, keySkills: keySkills });
      
      // Then persist to backend
      const response = await fetch(`/api/profile/${profile.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keySkills: keySkills })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Skills update failed:', response.status, errorData);
        throw new Error(`Failed to update skills: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Skills update result:', result);
      
      toast.success('Skills updated successfully!');
    } catch (error) {
      console.error('Skills update error:', error);
      toast.error('Failed to update skills. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Share profile functionality
  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/profile/${profile.username}`;
    const shareText = `Check out ${profile.name}'s profile on Edu Matrix Interlinked`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name} - Professional Profile`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Profile link copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied to clipboard!');
    }
  };
  if (embedMode) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 bg-background">
        <ProfileErrorBoundary>
          <ProfileHeaderSection 
            profile={profileData}
            canEdit={false}
            onUpdate={handleProfileUpdate}
            compact={true}
          />
        </ProfileErrorBoundary>
        <div className="mt-6 grid gap-6">
          <ProfileErrorBoundary>
            <AboutSection profile={profileData} canEdit={false} onUpdate={handleProfileUpdate} />
          </ProfileErrorBoundary>
          <ProfileErrorBoundary>
            <WorkExperienceSection profile={profileData} canEdit={false} onUpdate={handleProfileUpdate} />
          </ProfileErrorBoundary>
          <ProfileErrorBoundary>
            <EducationSection profile={profileData} canEdit={false} onUpdate={handleProfileUpdate} />
          </ProfileErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Floating Action Bar */}
      <AnimatePresence>
        {canEdit && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="p-2 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant={isEditMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {isEditMode ? 'Save' : 'Edit'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShareProfile}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollToSection('analytics')}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Analytics
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Profile Header */}
        <ProfileHeaderSection 
          profile={profileData}
          canEdit={canEdit && isEditMode}
          onUpdate={handleProfileUpdate}
          viewerRelation={viewerRelation}
        />{/* Quick Navigation - Floating */}
        <AnimatePresence>
          {showQuickNav && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed right-6 top-1/2 -translate-y-1/2 z-50"
            >              <Card className="p-1 shadow-xl border-0 bg-white/95 backdrop-blur-sm min-w-[140px]">
                <div className="flex flex-col gap-0.5">                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('about')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Eye className="h-3 w-3 mr-2" />
                    About
                  </Button>                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('experience')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Briefcase className="h-3 w-3 mr-2" />
                    Experience
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('education')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <GraduationCap className="h-3 w-3 mr-2" />
                    Education
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('projects')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Code className="h-3 w-3 mr-2" />
                    Projects
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('skills')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Zap className="h-3 w-3 mr-2" />
                    Skills
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('achievements')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Trophy className="h-3 w-3 mr-2" />
                    Achievements
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToSection('contact')}
                    className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Contact
                  </Button>
                  {canEdit && (                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => scrollToSection('analytics')}
                      className="justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md"
                    >
                      <TrendingUp className="h-3 w-3 mr-2" />
                      Analytics
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continuous Scrollable Content - Facebook Style */}
        <div className="space-y-8 pb-20">
          {/* About Section */}
          <section id="about" className="scroll-mt-8">
            <AboutSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate} 
            />
          </section>
          
          {/* Open to Work Banner */}
          {profileData.openToWork && (
            <section className="scroll-mt-8">
              <OpenToWorkSection 
                profile={profileData} 
                canEdit={canEdit && isEditMode} 
                onUpdate={handleProfileUpdate} 
              />
            </section>
          )}

          {/* Experience & Education Side by Side */}
          <section className="scroll-mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div id="experience" className="scroll-mt-8">
                <WorkExperienceSection 
                  profile={profileData} 
                  canEdit={canEdit && isEditMode} 
                  onUpdate={handleProfileUpdate}
                />
              </div>
              <div id="education" className="scroll-mt-8">
                <EducationSection 
                  profile={profileData} 
                  canEdit={canEdit && isEditMode} 
                  onUpdate={handleProfileUpdate}
                />
              </div>
            </div>
          </section>

          {/* Certifications */}
          <section className="scroll-mt-8">
            <CertificationsSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate} 
            />
          </section>

          {/* Projects Section */}
          <section id="projects" className="scroll-mt-8">
            <ProjectsSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate}
            />
          </section>

          {/* Skills Section */}
          <section id="skills" className="scroll-mt-8">
            <SkillsSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate} 
            />
          </section>

          {/* Achievements Section */}
          <section id="achievements" className="scroll-mt-8">
            <AchievementsSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate} 
            />
          </section>

          {/* Contact Section */}
          <section id="contact" className="scroll-mt-8">
            <ContactSection 
              profile={profileData} 
              canEdit={canEdit && isEditMode} 
              onUpdate={handleProfileUpdate} 
            />
          </section>          {/* Analytics Section (only for profile owner) */}
          {canEdit && (
            <section id="analytics" className="scroll-mt-8">
              <ProfileAnalyticsSection 
                profile={profileData} 
                canEdit={canEdit} 
              />
            </section>
          )}

          {/* Likes Analytics Section (only for profile owner) */}
          {canEdit && (
            <section id="likes-analytics" className="scroll-mt-8">
              <LikesAnalyticsSection 
                profile={profileData} 
                canEdit={canEdit} 
              />
            </section>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                <span>Updating profile...</span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
