// ==========================================
// SKILLS SECTION - Technical & Soft Skills
// ==========================================
// Interactive skills showcase with proficiency levels and categories

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Edit,
  Plus,
  Zap,
  Code,
  Brain,
  Users,
  Palette,
  Settings,
  TrendingUp,
  Star,
  Award,
  Target,
  Trash2
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: number; // 1-100
  yearsOfExperience?: number;
  isEndorsed?: boolean;
  endorsementCount?: number;
}

type SkillCategory = 'technical' | 'programming' | 'frameworks' | 'tools' | 'soft' | 'languages' | 'design' | 'other';

interface SkillsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
}

export function SkillsSection({ profile, canEdit, onUpdate }: SkillsSectionProps) {
  // Transform profile.keySkills to our enhanced skill format
  const [skills, setSkills] = useState<Skill[]>(() => {
    return (profile.keySkills || []).map((skill, index) => ({
      id: `skill-${index}`,
      name: skill,
      category: 'technical' as SkillCategory,
      proficiency: 80, // Default proficiency
      yearsOfExperience: 2,
      isEndorsed: false,
      endorsementCount: 0
    }));
  });
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Skill>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const skillCategories: Record<SkillCategory, { label: string; icon: React.ReactNode; color: string }> = {
    technical: { label: 'Technical Skills', icon: <Code className="h-4 w-4" />, color: 'bg-blue-500' },
    programming: { label: 'Programming', icon: <Code className="h-4 w-4" />, color: 'bg-green-500' },
    frameworks: { label: 'Frameworks', icon: <Settings className="h-4 w-4" />, color: 'bg-purple-500' },
    tools: { label: 'Tools & Software', icon: <Settings className="h-4 w-4" />, color: 'bg-orange-500' },
    soft: { label: 'Soft Skills', icon: <Users className="h-4 w-4" />, color: 'bg-pink-500' },
    languages: { label: 'Languages', icon: <Brain className="h-4 w-4" />, color: 'bg-cyan-500' },
    design: { label: 'Design', icon: <Palette className="h-4 w-4" />, color: 'bg-red-500' },
    other: { label: 'Other', icon: <Star className="h-4 w-4" />, color: 'bg-gray-500' }
  };

  const getSkillsByCategory = (category: SkillCategory) => {
    return skills.filter(skill => skill.category === category);
  };

  const getProficiencyLabel = (proficiency: number) => {
    if (proficiency >= 90) return 'Expert';
    if (proficiency >= 75) return 'Advanced';
    if (proficiency >= 50) return 'Intermediate';
    if (proficiency >= 25) return 'Beginner';
    return 'Learning';
  };

  const getProficiencyColor = (proficiency: number) => {
    if (proficiency >= 90) return 'text-green-600';
    if (proficiency >= 75) return 'text-blue-600';
    if (proficiency >= 50) return 'text-yellow-600';
    if (proficiency >= 25) return 'text-orange-600';
    return 'text-gray-600';
  };
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Skill name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Skill name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Skill name must be less than 50 characters';
    }

    // Check for duplicate skills (case-insensitive)
    const trimmedName = formData.name?.trim().toLowerCase();
    const isDuplicate = skills.some(skill => 
      skill.name.toLowerCase() === trimmedName && skill.id !== editingId
    );
    if (isDuplicate) {
      newErrors.name = 'This skill already exists';
    }

    // Proficiency validation
    if (formData.proficiency === undefined || formData.proficiency < 1 || formData.proficiency > 100) {
      newErrors.proficiency = 'Proficiency must be between 1 and 100';
    }

    // Years of experience validation
    if (formData.yearsOfExperience !== undefined && (formData.yearsOfExperience < 0 || formData.yearsOfExperience > 50)) {
      newErrors.yearsOfExperience = 'Years of experience must be between 0 and 50';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSkill = () => {    setFormData({
      name: '',
      category: 'technical',
      proficiency: 50,
      yearsOfExperience: 1
    });
    setErrors({});
    setIsAddingSkill(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setFormData(skill);
    setErrors({});
    setEditingId(skill.id);
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
      const newSkill: Skill = {
        ...formData,
        id: editingId || `skill-${Date.now()}`
      } as Skill;

      const updatedSkills = editingId 
        ? skills.map(skill => skill.id === editingId ? newSkill : skill)
        : [...skills, newSkill];

      setSkills(updatedSkills);
      
      // Update profile with skill names for backward compatibility
      await onUpdate({ 
        keySkills: updatedSkills.map(skill => skill.name)
      });

      toast({
        title: "Success",
        description: `Skill ${editingId ? 'updated' : 'added'} successfully.`,
      });

      setIsAddingSkill(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving skill:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingId ? 'update' : 'add'} skill. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const skill = skills.find(s => s.id === id);
    if (!confirm(`Are you sure you want to delete "${skill?.name || 'this skill'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const updatedSkills = skills.filter(skill => skill.id !== id);
      setSkills(updatedSkills);
      await onUpdate({ 
        keySkills: updatedSkills.map(skill => skill.name)
      });
      toast({
        title: "Success",
        description: "Skill deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast({
        title: "Error",
        description: "Failed to delete skill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAddingSkill(false);
    setEditingId(null);
    setFormData({});
    setErrors({});
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Skills & Expertise
          {skills.length > 0 && (
            <Badge variant="secondary">{skills.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddSkill}
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        )}
      </CardHeader>      <CardContent className="space-y-6">
        {/* Skills by Category */}
        {Object.entries(skillCategories).map(([categoryKey, { label, color, icon }]) => {
          const categorySkills = getSkillsByCategory(categoryKey as SkillCategory);
          
          if (categorySkills.length === 0) return null;
          
          return (
            <motion.div
              key={categoryKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                {icon}
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                <Badge variant="outline">{categorySkills.length}</Badge>
              </div>

              {/* Skills Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {categorySkills.map((skill, index) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group"
                    >
                      <div className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 truncate pr-2">{skill.name}</h4>
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditSkill(skill)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                onClick={() => handleDelete(skill.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Proficiency Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Proficiency</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">{skill.proficiency}%</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getProficiencyColor(skill.proficiency)}`}
                              >
                                {getProficiencyLabel(skill.proficiency)}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={skill.proficiency} className="h-1.5" />
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center justify-between mt-3 text-xs">
                          {skill.yearsOfExperience && (
                            <Badge variant="secondary" className="text-xs">
                              {skill.yearsOfExperience}y exp
                            </Badge>
                          )}
                          {skill.isEndorsed && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-gray-500">{skill.endorsementCount || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {/* Skills Summary */}
        {skills.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Skills Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {skills.filter(s => s.proficiency >= 90).length}
                </div>
                <div className="text-gray-600">Expert Level</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {skills.filter(s => s.proficiency >= 75).length}
                </div>
                <div className="text-gray-600">Advanced+</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {skills.reduce((sum, s) => sum + (s.yearsOfExperience || 0), 0)}
                </div>
                <div className="text-gray-600">Total Years</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(skillCategories).filter(cat => 
                    getSkillsByCategory(cat as SkillCategory).length > 0
                  ).length}
                </div>
                <div className="text-gray-600">Categories</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {skills.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Zap className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No skills added yet</h3>
            <p className="text-sm mb-6">Showcase your technical and soft skills to stand out.</p>
            {canEdit && (
              <Button onClick={handleAddSkill} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Skill
              </Button>
            )}
          </div>
        )}
      </CardContent>{/* Add/Edit Dialog */}
      <Dialog 
        open={isAddingSkill || editingId !== null} 
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            handleCancel();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Skill' : 'Add Skill'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Skill Name *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) {
                    setErrors({...errors, name: ''});
                  }
                }}
                placeholder="e.g., React, Leadership, Python"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>              <Select
                value={formData.category || 'technical'}
                onValueChange={(value) => setFormData({...formData, category: value as SkillCategory})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(skillCategories).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Proficiency Level: {formData.proficiency || 50}% 
                <span className={`ml-2 ${getProficiencyColor(formData.proficiency || 50)}`}>
                  ({getProficiencyLabel(formData.proficiency || 50)})
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={formData.proficiency || 50}
                onChange={(e) => {
                  setFormData({...formData, proficiency: parseInt(e.target.value)});
                  if (errors.proficiency) {
                    setErrors({...errors, proficiency: ''});
                  }
                }}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 ${
                  errors.proficiency ? 'border border-red-500' : ''
                }`}
              />
              {errors.proficiency && (
                <p className="text-sm text-red-500 mt-1">{errors.proficiency}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Years of Experience</label>
              <Input
                type="number"
                min="0"
                max="50"
                value={formData.yearsOfExperience || ''}
                onChange={(e) => {
                  setFormData({...formData, yearsOfExperience: parseInt(e.target.value)});
                  if (errors.yearsOfExperience) {
                    setErrors({...errors, yearsOfExperience: ''});
                  }
                }}
                placeholder="0"
                className={errors.yearsOfExperience ? 'border-red-500' : ''}
              />
              {errors.yearsOfExperience && (
                <p className="text-sm text-red-500 mt-1">{errors.yearsOfExperience}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Update Skill' : 'Add Skill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}