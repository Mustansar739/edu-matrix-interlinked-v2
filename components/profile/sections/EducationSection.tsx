// ==========================================
// EDUCATION SECTION - Academic Background
// ==========================================
// Educational background with inline editing capabilities

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, Education } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Edit,
  Plus,
  GraduationCap,
  Calendar,
  School,
  Award,
  BookOpen,
  Trash2,
  ChevronRight,
  Star,
  Target,
  Users
} from 'lucide-react';

interface EducationSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  preview?: boolean;
}

export function EducationSection({ 
  profile, 
  canEdit, 
  onUpdate, 
  preview = false 
}: EducationSectionProps) {
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Education>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const educations = profile.educations || [];
  const displayEducations = preview ? educations.slice(0, 2) : educations;  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Only validate data consistency, not required fields
    // All fields are now optional - users can save partial information
    
    // Only validate if both years are provided and check logical consistency
    if (formData.startYear && formData.endYear && formData.startYear >= formData.endYear) {
      newErrors.endYear = 'End year must be after start year';
    }
    
    // If institution is provided, ensure it's not just whitespace
    if (formData.institution && !formData.institution.trim()) {
      newErrors.institution = 'Institution name cannot be just spaces';
    }
    
    // If degree is provided, ensure it's not just whitespace
    if (formData.degree && !formData.degree.trim()) {
      newErrors.degree = 'Degree cannot be just spaces';
    }
    
    // Validate year ranges if provided
    if (formData.startYear && (formData.startYear < 1900 || formData.startYear > new Date().getFullYear() + 10)) {
      newErrors.startYear = 'Start year must be between 1900 and ' + (new Date().getFullYear() + 10);
    }
    
    if (formData.endYear && (formData.endYear < 1900 || formData.endYear > new Date().getFullYear() + 10)) {
      newErrors.endYear = 'End year must be between 1900 and ' + (new Date().getFullYear() + 10);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleAddEducation = () => {
    setFormData({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startYear: undefined, // Allow empty start year
      endYear: undefined,
      gpa: '',
      grade: '',
      activities: [],
      achievements: []
    });
    setErrors({});
    setIsAddingEducation(true);
  };

  const handleEditEducation = (education: Education) => {
    setFormData(education);
    setErrors({});
    setEditingId(education.id);
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
    
    try {      // Prepare the data for the API
      const educationData = {
        institution: formData.institution?.trim() || '',
        degree: formData.degree?.trim() || '',
        fieldOfStudy: formData.fieldOfStudy?.trim() || '',
        startYear: formData.startYear || undefined,
        endYear: formData.endYear || undefined,
        gpa: formData.gpa?.trim() || '',
        grade: formData.grade?.trim() || '',
        activities: Array.isArray(formData.activities) ? formData.activities : [],
        achievements: Array.isArray(formData.achievements) ? formData.achievements : []
      };

      let response;
      
      if (editingId) {
        // Update existing education using the item endpoint
        response = await fetch(`/api/profile/${profile.username}/education/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(educationData)
        });
      } else {
        // Check for duplicates before creating
        const isDuplicate = educations.some(edu => 
          edu.institution === educationData.institution &&
          edu.degree === educationData.degree &&
          edu.startYear === educationData.startYear &&
          edu.endYear === educationData.endYear
        );
        
        if (isDuplicate) {
          toast({
            title: "Duplicate Entry",
            description: "This education entry already exists.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Create new education using the collection endpoint
        response = await fetch(`/api/profile/${profile.username}/education`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(educationData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save education');
      }      const result = await response.json();
      
      console.log('Education save result:', { 
        action: editingId ? 'UPDATE' : 'CREATE',
        educationId: result.data?.education?.id,
        success: result.success
      });
      
      // Update the profile data with the new/updated education
      const updatedEducations = [...(profile.educations || [])];
      
      if (editingId) {
        // Update existing education in the array
        const index = updatedEducations.findIndex(edu => edu.id === editingId);
        if (index >= 0) {
          updatedEducations[index] = result.data.education;
        }
      } else {
        // Add new education to the array
        updatedEducations.push(result.data.education);
      }
      
      // Update the profile via the onUpdate callback (for UI consistency)
      await onUpdate({ educations: updatedEducations });
      
      toast({
        title: "Success",
        description: editingId ? "Education updated successfully!" : "Education added successfully!",
      });
      
      // Close dialog and reset form
      setIsAddingEducation(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving education:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save education. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async (id: string) => {    const education = educations.find(edu => edu.id === id);
    if (!confirm(`Are you sure you want to delete "${education?.degree || education?.institution || 'this education'}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete education using the item endpoint
      const response = await fetch(`/api/profile/${profile.username}/education/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete education');
      }

      const result = await response.json();
      
      console.log('Education delete result:', { 
        educationId: id,
        success: result.success
      });
      
      // Update the profile data by removing the deleted education
      const updatedEducations = educations.filter(edu => edu.id !== id);
      await onUpdate({ educations: updatedEducations });
      
      toast({
        title: "Success",
        description: "Education deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting education:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete education. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDegreeColor = (degree: string) => {
    const degreeType = degree.toLowerCase();
    if (degreeType.includes('phd') || degreeType.includes('doctorate')) return 'from-purple-500 to-indigo-600';
    if (degreeType.includes('master') || degreeType.includes('mba')) return 'from-blue-500 to-cyan-600';
    if (degreeType.includes('bachelor')) return 'from-green-500 to-teal-600';
    return 'from-gray-500 to-slate-600';
  };
  const formatDuration = (startYear?: number, endYear?: number) => {
    if (!startYear) return 'Dates not specified';
    if (!endYear) return `${startYear} - Present`;
    return `${startYear} - ${endYear}`;
  };

  const getDurationInYears = (startYear?: number, endYear?: number) => {
    if (!startYear) return '';
    const end = endYear || new Date().getFullYear();
    const duration = end - startYear;
    return duration === 1 ? '1 year' : `${duration} years`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
          {educations.length > 0 && (
            <Badge variant="secondary">{educations.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddEducation}
          >
            <Plus className="h-4 w-4" />
            Add Education
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence>
          {displayEducations.map((education, index) => (
            <motion.div
              key={education.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                {/* Institution Logo Placeholder */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getDegreeColor(education.degree || '')} rounded-lg flex items-center justify-center`}>
                    <School className="h-6 w-6 text-white" />
                  </div>
                </div>                {/* Education Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {education.degree || (
                          <span className="text-gray-500 italic">Degree not specified</span>
                        )}
                        {education.fieldOfStudy && (
                          <span className="text-gray-600 font-normal"> in {education.fieldOfStudy}</span>
                        )}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <span className="font-medium">
                          {education.institution || (
                            <span className="text-gray-500 italic">Institution not specified</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {education.startYear ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDuration(education.startYear, education.endYear)}</span>
                            </div>
                            <span>•</span>
                            <span>{getDurationInYears(education.startYear, education.endYear)}</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 italic">
                            <Calendar className="h-4 w-4" />
                            <span>Dates not specified</span>
                          </div>
                        )}
                        
                        {(education.gpa || education.grade) && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>
                                {education.gpa && `GPA: ${education.gpa}`}
                                {education.gpa && education.grade && ' • '}
                                {education.grade && `Grade: ${education.grade}`}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 ml-4">                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEducation(education)}
                          aria-label={`Edit ${education.degree || education.institution || 'education'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(education.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Delete ${education.degree || education.institution || 'education'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Activities */}
                  {education.activities && education.activities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Activities & Societies
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {education.activities.map((activity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements */}
                  {education.achievements && education.achievements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Academic Achievements
                      </h4>
                      <ul className="space-y-1">
                        {education.achievements.map((achievement, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">▪</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Connection Line */}
              {index < displayEducations.length - 1 && (
                <div className="absolute left-8 top-20 w-px h-6 bg-gray-200"></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Preview Mode - Show More Button */}
        {preview && educations.length > 2 && (
          <Button variant="outline" className="w-full gap-2">
            <span>View all {educations.length} education entries</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Empty State */}
        {educations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No education added</p>
            <p className="text-sm mb-4">Showcase your academic background and achievements.</p>
            {canEdit && (
              <Button onClick={handleAddEducation} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Education
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isAddingEducation || editingId !== null}        onOpenChange={(open) => {
          if (!open) {
            setIsAddingEducation(false);
            setEditingId(null);
            setFormData({});
            setErrors({});
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Education' : 'Add Education'}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              All fields are optional. Fill in what you&apos;d like to share about your education.
            </p>
          </DialogHeader>
            <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Institution</label>
              <Input
                value={formData.institution || ''}
                onChange={(e) => {
                  setFormData({...formData, institution: e.target.value});
                  if (errors.institution) setErrors({...errors, institution: ''});
                }}
                placeholder="e.g., Stanford University"
                className={errors.institution ? 'border-red-500' : ''}
              />
              {errors.institution && (
                <p className="text-red-500 text-xs mt-1">{errors.institution}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Degree</label>
                <Select
                  value={formData.degree || ''}
                  onValueChange={(value) => {
                    setFormData({...formData, degree: value});
                    if (errors.degree) setErrors({...errors, degree: ''});
                  }}
                >
                  <SelectTrigger className={errors.degree ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select degree" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High School Diploma">High School Diploma</SelectItem>
                    <SelectItem value="Associate Degree">Associate Degree</SelectItem>
                    <SelectItem value="Bachelor&apos;s Degree">Bachelor&apos;s Degree</SelectItem>
                    <SelectItem value="Master&apos;s Degree">Master&apos;s Degree</SelectItem>
                    <SelectItem value="MBA">MBA</SelectItem>
                    <SelectItem value="PhD">PhD</SelectItem>
                    <SelectItem value="Professional Certificate">Professional Certificate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.degree && (
                  <p className="text-red-500 text-xs mt-1">{errors.degree}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Field of Study</label>
                <Input
                  value={formData.fieldOfStudy || ''}
                  onChange={(e) => setFormData({...formData, fieldOfStudy: e.target.value})}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Year</label>
                <Input
                  type="number"
                  value={formData.startYear || ''}
                  onChange={(e) => {
                    setFormData({...formData, startYear: parseInt(e.target.value) || undefined});
                    if (errors.startYear) setErrors({...errors, startYear: ''});
                  }}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear() + 10}
                  className={errors.startYear ? 'border-red-500' : ''}
                />
                {errors.startYear && (
                  <p className="text-red-500 text-xs mt-1">{errors.startYear}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">End Year (or expected)</label>
                <Input
                  type="number"
                  value={formData.endYear || ''}
                  onChange={(e) => {
                    setFormData({...formData, endYear: parseInt(e.target.value) || undefined});
                    if (errors.endYear) setErrors({...errors, endYear: ''});
                  }}
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear() + 10}
                  className={errors.endYear ? 'border-red-500' : ''}
                />
                {errors.endYear && (
                  <p className="text-red-500 text-xs mt-1">{errors.endYear}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">GPA</label>
                <Input
                  value={formData.gpa || ''}
                  onChange={(e) => setFormData({...formData, gpa: e.target.value})}
                  placeholder="e.g., 3.8/4.0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Grade</label>
                <Input
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  placeholder="e.g., Magna Cum Laude"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Activities & Societies (one per line)</label>
              <Textarea
                value={formData.activities?.join('\n') || ''}
                onChange={(e) => setFormData({...formData, activities: e.target.value.split('\n').filter(Boolean)})}
                placeholder="Student Government&#10;Computer Science Club&#10;Debate Team"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Academic Achievements (one per line)</label>
              <Textarea
                value={formData.achievements?.join('\n') || ''}
                onChange={(e) => setFormData({...formData, achievements: e.target.value.split('\n').filter(Boolean)})}
                placeholder="Dean's List - Fall 2022&#10;Outstanding Senior Award&#10;Valedictorian"
                rows={3}
              />
            </div>
          </div>          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingEducation(false);
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
                editingId ? 'Update Education' : 'Add Education'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}