// ==========================================
// OPEN TO WORK SECTION - Job Seeking Status
// ==========================================
// Prominent section displaying job seeking status and preferences

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UnifiedProfile } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Edit,
  Zap,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Target,
  Heart,
  Globe,
  Users,
  Building,
  Sparkles,
  TrendingUp,
  Check
} from 'lucide-react';

interface OpenToWorkSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
}

export function OpenToWorkSection({ profile, canEdit, onUpdate }: OpenToWorkSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    openToWork: profile.openToWork || false,
    preferredWorkType: profile.preferredWorkType || '',
    expectedSalaryMin: profile.expectedSalaryMin || 0,
    expectedSalaryMax: profile.expectedSalaryMax || 0,    salaryCurrency: profile.salaryCurrency || 'USD',
    salaryPeriod: profile.salaryPeriod || 'ANNUAL',
    availableFrom: profile.availableFrom ? new Date(profile.availableFrom).toISOString().split('T')[0] : '',
    noticePeriod: profile.noticePeriod || '',
    preferredRoles: profile.preferredRoles || [],
    preferredCompanySize: profile.preferredCompanySize || '',
    preferredCompanyStage: profile.preferredCompanyStage || '',
    preferredIndustries: profile.preferredIndustries || [],
    openToRelocation: profile.openToRelocation || false,
    preferredLocations: profile.preferredLocations || [],
    workAuthorization: profile.workAuthorization || '',
    careerGoalsShort: profile.careerGoalsShort || '',
    recruiterContact: profile.recruiterContact || false,
    preferredContactMethod: profile.preferredContactMethod || 'EMAIL',
    contactInstructions: profile.contactInstructions || ''  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Salary range validation
    if (formData.expectedSalaryMin > 0 && formData.expectedSalaryMax > 0) {
      if (formData.expectedSalaryMin >= formData.expectedSalaryMax) {
        newErrors.expectedSalaryMax = 'Maximum salary must be greater than minimum salary';
      }
    }
    
    // Salary validation
    if (formData.expectedSalaryMin < 0) {
      newErrors.expectedSalaryMin = 'Salary cannot be negative';
    }
    if (formData.expectedSalaryMax < 0) {
      newErrors.expectedSalaryMax = 'Salary cannot be negative';
    }
    
    // Available from date validation
    if (formData.availableFrom) {
      const availableDate = new Date(formData.availableFrom);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (availableDate < today) {
        newErrors.availableFrom = 'Available date cannot be in the past';
      }
    }
    
    // Career goals validation
    if (formData.careerGoalsShort && formData.careerGoalsShort.length > 500) {
      newErrors.careerGoalsShort = 'Career goals cannot exceed 500 characters';
    }
    
    // Contact instructions validation
    if (formData.contactInstructions && formData.contactInstructions.length > 300) {
      newErrors.contactInstructions = 'Contact instructions cannot exceed 300 characters';
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
      // For now, only update openToWork status through main profile API
      const updateData = {
        openToWork: formData.openToWork
      };
      await onUpdate(updateData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Work preferences updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save work preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update work preferences. Please try again.",
        variant: "destructive",
      });
      // Don't close the dialog if there's an error
    } finally {
      setIsLoading(false);
    }
  };
  const workStatusLabels = {
    'ACTIVELY_LOOKING': { label: 'Actively Looking', color: 'bg-green-500', icon: <Zap className="h-4 w-4" /> },
    'OPEN_TO_OPPORTUNITIES': { label: 'Open to Opportunities', color: 'bg-blue-500', icon: <Target className="h-4 w-4" /> },
    'NOT_LOOKING': { label: 'Not Looking', color: 'bg-gray-500', icon: <Clock className="h-4 w-4" /> }
  };

  const currentStatus = profile.openToWork 
    ? workStatusLabels.ACTIVELY_LOOKING 
    : workStatusLabels.NOT_LOOKING;
  const formatSalary = (min?: number, max?: number, currency = 'USD', period = 'ANNUAL') => {
    if (!min && !max) return 'Negotiable';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const periodLabel = period === 'ANNUAL' ? '/year' : period === 'MONTHLY' ? '/month' : '/hour';
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)} ${periodLabel}`;
    } else if (min) {
      return `${formatter.format(min)}+ ${periodLabel}`;
    } else if (max) {
      return `Up to ${formatter.format(max)} ${periodLabel}`;
    }
    return 'Negotiable';
  };

  if (!profile.openToWork) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${currentStatus.color} text-white`}>
                {currentStatus.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">Open for Work</span>
                  <Badge className={`${currentStatus.color} text-white`}>
                    {currentStatus.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 font-normal">
                  Available for new opportunities
                </p>
              </div>
            </div>
          </CardTitle>
          
          {canEdit && (
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Open to Work Settings</DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Open to Work</label>
                        <p className="text-xs text-gray-500">Let recruiters know you&apos;re available</p>
                      </div>
                      <Switch
                        checked={formData.openToWork}
                        onCheckedChange={(checked) => setFormData({...formData, openToWork: checked})}
                      />
                    </div>
                  </div>

                  {/* Job Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Job Preferences</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Preferred Work Type</label>
                        <Select
                          value={formData.preferredWorkType}
                          onValueChange={(value) => setFormData({...formData, preferredWorkType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select work type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Remote">Remote</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Onsite">On-site</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Work Authorization</label>
                        <Input
                          value={formData.workAuthorization}
                          onChange={(e) => setFormData({...formData, workAuthorization: e.target.value})}
                          placeholder="e.g., US Citizen, H1B, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Preferred Roles (comma-separated)</label>
                      <Input
                        value={formData.preferredRoles.join(', ')}
                        onChange={(e) => setFormData({...formData, preferredRoles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)})}
                        placeholder="Software Engineer, Product Manager, etc."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Preferred Industries (comma-separated)</label>
                      <Input
                        value={formData.preferredIndustries.join(', ')}
                        onChange={(e) => setFormData({...formData, preferredIndustries: e.target.value.split(',').map(i => i.trim()).filter(Boolean)})}
                        placeholder="Technology, Healthcare, Finance, etc."
                      />
                    </div>
                  </div>

                  {/* Salary & Availability */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Salary & Availability</h3>
                    
                    <div className="grid grid-cols-3 gap-4">                      <div>
                        <label className="text-sm font-medium">Min Salary</label>
                        <Input
                          type="number"
                          value={formData.expectedSalaryMin}
                          onChange={(e) => {
                            setFormData({...formData, expectedSalaryMin: parseInt(e.target.value) || 0});
                            if (errors.expectedSalaryMin) {
                              setErrors({...errors, expectedSalaryMin: ''});
                            }
                          }}
                          placeholder="50000"
                          className={errors.expectedSalaryMin ? 'border-red-500' : ''}
                        />
                        {errors.expectedSalaryMin && (
                          <p className="text-sm text-red-500 mt-1">{errors.expectedSalaryMin}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Max Salary</label>
                        <Input
                          type="number"
                          value={formData.expectedSalaryMax}
                          onChange={(e) => {
                            setFormData({...formData, expectedSalaryMax: parseInt(e.target.value) || 0});
                            if (errors.expectedSalaryMax) {
                              setErrors({...errors, expectedSalaryMax: ''});
                            }
                          }}
                          placeholder="100000"
                          className={errors.expectedSalaryMax ? 'border-red-500' : ''}
                        />
                        {errors.expectedSalaryMax && (
                          <p className="text-sm text-red-500 mt-1">{errors.expectedSalaryMax}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Currency</label>
                        <Select
                          value={formData.salaryCurrency}
                          onValueChange={(value) => setFormData({...formData, salaryCurrency: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="CAD">CAD</SelectItem>
                            <SelectItem value="AUD">AUD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">                      <div>
                        <label className="text-sm font-medium">Available From</label>
                        <Input
                          type="date"
                          value={formData.availableFrom}
                          onChange={(e) => {
                            setFormData({...formData, availableFrom: e.target.value});
                            if (errors.availableFrom) {
                              setErrors({...errors, availableFrom: ''});
                            }
                          }}
                          className={errors.availableFrom ? 'border-red-500' : ''}
                        />
                        {errors.availableFrom && (
                          <p className="text-sm text-red-500 mt-1">{errors.availableFrom}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Notice Period</label>
                        <Input
                          value={formData.noticePeriod}
                          onChange={(e) => setFormData({...formData, noticePeriod: e.target.value})}
                          placeholder="e.g., 2 weeks, 1 month"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Career Goals */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Career Goals</h3>                    <div>
                      <label className="text-sm font-medium">Short-term Career Goals</label>
                      <Textarea
                        value={formData.careerGoalsShort}
                        onChange={(e) => {
                          setFormData({...formData, careerGoalsShort: e.target.value});
                          if (errors.careerGoalsShort) {
                            setErrors({...errors, careerGoalsShort: ''});
                          }
                        }}
                        placeholder="Describe your career aspirations..."
                        rows={3}
                        className={errors.careerGoalsShort ? 'border-red-500' : ''}
                      />
                      {errors.careerGoalsShort && (
                        <p className="text-sm text-red-500 mt-1">{errors.careerGoalsShort}</p>
                      )}
                    </div>
                  </div>

                  {/* Recruiter Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recruiter Contact</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Allow Recruiter Contact</label>
                        <p className="text-xs text-gray-500">Let recruiters reach out to you directly</p>
                      </div>
                      <Switch
                        checked={formData.recruiterContact}
                        onCheckedChange={(checked) => setFormData({...formData, recruiterContact: checked})}
                      />
                    </div>

                    {formData.recruiterContact && (
                      <>
                        <div>
                          <label className="text-sm font-medium">Preferred Contact Method</label>
                          <Select
                            value={formData.preferredContactMethod}
                            onValueChange={(value) => setFormData({...formData, preferredContactMethod: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMAIL">Email</SelectItem>
                              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                              <SelectItem value="PHONE">Phone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>                        <div>
                          <label className="text-sm font-medium">Contact Instructions</label>
                          <Textarea
                            value={formData.contactInstructions}
                            onChange={(e) => {
                              setFormData({...formData, contactInstructions: e.target.value});
                              if (errors.contactInstructions) {
                                setErrors({...errors, contactInstructions: ''});
                              }
                            }}
                            placeholder="Any specific instructions for recruiters..."
                            rows={2}
                            className={errors.contactInstructions ? 'border-red-500' : ''}
                          />
                          {errors.contactInstructions && (
                            <p className="text-sm text-red-500 mt-1">{errors.contactInstructions}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>                <div className="flex justify-end gap-2 pt-4 border-t">
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
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile.preferredWorkType && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{profile.preferredWorkType}</span>
              </div>
            )}
            
            {(profile.expectedSalaryMin || profile.expectedSalaryMax) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {formatSalary(profile.expectedSalaryMin, profile.expectedSalaryMax, profile.salaryCurrency, profile.salaryPeriod)}
                </span>
              </div>
            )}

            {profile.availableFrom && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  Available {new Date(profile.availableFrom).toLocaleDateString()}
                </span>
              </div>
            )}

            {profile.noticePeriod && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{profile.noticePeriod} notice</span>
              </div>
            )}
          </div>

          {/* Preferred Roles */}
          {profile.preferredRoles && profile.preferredRoles.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Looking for
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.preferredRoles.map((role) => (
                  <Badge key={role} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Career Goals */}
          {profile.careerGoalsShort && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Career Goals
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {profile.careerGoalsShort}
              </p>
            </div>
          )}

          {/* Contact CTA */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Interested in hiring {profile.name.split(' ')[0]}?</h4>
                <p className="text-sm text-gray-600">
                  {profile.recruiterContact 
                    ? `Contact via ${profile.preferredContactMethod?.toLowerCase() || 'email'}`
                    : 'Connect through the platform'
                  }
                </p>
              </div>
              <Button className="gap-2">
                <Users className="h-4 w-4" />
                Get in Touch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
