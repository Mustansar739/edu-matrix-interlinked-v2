// ==========================================
// WORK EXPERIENCE SECTION - Career History
// ==========================================
// Professional work experience with inline editing capabilities

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, WorkExperience } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Edit,
  Plus,
  Briefcase,
  MapPin,
  Calendar,
  Building,
  Trash2,
  ChevronRight,
  Award,
  TrendingUp,
  Users,
  Target,
  ExternalLink
} from 'lucide-react';

interface WorkExperienceSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  preview?: boolean;
}

export function WorkExperienceSection({ 
  profile, 
  canEdit, 
  onUpdate, 
  preview = false 
}: WorkExperienceSectionProps) {
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WorkExperience>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const experiences = profile.workExperiences || [];
  const displayExperiences = preview ? experiences.slice(0, 2) : experiences;  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Only validate data consistency, not required fields
    // All fields are now optional - users can save partial information
    
    // Only validate if both dates are provided and check logical consistency
    if (formData.startDate && formData.endDate && !formData.isCurrentJob) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    // If position is provided, ensure it's not just whitespace
    if (formData.position && !formData.position.trim()) {
      newErrors.position = 'Job title cannot be just spaces';
    }
    
    // If company is provided, ensure it's not just whitespace
    if (formData.company && !formData.company.trim()) {
      newErrors.company = 'Company name cannot be just spaces';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseSkills = (skillsInput: string): string[] => {
    if (!skillsInput.trim()) return [];
    
    return skillsInput
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0)
      .filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates
  };

  const handleAddExperience = () => {
    setFormData({
      company: '',
      position: '',
      location: '',
      startDate: new Date(),
      endDate: undefined,
      isCurrentJob: false,
      description: '',
      achievements: [],
      skills: []
    });
    setErrors({});
    setIsAddingExperience(true);
  };

  const handleEditExperience = (experience: WorkExperience) => {
    setFormData(experience);
    setErrors({});
    setEditingId(experience.id);
  };  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    if (isLoading) {
      console.log('Save already in progress, ignoring additional save request');
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted issues before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {// Prepare the data for the API
      const workExperienceData = {
        position: formData.position?.trim() || '',
        company: formData.company?.trim() || '',
        location: formData.location?.trim() || '',
        startDate: formData.startDate ? formData.startDate.toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
        isCurrentJob: formData.isCurrentJob || false,
        description: formData.description?.trim() || '',
        skills: Array.isArray(formData.skills) ? formData.skills : [],
        achievements: Array.isArray(formData.achievements) ? formData.achievements : []
      };

      let response;
      
      if (editingId) {
        // Update existing work experience using the item endpoint
        response = await fetch(`/api/profile/${profile.username}/work-experience/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workExperienceData)
        });
      } else {
        // Create new work experience using the collection endpoint
        response = await fetch(`/api/profile/${profile.username}/work-experience`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workExperienceData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save work experience');
      }      const result = await response.json();
      
      console.log('Work experience save result:', { 
        action: editingId ? 'UPDATE' : 'CREATE',
        experienceId: result.data?.workExperience?.id,
        success: result.success
      });
      
      // Update the profile data with the new/updated work experience
      const updatedExperiences = [...(profile.workExperiences || [])];
      
      if (editingId) {
        // Update existing experience in the array
        const index = updatedExperiences.findIndex(exp => exp.id === editingId);
        if (index >= 0) {
          updatedExperiences[index] = result.data.workExperience;
        }
      } else {
        // Add new experience to the array
        updatedExperiences.push(result.data.workExperience);
      }
      
      // Update the profile via the onUpdate callback (for UI consistency)
      await onUpdate({ workExperiences: updatedExperiences });
      
      toast({
        title: "Success",
        description: editingId ? "Work experience updated successfully!" : "Work experience added successfully!",
      });
      
      setIsAddingExperience(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving work experience:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save work experience. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async (id: string) => {    const experience = experiences.find(exp => exp.id === id);
    if (!confirm(`Are you sure you want to delete "${experience?.position || experience?.company || 'this work experience'}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete work experience using the item endpoint
      const response = await fetch(`/api/profile/${profile.username}/work-experience/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete work experience');
      }

      const result = await response.json();
      
      console.log('Work experience delete result:', { 
        experienceId: id,
        success: result.success
      });
      
      // Update the profile data by removing the deleted experience
      const updatedExperiences = experiences.filter(exp => exp.id !== id);
      await onUpdate({ workExperiences: updatedExperiences });
      
      toast({
        title: "Success",
        description: "Work experience deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting work experience:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete work experience. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const calculateDuration = (start: Date | string, end: Date | string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth());
    
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
      } else {
        return `${years}y ${remainingMonths}m`;
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Work Experience
          {experiences.length > 0 && (
            <Badge variant="secondary">{experiences.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddExperience}
          >
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence>
          {displayExperiences.map((experience, index) => (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                {/* Company Logo Placeholder */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                </div>                {/* Experience Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {experience.position || (
                          <span className="text-gray-500 italic">Position not specified</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <span className="font-medium">
                          {experience.company || (
                            <span className="text-gray-500 italic">Company not specified</span>
                          )}
                        </span>
                        {experience.location && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-sm">{experience.location}</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {experience.startDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(experience.startDate)} - {' '}
                            {experience.isCurrentJob ? 'Present' : 
                             experience.endDate ? formatDate(experience.endDate) : 'End date not specified'}
                          </span>
                          {experience.endDate && (
                            <>
                              <span>•</span>
                              <span>
                                {calculateDuration(experience.startDate, experience.endDate || null)}
                              </span>
                            </>
                          )}
                          {experience.isCurrentJob && (
                            <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                              Current
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {!experience.startDate && (
                        <div className="text-sm text-gray-400 mb-3 italic">
                          Dates not specified
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 ml-4">                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExperience(experience)}
                          aria-label={`Edit ${experience.position || experience.company || 'work experience'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(experience.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Delete ${experience.position || experience.company || 'work experience'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {experience.description && (
                    <div className="mb-4">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {experience.description}
                      </p>
                    </div>
                  )}

                  {/* Achievements */}
                  {experience.achievements && experience.achievements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Key Achievements
                      </h4>
                      <ul className="space-y-1">
                        {experience.achievements.map((achievement, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-1">▪</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills */}
                  {experience.skills && experience.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Used</h4>
                      <div className="flex flex-wrap gap-1">
                        {experience.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Connection Line */}
              {index < displayExperiences.length - 1 && (
                <div className="absolute left-8 top-20 w-px h-6 bg-gray-200"></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Preview Mode - Show More Button */}
        {preview && experiences.length > 2 && (
          <Button variant="outline" className="w-full gap-2">
            <span>View all {experiences.length} experiences</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Empty State */}
        {experiences.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No work experience added</p>
            <p className="text-sm mb-4">Showcase your professional journey and achievements.</p>
            {canEdit && (
              <Button onClick={handleAddExperience} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Work Experience
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isAddingExperience || editingId !== null}        onOpenChange={(open) => {
          if (!open) {
            setIsAddingExperience(false);
            setEditingId(null);
            setFormData({});
            setErrors({});
          }
        }}
      >        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Work Experience' : 'Add Work Experience'}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              All fields are optional. Fill in what you&apos;d like to share about this work experience.
            </p>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Job Title</label>
                <Input
                  value={formData.position || ''}
                  onChange={(e) => {
                    setFormData({...formData, position: e.target.value});
                    if (errors.position) setErrors({...errors, position: ''});
                  }}
                  placeholder="e.g., Senior Software Engineer"
                  className={errors.position ? 'border-red-500' : ''}
                />
                {errors.position && (
                  <p className="text-red-500 text-xs mt-1">{errors.position}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={formData.company || ''}
                  onChange={(e) => {
                    setFormData({...formData, company: e.target.value});
                    if (errors.company) setErrors({...errors, company: ''});
                  }}
                  placeholder="e.g., Google"
                  className={errors.company ? 'border-red-500' : ''}
                />
                {errors.company && (
                  <p className="text-red-500 text-xs mt-1">{errors.company}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location || ''}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., San Francisco, CA"
              />
            </div>            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="month"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, startDate: new Date(e.target.value + '-01')});
                    if (errors.startDate) setErrors({...errors, startDate: ''});
                  }}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="month"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, endDate: new Date(e.target.value + '-01')});
                    if (errors.endDate) setErrors({...errors, endDate: ''});
                  }}
                  disabled={formData.isCurrentJob}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>            <div className="flex items-center space-x-2">
              <Checkbox
                id="current-job"
                checked={formData.isCurrentJob || false}
                onCheckedChange={(checked) => {
                  const isCurrentJob = checked as boolean;
                  setFormData({
                    ...formData, 
                    isCurrentJob,
                    endDate: isCurrentJob ? undefined : formData.endDate
                  });
                  if (isCurrentJob && errors.endDate) {
                    setErrors({...errors, endDate: ''});
                  }
                }}
              />
              <label htmlFor="current-job" className="text-sm font-medium">
                I currently work here
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your role and responsibilities..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Key Achievements (one per line)</label>
              <Textarea
                value={formData.achievements?.join('\n') || ''}
                onChange={(e) => setFormData({...formData, achievements: e.target.value.split('\n').filter(Boolean)})}
                placeholder="Led team of 5 developers&#10;Increased system performance by 40%&#10;Launched 3 major features"
                rows={3}
              />
            </div>            <div>
              <label className="text-sm font-medium">Skills Used (comma-separated)</label>
              <div className="space-y-2">
                {/* Display current skills as badges */}
                {formData.skills && formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge 
                        key={`${skill}-${index}`} 
                        variant="secondary" 
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => {
                            const newSkills = formData.skills?.filter((_, i) => i !== index) || [];
                            setFormData({ ...formData, skills: newSkills });
                          }}
                          className="ml-1 text-blue-500 hover:text-blue-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={`Remove ${skill} skill`}
                          title={`Remove ${skill}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Input for adding new skills */}
                <Input
                  placeholder="Type a skill and press Enter or comma (e.g., React, Node.js, TypeScript)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const value = input.value.trim();
                      if (value && value.length > 0 && !(formData.skills || []).includes(value)) {
                        setFormData({
                          ...formData,
                          skills: [...(formData.skills || []), value]
                        });
                        input.value = '';
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Add skill on blur if there's text
                    const value = e.currentTarget.value.trim();
                    if (value && value.length > 0 && !(formData.skills || []).includes(value)) {
                      setFormData({
                        ...formData,
                        skills: [...(formData.skills || []), value]
                      });
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Type a skill and press Enter or comma to add it. Click × to remove. Duplicates are automatically prevented.
              </p>
            </div>
          </div>          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingExperience(false);
                setEditingId(null);
                setFormData({});
                setErrors({});
              }}
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
                editingId ? 'Update Experience' : 'Add Experience'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}