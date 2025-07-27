// ==========================================
// ACHIEVEMENTS SECTION - Awards & Recognition
// ==========================================
// Professional achievements, awards, and recognition

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, Achievement, AchievementCategory } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Edit,
  Plus,
  Trophy,
  Star,
  Calendar,
  Award,
  Medal,
  Crown,
  Target,
  Zap,
  Image,
  Trash2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface AchievementsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  preview?: boolean;
}

export function AchievementsSection({ 
  profile, 
  canEdit, 
  onUpdate, 
  preview = false 
}: AchievementsSectionProps) {
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Achievement>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const achievements = profile.achievements || [];
  const displayAchievements = preview ? achievements.slice(0, 3) : achievements;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.title?.trim()) {
      newErrors.title = 'Achievement title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Achievement title must be at least 2 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Achievement title must be less than 100 characters';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Achievement description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.date) {
      newErrors.date = 'Achievement date is required';
    }    // URL validation - removed since Achievement doesn't have URL property

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAchievement = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date(),
      category: AchievementCategory.PROFESSIONAL,
      imageUrl: ''
    });
    setErrors({});
    setIsAddingAchievement(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setFormData(achievement);
    setErrors({});
    setEditingId(achievement.id);
  };  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    if (isLoading) {
      console.log('Save already in progress, ignoring additional save request');
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {// Prepare the data for the API
      const achievementData = {
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || '',
        category: formData.category || 'other',
        date: formData.date ? formData.date.toISOString() : new Date().toISOString(),
        imageUrl: formData.imageUrl?.trim() || ''
      };

      let response;
      
      if (editingId) {
        // Update existing achievement using the item endpoint
        response = await fetch(`/api/profile/${profile.username}/achievements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(achievementData)
        });
      } else {
        // Create new achievement using the collection endpoint
        response = await fetch(`/api/profile/${profile.username}/achievements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(achievementData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save achievement');
      }

      const result = await response.json();
        console.log('Achievement save result:', { 
        action: editingId ? 'UPDATE' : 'CREATE',
        achievementId: result.data?.achievement?.id,
        success: result.success
      });
      
      // Update the profile data with the new/updated achievement
      const updatedAchievements = [...(profile.achievements || [])];
      
      if (editingId) {
        // Update existing achievement in the array
        const index = updatedAchievements.findIndex(ach => ach.id === editingId);
        if (index >= 0) {
          updatedAchievements[index] = result.data.achievement;
        }
      } else {
        // Add new achievement to the array
        updatedAchievements.push(result.data.achievement);
      }
      
      // Update the profile via the onUpdate callback (for UI consistency)
      await onUpdate({ achievements: updatedAchievements });
      
      toast({
        title: "Success",
        description: `Achievement ${editingId ? 'updated' : 'added'} successfully.`,
      });
      
      setIsAddingAchievement(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingId ? 'update' : 'add'} achievement. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    const achievement = achievements.find(a => a.id === id);
    if (!confirm(`Are you sure you want to delete "${achievement?.title || 'this achievement'}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete achievement using the item endpoint
      const response = await fetch(`/api/profile/${profile.username}/achievements/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete achievement');
      }

      const result = await response.json();
      
      console.log('Achievement delete result:', { 
        achievementId: id,
        success: result.success
      });
      
      // Update the profile data by removing the deleted achievement
      const updatedAchievements = achievements.filter(ach => ach.id !== id);
      await onUpdate({ achievements: updatedAchievements });
      
      toast({
        title: "Success",
        description: "Achievement deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete achievement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAddingAchievement(false);
    setEditingId(null);
    setFormData({});
    setErrors({});
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Academic':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'Professional':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'Personal':
        return <Star className="h-5 w-5 text-purple-500" />;
      case 'Competition':
        return <Medal className="h-5 w-5 text-orange-500" />;
      case 'Leadership':
        return <Crown className="h-5 w-5 text-red-500" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Academic':
        return 'from-blue-500 to-cyan-500';
      case 'Professional':
        return 'from-yellow-500 to-orange-500';
      case 'Personal':
        return 'from-purple-500 to-pink-500';
      case 'Competition':
        return 'from-orange-500 to-red-500';
      case 'Leadership':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const achievementDate = new Date(date);
    const diffInMonths = (now.getFullYear() - achievementDate.getFullYear()) * 12 + 
                        (now.getMonth() - achievementDate.getMonth());
    
    if (diffInMonths < 1) return 'This month';
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    
    const years = Math.floor(diffInMonths / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements & Awards
          {achievements.length > 0 && (
            <Badge variant="secondary">{achievements.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddAchievement}
          >
            <Plus className="h-4 w-4" />
            Add Achievement
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence>
          {displayAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                {/* Achievement Image or Icon */}
                <div className="flex-shrink-0">
                  {achievement.imageUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden">
                      <img 
                        src={achievement.imageUrl} 
                        alt={achievement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 bg-gradient-to-br ${getCategoryColor(achievement.category)} rounded-lg flex items-center justify-center`}>
                      {getCategoryIcon(achievement.category)}
                    </div>
                  )}
                </div>

                {/* Achievement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {achievement.title}
                        </h3>
                        {achievement.category && (
                          <Badge variant="outline" className="text-xs">
                            {achievement.category}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(achievement.date)}</span>
                        <span>•</span>
                        <span>{getTimeAgo(achievement.date)}</span>
                      </div>

                      <p className="text-gray-600 leading-relaxed mb-4">
                        {achievement.description}
                      </p>

                      {/* Achievement Highlights */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          <span>Achievement</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-500" />
                          <span>Recognized</span>
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAchievement(achievement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(achievement.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Preview Mode - Show More Button */}
        {preview && achievements.length > 3 && (
          <Button variant="outline" className="w-full gap-2">
            <span>View all {achievements.length} achievements</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Achievement Stats */}
        {achievements.length > 0 && !preview && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              Achievement Summary
            </h4>            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {achievements.filter(a => a.category === AchievementCategory.PROFESSIONAL).length}
                </div>
                <div className="text-gray-600">Professional</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {achievements.filter(a => a.category === AchievementCategory.ACADEMIC).length}
                </div>
                <div className="text-gray-600">Academic</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {achievements.filter(a => a.category === AchievementCategory.LEADERSHIP).length}
                </div>
                <div className="text-gray-600">Competition</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {achievements.filter(a => {
                    const year = new Date(a.date).getFullYear();
                    return year === new Date().getFullYear();
                  }).length}
                </div>
                <div className="text-gray-600">This Year</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {achievements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No achievements added</p>
            <p className="text-sm mb-4">Showcase your awards, recognition, and accomplishments.</p>
            {canEdit && (
              <Button onClick={handleAddAchievement} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Achievement
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isAddingAchievement || editingId !== null}        onOpenChange={(open) => {
          if (!open) {
            setIsAddingAchievement(false);
            setEditingId(null);
            setFormData({});
            setErrors({});
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Achievement' : 'Add Achievement'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">            <div>
              <label className="text-sm font-medium">Achievement Title *</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => {
                  setFormData({...formData, title: e.target.value});
                  if (errors.title) {
                    setErrors({...errors, title: ''});
                  }
                }}
                placeholder="e.g., Employee of the Year, Dean's List"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category || AchievementCategory.PROFESSIONAL}
                onValueChange={(value) => setFormData({...formData, category: value as AchievementCategory})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AchievementCategory.PROFESSIONAL}>Professional</SelectItem>
                  <SelectItem value={AchievementCategory.ACADEMIC}>Academic</SelectItem>
                  <SelectItem value={AchievementCategory.PERSONAL}>Personal</SelectItem>
                  <SelectItem value={AchievementCategory.LEADERSHIP}>Leadership</SelectItem>
                  <SelectItem value={AchievementCategory.VOLUNTEER}>Volunteer</SelectItem>
                  <SelectItem value={AchievementCategory.TECHNICAL}>Technical</SelectItem>
                  <SelectItem value={AchievementCategory.CREATIVE}>Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>            <div>
              <label className="text-sm font-medium">Date Achieved *</label>
              <Input
                type="date"
                value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  setFormData({...formData, date: new Date(e.target.value)});
                  if (errors.date) {
                    setErrors({...errors, date: ''});
                  }
                }}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && (
                <p className="text-sm text-red-500 mt-1">{errors.date}</p>
              )}
            </div>            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => {
                  setFormData({...formData, description: e.target.value});
                  if (errors.description) {
                    setErrors({...errors, description: ''});
                  }
                }}
                placeholder="Describe the achievement and its significance..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>            <div>
              <label className="text-sm font-medium">Image URL (optional)</label>
              <Input
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => {
                  setFormData({...formData, imageUrl: e.target.value});
                  if (errors.imageUrl) {
                    setErrors({...errors, imageUrl: ''});
                  }
                }}
                placeholder="https://example.com/award-image.jpg"
                className={errors.imageUrl ? 'border-red-500' : ''}
              />
              {errors.imageUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.imageUrl}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Add a photo of the award, certificate, or recognition
              </p>
            </div>
          </div>          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingAchievement(false);
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
                editingId ? 'Update Achievement' : 'Add Achievement'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}