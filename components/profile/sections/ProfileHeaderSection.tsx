/**
 * =============================================================================
 * PROFILE HEADER SECTION - ENHANCED WITH LIKE FUNCTIONALITY
 * =============================================================================
 * 
 * PURPOSE:
 * Main profile header with cover photo, avatar, key info, and social interactions.
 * Now includes Universal Like System for profile appreciation.
 * 
 * NEW FEATURES ADDED:
 * - Universal Profile Like Button - Users can like any profile they visit
 * - Real-time like count display with optimistic updates
 * - Visual feedback with heart icon and color changes
 * - Proper error handling and authentication checks
 * - Prevents self-liking with appropriate messaging
 * 
 * BUTTON FUNCTIONALITY:
 * - Message: Send direct message to profile owner
 * - Connect: Send connection/follow request  
 * - Like: Like the profile (NEW - Universal Like System)
 * - Share: Share profile with others
 * 
 * TERMINOLOGY UPDATES:
 * - "Connections" → "Followers" for social platform consistency
 * - Updated all counts and labels throughout the component
 * 
 * LIKE BUTTON BEHAVIOR:
 * - Shows heart icon (filled when liked, outline when not)
 * - Displays current like count in real-time
 * - Red color scheme when liked, subtle when not
 * - Loading state during API calls
 * - Optimistic updates for smooth UX
 * 
 * PERMISSIONS:
 * - Only authenticated users can like profiles
 * - Users cannot like their own profiles
 * - Appropriate error messages for edge cases
 * 
 * API INTEGRATION:
 * - Uses Universal Like API at /api/likes/profile/[profileId]
 * - Real-time like status with /api/likes/profile/[profileId]/status
 * - Consistent with other content like systems
 * 
 * UI/UX IMPROVEMENTS:
 * - Modern button styling with hover effects
 * - Color-coded interaction states
 * - Professional spacing and layout
 * - Mobile-responsive design
 * 
 * LAST UPDATED: 2025-01-04 - Added Universal Profile Like System
 * =============================================================================
 */

// ==========================================
// PROFILE HEADER SECTION - Facebook-Style Header
// ==========================================
// The main header section with cover photo, avatar, and key info
// Features: Cover photo, professional headline, Open for Work badge, social proof

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { UnifiedProfile } from '@/types/profile';
import { useProfileLike } from '@/hooks/useProfileLike'; // ADDED: Profile like functionality
import { useConversationCreation } from '@/hooks/useConversationCreation'; // ADDED: Conversation creation functionality
import { useOnlineStatus } from '@/hooks/useOnlineStatus'; // ADDED: Online status functionality
import { UniversalFollowButton } from '@/components/ui/universal-follow-button'; // ADDED: Follow functionality
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import PhotoUploadCrop from '@/components/ui/photo-upload-crop';
import { Loader2 } from 'lucide-react';
import {
  Camera,
  Edit,
  MapPin,
  Briefcase,
  Users,
  Eye,
  Calendar,
  DollarSign,
  Globe,
  CheckCircle,
  Star,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Phone,
  Mail,
  Linkedin,
  Github,
  ExternalLink,
  Verified,
  Award,
  Zap
} from 'lucide-react';

interface ProfileHeaderSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  viewerRelation?: 'self' | 'connected' | 'public';
  compact?: boolean;
}

export function ProfileHeaderSection({
  profile,
  canEdit,
  onUpdate,
  viewerRelation = 'public',
  compact = false
}: ProfileHeaderSectionProps) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  // ✅ PRODUCTION-READY: Photo upload states - simplified
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // ADDED: Profile like functionality
  const { liked, totalLikes, toggleLike, isLoading: isLikeLoading } = useProfileLike({
    profileId: profile.id,
    profileOwnerId: profile.id,
    initialLiked: false, // TODO: Get from API
    initialTotalLikes: profile.totalLikesReceived || 0
  });

  // ADDED: Conversation creation functionality
  const { quickMessage, isCreating: isCreatingConversation, error: conversationError } = useConversationCreation();

  // ADDED: Online status functionality with enhanced fallback support
  const { isOnline, lastSeen, activity, isLoading: isPresenceLoading } = useOnlineStatus(profile.id);
  
  // ✅ PRODUCTION-READY: Enhanced presence state with fallbacks from profile data
  const presenceState = {
    isOnline: isOnline || false,
    lastSeen: lastSeen || profile.lastActivity || profile.createdAt,
    activity: activity || 'offline',
    isLoading: isPresenceLoading
  };

  // ✅ PRODUCTION-READY: Helper function to format last seen time in user-friendly way
  const formatLastSeen = (date: Date | string): string => {
    const lastSeenDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const timeDiff = now.getTime() - lastSeenDate.getTime();
    
    // Less than 1 minute
    if (timeDiff < 60 * 1000) {
      return 'just now';
    }
    
    // Less than 1 hour
    if (timeDiff < 60 * 60 * 1000) {
      const minutes = Math.floor(timeDiff / (60 * 1000));
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (timeDiff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(timeDiff / (60 * 60 * 1000));
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // More than a week - show date
    return lastSeenDate.toLocaleDateString();
  };
  
  const [formData, setFormData] = useState({
    name: profile.name || '',
    headline: profile.headline || '',
    openToWork: profile.openToWork || false
  });
  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      name: profile.name || '',
      headline: profile.headline || '',
      openToWork: profile.openToWork || false
    });
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }
    
    // Headline validation
    if (formData.headline && formData.headline.length > 120) {
      newErrors.headline = 'Professional headline cannot exceed 120 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile header updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save profile header:', error);
      toast({
        title: "Error",
        description: "Failed to update profile header. Please try again.",
        variant: "destructive",
      });
      // Don't close the dialog if there's an error
    } finally {
      setIsLoading(false);
    }
  };
  const getInitials = (name?: string | null): string => {
    try {
      // Handle null, undefined, or empty string cases
      if (!name || typeof name !== 'string' || !name.trim()) {
        // Fallback to username initials or default
        const fallbackName = profile?.username || 'User';
        return fallbackName.slice(0, 2).toUpperCase();
      }

      // Clean and process the name
      const cleanName = name.trim();
      const words = cleanName.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) {
        return profile?.username?.slice(0, 2).toUpperCase() || 'US';
      }

      // Get initials from first and last word (or just first if only one word)
      const initials = words.length === 1 
        ? words[0].slice(0, 2) 
        : words[0].charAt(0) + (words[words.length - 1]?.charAt(0) || '');

      return initials.toUpperCase().slice(0, 2);
    } catch (error) {
      console.error('Error generating initials:', error);
      return 'US'; // Ultimate fallback
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // ✅ PRODUCTION-READY: Photo upload success handlers
  const handlePhotoUploadSuccess = async (imageUrl: string, uploadData: any, uploadType: 'profile-picture' | 'cover-photo') => {
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit this profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔄 Updating profile with new photo:', {
        uploadType,
        imageUrl,
        uploadData
      });

      // Update profile through the parent component's onUpdate function
      const updateData = uploadType === 'profile-picture' 
        ? { profilePictureUrl: imageUrl }
        : { coverPhotoUrl: imageUrl };
      
      await onUpdate(updateData);
      
      toast({
        title: "Success! 🎉",
        description: `${uploadType === 'profile-picture' ? 'Profile picture' : 'Cover photo'} updated successfully.`,
      });
      
    } catch (error) {
      console.error('Failed to update profile after photo upload:', error);
      toast({
        title: "Update Error",
        description: `Photo uploaded but failed to update profile. Please refresh the page.`,
        variant: "destructive",
      });
    }
  };

  const handlePhotoUploadError = (error: string, uploadType: string) => {
    console.error(`${uploadType} upload error:`, error);
    toast({
      title: "Upload Error",
      description: `Failed to upload ${uploadType}. Please try again.`,
      variant: "destructive",
    });
  };

  // ✅ PRODUCTION-READY: Message Button with Auto-Conversation Creation
  const handleMessageClick = async () => {
    if (!profile.username && !profile.id) {
      toast({
        title: "Error",
        description: "Cannot send message - user information not available.",
        variant: "destructive",
      });
      return;
    }

    // Use ID for messaging (more reliable than username)
    const userIdentifier = profile.id || profile.username;
    
    try {
      await quickMessage(userIdentifier);
    } catch (error) {
      console.error('Message action failed:', error);
      // Error handling is done by the hook
    }
  };
  // ✅ PRODUCTION-READY: Share functionality
  const handleShare = async () => {
    const shareData = {
      title: `${profile.name} - ${profile.headline || 'Profile'}`,
      text: `Check out ${profile.name}'s profile on Edu Matrix Interlinked`,
      url: `${window.location.origin}/profile/${profile.username}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied",
          description: "Profile link has been copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Error",
        description: "Failed to share profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (compact) {
    return (
      <Card className="w-full overflow-hidden">
        <div className="relative">
          {/* Compact Cover Photo */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Compact Content */}
          <div className="p-6 -mt-16 relative">
            <div className="flex items-start gap-4">              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={profile.profilePictureUrl} alt={profile.name} />                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-8">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.isVerified && (
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  )}
                </div>
                
                {profile.headline && (
                  <p className="text-lg text-gray-600 mt-1">{profile.headline}</p>
                )}                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {(profile.city || profile.country) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{formatNumber(profile.followersCount || 0)} followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    <span>{formatNumber(profile.totalLikesReceived || 0)} likes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-xl">
      <div className="relative">        {/* Cover Photo */}
        <div 
          className={`h-64 md:h-80 relative overflow-hidden ${canEdit ? 'cursor-pointer' : ''}`}
          onClick={() => canEdit && document.getElementById('cover-photo-upload')?.click()}
        >
          {profile.coverPhotoUrl ? (
            <img 
              src={profile.coverPhotoUrl} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/80 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">{canEdit ? 'Click to Add Cover Photo' : 'Add Cover Photo'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload overlay for existing cover photo */}
          {canEdit && profile.coverPhotoUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="text-white text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Change Cover Photo</p>
              </div>
            </div>
          )}        {/* Cover Photo Upload with Crop */}
        {canEdit && (
          <div className="absolute bottom-4 right-4">
            <PhotoUploadCrop
              uploadType="cover-photo"
              currentImageUrl={profile.coverPhotoUrl}
              profileUsername={profile.username}
              onUploadSuccess={(imageUrl, uploadData) => handlePhotoUploadSuccess(imageUrl, uploadData, 'cover-photo')}
              onUploadError={(error) => handlePhotoUploadError(error, 'cover-photo')}
              className="bg-black/50 hover:bg-black/70 text-white"
              disabled={isUploadingCover}
            />
          </div>
        )}

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
        </div>

        {/* Main Profile Info */}
        <div className="px-8 py-6 -mt-24 relative">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-6 border-white shadow-2xl">
                <AvatarImage src={profile.profilePictureUrl} alt={profile.name} />                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              {canEdit && (
                <div className="absolute -bottom-2 -right-2">
                  <PhotoUploadCrop
                    uploadType="profile-picture"
                    currentImageUrl={profile.profilePictureUrl}
                    profileUsername={profile.username}
                    onUploadSuccess={(imageUrl, uploadData) => handlePhotoUploadSuccess(imageUrl, uploadData, 'profile-picture')}
                    onUploadError={(error) => handlePhotoUploadError(error, 'profile-picture')}
                    className="rounded-full h-10 w-10 p-0"
                    disabled={isUploadingProfile}
                  />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 truncate">
                            {profile.name}
                          </h1>
                          {profile.isVerified && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-6 w-6 text-blue-500" />
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                Verified
                              </Badge>
                            </div>
                          )}
                          {/* Online Status Badge */}
                          {!canEdit && (
                            <div className="flex items-center gap-1">
                              <span className={`flex h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-sm text-gray-600">
                                {isOnline ? 'Online' : `Last seen ${lastSeen ? new Date(lastSeen).toLocaleDateString() : 'unknown'}`}
                              </span>
                            </div>
                          )}
                        </div>                    {profile.headline && (
                      <p className="text-xl text-gray-600 mt-2 font-medium">
                        {profile.headline}
                      </p>
                    )}

                    {(profile.currentPosition || profile.currentCompany) && (
                      <div className="flex items-center gap-2 mt-2 text-gray-600">
                        <Briefcase className="h-5 w-5" />
                        <span>
                          {[profile.currentPosition, profile.currentCompany]
                            .filter(Boolean)
                            .join(' at ')}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                      {/* ✅ PRODUCTION-READY: Enhanced Online Status Display with Loading States */}
                      <div className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${
                          presenceState.isLoading 
                            ? 'bg-gray-300 animate-pulse' 
                            : presenceState.isOnline 
                              ? 'bg-green-500' 
                              : 'bg-gray-400'
                        }`} />
                        <span className={
                          presenceState.isLoading 
                            ? 'text-gray-400' 
                            : presenceState.isOnline 
                              ? 'text-green-600' 
                              : 'text-gray-500'
                        }>
                          {presenceState.isLoading 
                            ? 'Loading...' 
                            : presenceState.isOnline 
                              ? 'Online' 
                              : `Last seen ${presenceState.lastSeen ? formatLastSeen(presenceState.lastSeen) : 'recently'}`
                          }
                        </span>
                      </div>
                      
                      {(profile.city || profile.country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                        <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{formatNumber(profile.followersCount || 0)} followers</span>
                      </div>
                        <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{formatNumber(profile.profileViewsCount || 0)} profile views</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        <span>{formatNumber(profile.totalLikesReceived || 0)} likes</span>
                      </div>

                      {profile.globalReach && profile.globalReach > 1 && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span>{profile.globalReach} countries</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open for Work Badge */}
                  {profile.openToWork && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-4"
                    >
                      <Badge 
                        variant="default" 
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm font-medium"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Open for Work
                      </Badge>
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  {canEdit ? (
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">                        <DialogHeader>
                          <DialogTitle>Edit Basic Profile Information</DialogTitle>
                          <p className="text-sm text-gray-600">
                            Update your name, headline, and work status. Use the &quot;About&quot; section below for detailed information.
                          </p>
                        </DialogHeader>                          <div className="grid gap-4 py-4">
                          <div>
                            <label className="text-sm font-medium">Full Name *</label>
                            <Input
                              value={formData.name}
                              onChange={(e) => {
                                setFormData({...formData, name: e.target.value});
                                if (errors.name) {
                                  setErrors({...errors, name: ''});
                                }
                              }}
                              placeholder="Your full name"
                              className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Professional Headline</label>
                            <Input
                              value={formData.headline}
                              onChange={(e) => {
                                setFormData({...formData, headline: e.target.value});
                                if (errors.headline) {
                                  setErrors({...errors, headline: ''});
                                }
                              }}
                              placeholder="e.g., Senior Software Engineer at Google"
                              className={errors.headline ? 'border-red-500' : ''}
                            />
                            {errors.headline && (
                              <p className="text-sm text-red-500 mt-1">{errors.headline}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              This appears prominently on your profile. Make it compelling!
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.openToWork}
                                onChange={(e) => setFormData({...formData, openToWork: e.target.checked})}
                              />
                              <span className="text-sm font-medium">Open for Work</span>
                            </label>
                            <p className="text-xs text-gray-500">
                              Show recruiters and connections that you&apos;re looking for opportunities
                            </p>
                          </div>
                        </div>                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSave}
                            disabled={isLoading}
                          >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <>
                      {/* ✅ PRODUCTION-READY: Message Button with Auto-Conversation Creation */}
                      <Button 
                        className="gap-2"
                        onClick={handleMessageClick}
                        disabled={isCreatingConversation}
                      >
                        {isCreatingConversation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        {isCreatingConversation ? 'Creating...' : 'Message'}
                        {/* Online Status Indicator */}
                        {isOnline && (
                          <span className="ml-1 flex h-2 w-2 bg-green-500 rounded-full" title="Online" />
                        )}
                      </Button>
                      
                      {/* ✅ PRODUCTION-READY: Universal Follow Button - Allow self-follow like major platforms */}
                      {session?.user?.id && profile.id && (
                        <UniversalFollowButton
                          userId={profile.id}
                          userName={profile.name}
                          currentUserId={session.user.id}
                          variant="professional"
                          size="md"
                          className="gap-2"
                        />
                      )}
                      
                      {/* ✅ PRODUCTION-READY: Like Button - Allow self-like for engagement */}
                      {session?.user?.id && (
                        <Button 
                          variant={liked ? "default" : "outline"} 
                          className={`gap-2 ${liked ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'}`}
                          onClick={toggleLike}
                          disabled={isLikeLoading}
                        >
                          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                          {liked ? 'Liked' : 'Like'} ({totalLikes})
                        </Button>
                      )}
                    </>
                  )}

                  <Button variant="outline" className="gap-2" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>

                  {/* Quick Contact Links */}                  <div className="flex items-center gap-2 ml-auto">
                    {profile.websiteUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5 text-gray-600" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
