// ==========================================
// ABOUT SECTION - Professional Summary
// ==========================================
// Professional summary, bio, and key information about the user

'use client';

import { useState, useEffect } from 'react';
import { UnifiedProfile } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Edit,
  User,
  MapPin,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  Languages,
  Clock,
  Award,
  Target
} from 'lucide-react';

interface AboutSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
}

export function AboutSection({ profile, canEdit, onUpdate }: AboutSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    professionalSummary: profile.professionalSummary || '',
    languages: profile.languages || [],
    careerGoalsShort: profile.careerGoalsShort || '',
    city: profile.city || '',
    country: profile.country || '',
    currentPosition: profile.currentPosition || '',
    currentCompany: profile.currentCompany || '',    totalExperience: profile.totalExperience || 0,
    phoneNumber: profile.phoneNumber || '',
    academicYear: profile.academicYear || '',
    major: profile.major || ''
  });  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      bio: profile.bio || '',
      professionalSummary: profile.professionalSummary || '',
      languages: profile.languages || [],
      careerGoalsShort: profile.careerGoalsShort || '',
      city: profile.city || '',
      country: profile.country || '',
      currentPosition: profile.currentPosition || '',
      currentCompany: profile.currentCompany || '',
      totalExperience: profile.totalExperience || 0,
      phoneNumber: profile.phoneNumber || '',
      academicYear: profile.academicYear || '',
      major: profile.major || ''
    });
  }, [profile]);  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (formData.totalExperience && (formData.totalExperience < 0 || formData.totalExperience > 50)) {
      newErrors.totalExperience = 'Experience should be between 0 and 50 years';
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

    try {
      setIsLoading(true);
      
      await onUpdate(formData);
      setIsEditing(false);
      setErrors({});
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to validate phone number
  const isValidPhoneNumber = (phone: string) => {
    if (!phone) return true;
    // Basic phone validation - allows various formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };
  // Helper function to validate email
  const isValidEmail = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  // Check if personal section should be shown
  const shouldShowPersonalSection = () => {
    return (profile.languages && profile.languages.length > 0) || 
           profile.academicYear || 
           profile.major || 
           canEdit;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          About
        </CardTitle>
        {canEdit && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">              <DialogHeader>
                <DialogTitle>Edit Detailed About Information</DialogTitle>
                <p className="text-sm text-gray-600">
                  Add comprehensive details about yourself, your work, location, and contact information.
                </p>
              </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b pb-2">
                    Basic Information
                  </h3>
                  <div>
                    <label className="text-sm font-medium">Professional Summary</label>
                    <Textarea
                      value={formData.professionalSummary}
                      onChange={(e) => setFormData({...formData, professionalSummary: e.target.value})}
                      placeholder="Write a compelling professional summary..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Tell us more about yourself..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Career Goals</label>
                    <Textarea
                      value={formData.careerGoalsShort}
                      onChange={(e) => setFormData({...formData, careerGoalsShort: e.target.value})}
                      placeholder="What are your career aspirations?"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Location & Work Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b pb-2">
                    Location & Work
                  </h3>

                {/* Location & Work Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Your city"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      placeholder="Your country"
                    />
                  </div>
                </div>                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Current Position</label>
                      <Input
                        value={formData.currentPosition}
                        onChange={(e) => setFormData({...formData, currentPosition: e.target.value})}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Current Company</label>
                      <Input
                        value={formData.currentCompany}
                        onChange={(e) => setFormData({...formData, currentCompany: e.target.value})}
                        placeholder="e.g., Google"
                      />
                    </div>                    <div>
                      <label className="text-sm font-medium">Years of Experience</label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.totalExperience}
                        onChange={(e) => {
                          setFormData({...formData, totalExperience: parseInt(e.target.value) || 0});
                          if (errors.totalExperience) setErrors({...errors, totalExperience: ''});
                        }}
                        placeholder="e.g., 5"
                        className={errors.totalExperience ? 'border-red-500' : ''}
                      />
                      {errors.totalExperience && (
                        <p className="text-red-500 text-xs mt-1">{errors.totalExperience}</p>
                      )}
                    </div>
                  </div>
                </div>                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b pb-2">
                    Contact Information
                  </h3>
                    <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        setFormData({...formData, phoneNumber: e.target.value});
                        if (errors.phoneNumber) setErrors({...errors, phoneNumber: ''});
                      }}
                      placeholder="+1 (555) 123-4567"
                      className={errors.phoneNumber ? 'border-red-500' : ''}
                    />
                    {errors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>
                    )}
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b pb-2">
                    Personal Information
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">                    <div>
                      <label className="text-sm font-medium">Academic Year</label>
                      <Input
                        value={formData.academicYear}
                        onChange={(e) => {
                          setFormData({...formData, academicYear: e.target.value});
                          if (errors.academicYear) {
                            setErrors({...errors, academicYear: ''});
                          }
                        }}
                        placeholder="e.g., 2024-2025"
                        className={errors.academicYear ? 'border-red-500' : ''}
                      />
                      {errors.academicYear && (
                        <p className="text-red-500 text-xs mt-1">{errors.academicYear}</p>
                      )}
                    </div><div>
                      <label className="text-sm font-medium">Major</label>
                      <Input
                        value={formData.major}
                        onChange={(e) => {
                          setFormData({...formData, major: e.target.value});
                          if (errors.major) {
                            setErrors({...errors, major: ''});
                          }
                        }}
                        placeholder="e.g., Computer Science"
                        className={errors.major ? 'border-red-500' : ''}
                      />
                      {errors.major && (
                        <p className="text-red-500 text-xs mt-1">{errors.major}</p>
                      )}
                    </div>
                  </div>                  <div>
                    <label className="text-sm font-medium">Languages</label>
                    <div className="space-y-2">
                      {/* Display current languages as badges */}
                      {formData.languages && formData.languages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.languages.map((lang, index) => (
                            <Badge 
                              key={`${lang}-${index}`} 
                              variant="secondary" 
                              className="text-xs bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1"
                            >
                              {lang}
                              <button
                                type="button"
                                onClick={() => {
                                  const newLanguages = formData.languages.filter((_, i) => i !== index);
                                  setFormData({ ...formData, languages: newLanguages });
                                }}
                                className="ml-1 text-orange-500 hover:text-orange-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
                                aria-label={`Remove ${lang} language`}
                                title={`Remove ${lang}`}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Input for adding new languages */}
                      <Input
                        placeholder="Type a language and press Enter or comma (e.g., English)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            const value = input.value.trim();
                            if (value && value.length > 0 && !formData.languages.includes(value)) {
                              setFormData({
                                ...formData,
                                languages: [...formData.languages, value]
                              });
                              input.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Add language on blur if there's text
                          const value = e.currentTarget.value.trim();
                          if (value && value.length > 0 && !formData.languages.includes(value)) {
                            setFormData({
                              ...formData,
                              languages: [...formData.languages, value]
                            });
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>                    <p className="text-xs text-gray-500 mt-1">
                      Type a language and press Enter or comma to add it. Click × to remove.
                    </p>
                  </div>
                </div>
              </div>              <div className="flex justify-end gap-2 pt-4 border-t bg-white">
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
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>      <CardContent className="space-y-6">
        {/* Professional Summary - Hero Style */}
        {profile.professionalSummary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Professional Summary
            </h4>
            <p className="text-gray-700 leading-relaxed text-base">
              {profile.professionalSummary}
            </p>
          </div>
        )}

        {/* Bio - Clean and Personal */}
        {profile.bio && (
          <div className="bg-white p-6 rounded-lg border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              About Me
            </h4>
            <p className="text-gray-700 leading-relaxed text-base">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Career Goals - Highlighted */}
        {profile.careerGoalsShort && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-l-4 border-purple-500">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Career Goals
            </h4>
            <p className="text-gray-700 leading-relaxed text-base">
              {profile.careerGoalsShort}
            </p>
          </div>
        )}

        {/* Key Information - Enhanced Layout */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Professional</h4>
              
              {profile.totalExperience && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Experience</div>
                    <div className="text-sm text-gray-600">{profile.totalExperience} years</div>
                  </div>
                </div>
              )}

              {(profile.city || profile.country) && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Location</div>
                    <div className="text-sm text-gray-600">
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {profile.currentPosition && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Current Role</div>
                    <div className="text-sm text-gray-600">
                      {profile.currentPosition}
                      {profile.currentCompany && (
                        <span className="block text-xs text-gray-500">at {profile.currentCompany}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}            </div>            {/* Personal Information - Only show if there's data or user can edit */}
            {shouldShowPersonalSection() && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal</h4>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 px-2 text-xs hover:bg-gray-100"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {profile.languages && profile.languages.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-md">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Languages className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-2">Languages</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {profile.academicYear && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Academic Year</div>
                      <div className="text-sm text-gray-600">{profile.academicYear}</div>
                    </div>
                  </div>
                )}

                {profile.major && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Award className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Major</div>
                      <div className="text-sm text-gray-600">{profile.major}</div>
                    </div>
                  </div>
                )}                {/* Empty state with note when user can edit - temporarily always show */}
                {(!profile.languages?.length && !profile.academicYear && !profile.major) && (
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">No personal information added yet</p>
                      <p className="text-xs text-gray-500 mb-3">Add languages, academic year, and major to complete your profile</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Add Personal Info
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>        {/* Contact Information - Card Style */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Contact Information
          </h3>          <div className="grid md:grid-cols-2 gap-4">
            {profile.email && (
              <a 
                href={`mailto:${profile.email}`}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Email</div>
                  <div className="text-sm text-blue-600 group-hover:text-blue-800">{profile.email}</div>
                </div>
              </a>
            )}            {/* Display phone number if available */}
            {profile.phoneNumber && (
              <a 
                href={`tel:${profile.phoneNumber}`}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Phone</div>
                  <div className="text-sm text-green-600 group-hover:text-green-800">{profile.phoneNumber}</div>
                </div>
              </a>            )}

            {/* Show empty state only if no contact info exists and user can edit */}
            {!profile.email && !profile.phoneNumber && canEdit && (
              <div className="col-span-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No contact information added yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Add Contact Info
                  </Button>                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Empty State */}
        {!profile.professionalSummary && !profile.bio && canEdit && (
          <div className="text-center py-16 px-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Tell Your Story</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Share your professional journey, skills, and aspirations. Help others understand who you are and what drives you.
            </p>
            <Button onClick={() => setIsEditing(true)} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4" />
              Add About Information
            </Button>
          </div>        )}
      </CardContent>
    </Card>
  );
}