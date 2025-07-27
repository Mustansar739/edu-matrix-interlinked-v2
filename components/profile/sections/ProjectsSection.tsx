// ==========================================
// PROJECTS SECTION - Portfolio Showcase
// ==========================================
// Project portfolio with visual cards and inline editing

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, Project, ProjectCategory } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Edit,
  Plus,
  Code,
  ExternalLink,
  Github,
  Calendar,
  Star,
  Trash2,
  ChevronRight,
  Image,
  Globe,
  Zap,
  Play,
  Eye,
  Heart,
  Share,
  Tag
} from 'lucide-react';

interface ProjectsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  preview?: boolean;
}

export function ProjectsSection({ 
  profile, 
  canEdit, 
  onUpdate, 
  preview = false 
}: ProjectsSectionProps) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const projects = profile.projects || [];
  const displayProjects = preview ? projects.slice(0, 3) : projects;  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.title?.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Project title must be at least 2 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Project title must be less than 100 characters';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // URL validation
    if (formData.liveUrl && formData.liveUrl.trim()) {
      try {
        new URL(formData.liveUrl);
      } catch {
        newErrors.liveUrl = 'Please enter a valid URL';
      }
    }    if (formData.repositoryUrl && formData.repositoryUrl.trim()) {
      try {
        new URL(formData.repositoryUrl);
      } catch {
        newErrors.repositoryUrl = 'Please enter a valid URL';
      }
    }

    // Date validation
    if (formData.startDate && formData.endDate && !formData.isOngoing) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Technologies validation
    if (formData.technologies && formData.technologies.length > 20) {
      newErrors.technologies = 'Maximum 20 technologies allowed';
    }

    // Image URLs validation
    if (formData.imageUrls && formData.imageUrls.length > 0) {
      const invalidUrls = formData.imageUrls.filter(url => {
        try {
          new URL(url);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidUrls.length > 0) {
        newErrors.imageUrls = 'All image URLs must be valid';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProject = () => {
    setFormData({
      title: '',
      description: '',
      technologies: [],      category: undefined,
      liveUrl: '',
      repositoryUrl: '',
      imageUrls: [],
      startDate: new Date(),
      endDate: undefined,
      isOngoing: false
    });
    setErrors({});
    setIsAddingProject(true);
  };

  const handleEditProject = (project: Project) => {
    setFormData(project);
    setErrors({});
    setEditingId(project.id);
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
      const projectData = {
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || '',
        technologies: Array.isArray(formData.technologies) ? formData.technologies : [],
        startDate: formData.startDate ? formData.startDate.toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
        isOngoing: formData.isOngoing || false,        repositoryUrl: formData.repositoryUrl?.trim() || '',
        liveUrl: formData.liveUrl?.trim() || '',
        imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : [],
        category: formData.category?.trim() || ''
      };

      let response;
      
      if (editingId) {
        // Update existing project using the item endpoint
        response = await fetch(`/api/profile/${profile.username}/projects/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
      } else {
        // Create new project using the collection endpoint
        response = await fetch(`/api/profile/${profile.username}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save project');
      }      const result = await response.json();
      
      console.log('Project save result:', { 
        action: editingId ? 'UPDATE' : 'CREATE',
        projectId: result.data?.project?.id,
        success: result.success
      });
      
      // Update the profile data with the new/updated project
      const updatedProjects = [...(profile.projects || [])];
      
      if (editingId) {
        // Update existing project in the array
        const index = updatedProjects.findIndex(proj => proj.id === editingId);
        if (index >= 0) {
          updatedProjects[index] = result.data.project;
        }
      } else {
        // Add new project to the array
        updatedProjects.push(result.data.project);
      }
      
      // Update the profile via the onUpdate callback (for UI consistency)
      await onUpdate({ projects: updatedProjects });
      
      toast({
        title: "Success",
        description: `Project ${editingId ? 'updated' : 'added'} successfully.`,
      });
      
      setIsAddingProject(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingId ? 'update' : 'add'} project. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };  const handleDelete = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!confirm(`Are you sure you want to delete "${project?.title || 'this project'}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete project using the item endpoint
      const response = await fetch(`/api/profile/${profile.username}/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      const result = await response.json();
      
      console.log('Project delete result:', { 
        projectId: id,
        success: result.success
      });
      
      // Update the profile data by removing the deleted project
      const updatedProjects = projects.filter(proj => proj.id !== id);
      await onUpdate({ projects: updatedProjects });
      
      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAddingProject(false);
    setEditingId(null);
    setFormData({});
    setErrors({});
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Web': 'from-blue-500 to-cyan-500',
      'Mobile': 'from-green-500 to-teal-500',
      'AI/ML': 'from-purple-500 to-pink-500',
      'Desktop': 'from-orange-500 to-red-500',
      'Game': 'from-indigo-500 to-purple-500',
      'API': 'from-gray-500 to-slate-500',
      'Other': 'from-yellow-500 to-orange-500'
    };
    return colors[category as keyof typeof colors] || colors.Other;
  };

  const getTechColor = (tech: string) => {
    const techColors = {
      'React': 'bg-blue-100 text-blue-800',
      'Vue': 'bg-green-100 text-green-800',
      'Angular': 'bg-red-100 text-red-800',
      'Node.js': 'bg-lime-100 text-lime-800',
      'Python': 'bg-yellow-100 text-yellow-800',
      'TypeScript': 'bg-blue-100 text-blue-800',
      'JavaScript': 'bg-yellow-100 text-yellow-800',
      'Java': 'bg-orange-100 text-orange-800',
      'C++': 'bg-purple-100 text-purple-800',
      'Go': 'bg-cyan-100 text-cyan-800',
      'Rust': 'bg-orange-100 text-orange-800',
      'Swift': 'bg-orange-100 text-orange-800',
      'Kotlin': 'bg-purple-100 text-purple-800'
    };
    return techColors[tech as keyof typeof techColors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Projects
          {projects.length > 0 && (
            <Badge variant="secondary">{projects.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddProject}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {/* Project Grid */}
        <div className={`grid gap-6 ${preview ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
          <AnimatePresence>
            {displayProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                  <div className="relative">
                    {/* Project Image */}
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
                      {project.imageUrls && project.imageUrls.length > 0 ? (
                        <img 
                          src={project.imageUrls[0]} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(project.category || 'Other')} flex items-center justify-center`}>
                          <Code className="h-12 w-12 text-white opacity-80" />
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      {project.category && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-3 left-3 bg-white/90 text-gray-700"
                        >
                          {project.category}
                        </Badge>
                      )}

                      {/* Status Badge */}
                      {project.isOngoing && (
                        <Badge 
                          variant="default" 
                          className="absolute top-3 right-3 bg-green-500 text-white"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Ongoing
                        </Badge>
                      )}

                      {/* Actions Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {project.liveUrl && (
                          <Button size="sm" variant="secondary" asChild>
                            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}                        {project.repositoryUrl && (
                          <Button size="sm" variant="secondary" asChild>
                            <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {canEdit && (
                          <>                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleEditProject(project)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleDelete(project.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Project Details */}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
                        </div>

                        {/* Technologies */}
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.technologies.slice(0, 4).map((tech) => (
                              <Badge 
                                key={tech} 
                                variant="outline" 
                                className={`text-xs ${getTechColor(tech)}`}
                              >
                                {tech}
                              </Badge>
                            ))}
                            {project.technologies.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{project.technologies.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(project.startDate)}
                            {project.endDate && !project.isOngoing && ` - ${formatDate(project.endDate)}`}
                            {project.isOngoing && ' - Present'}
                          </span>
                        </div>

                        {/* Project Links */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {project.liveUrl && (
                            <Button size="sm" variant="outline" className="flex-1 gap-2" asChild>
                              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                                <Globe className="h-3 w-3" />
                                Live Demo
                              </a>
                            </Button>
                          )}                          {project.repositoryUrl && (
                            <Button size="sm" variant="outline" className="flex-1 gap-2" asChild>
                              <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                                <Github className="h-3 w-3" />
                                Code
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Preview Mode - Show More Button */}
        {preview && projects.length > 3 && (
          <div className="mt-6">
            <Button variant="outline" className="w-full gap-2">
              <span>View all {projects.length} projects</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No projects added</p>
            <p className="text-sm mb-4">Showcase your best work and technical projects.</p>
            {canEdit && (
              <Button onClick={handleAddProject} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}      <Dialog 
        open={isAddingProject || editingId !== null} 
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            handleCancel();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Project' : 'Add Project'}
            </DialogTitle>
          </DialogHeader>
            <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Project Title *</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => {
                  setFormData({...formData, title: e.target.value});
                  if (errors.title) {
                    setErrors({...errors, title: ''});
                  }
                }}
                placeholder="e.g., E-commerce Platform"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => {
                  setFormData({...formData, description: e.target.value});
                  if (errors.description) {
                    setErrors({...errors, description: ''});
                  }
                }}
                placeholder="Describe your project, its features, and impact..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData({...formData, category: value as ProjectCategory})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ProjectCategory.WEB_APPLICATION}>Web Application</SelectItem>
                    <SelectItem value={ProjectCategory.MOBILE_APPLICATION}>Mobile Application</SelectItem>
                    <SelectItem value={ProjectCategory.DESKTOP_APPLICATION}>Desktop Application</SelectItem>
                    <SelectItem value={ProjectCategory.AI_MACHINE_LEARNING}>AI/Machine Learning</SelectItem>
                    <SelectItem value={ProjectCategory.DATA_SCIENCE}>Data Science</SelectItem>
                    <SelectItem value={ProjectCategory.BLOCKCHAIN}>Blockchain</SelectItem>
                    <SelectItem value={ProjectCategory.GAME_DEVELOPMENT}>Game Development</SelectItem>
                    <SelectItem value={ProjectCategory.DESIGN}>Design</SelectItem>
                    <SelectItem value={ProjectCategory.RESEARCH}>Research</SelectItem>
                    <SelectItem value={ProjectCategory.OPEN_SOURCE}>Open Source</SelectItem>
                    <SelectItem value={ProjectCategory.PERSONAL}>Personal</SelectItem>
                    <SelectItem value={ProjectCategory.CLIENT_WORK}>Client Work</SelectItem>
                    <SelectItem value={ProjectCategory.STARTUP}>Startup</SelectItem>
                    <SelectItem value={ProjectCategory.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Technologies (comma-separated)</label>
                <Input
                  value={formData.technologies?.join(', ') || ''}
                  onChange={(e) => {
                    setFormData({...formData, technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)});
                    if (errors.technologies) {
                      setErrors({...errors, technologies: ''});
                    }
                  }}
                  placeholder="React, Node.js, MongoDB"
                  className={errors.technologies ? 'border-red-500' : ''}
                />
                {errors.technologies && (
                  <p className="text-sm text-red-500 mt-1">{errors.technologies}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Live URL</label>
                <Input
                  type="url"
                  value={formData.liveUrl || ''}
                  onChange={(e) => {
                    setFormData({...formData, liveUrl: e.target.value});
                    if (errors.liveUrl) {
                      setErrors({...errors, liveUrl: ''});
                    }
                  }}
                  placeholder="https://your-project.com"
                  className={errors.liveUrl ? 'border-red-500' : ''}
                />
                {errors.liveUrl && (
                  <p className="text-sm text-red-500 mt-1">{errors.liveUrl}</p>
                )}
              </div>              <div>
                <label className="text-sm font-medium">Repository URL</label>
                <Input
                  type="url"
                  value={formData.repositoryUrl || ''}
                  onChange={(e) => {
                    setFormData({...formData, repositoryUrl: e.target.value});
                    if (errors.repositoryUrl) {
                      setErrors({...errors, repositoryUrl: ''});
                    }
                  }}
                  placeholder="https://github.com/username/project"
                  className={errors.repositoryUrl ? 'border-red-500' : ''}
                />
                {errors.repositoryUrl && (
                  <p className="text-sm text-red-500 mt-1">{errors.repositoryUrl}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="month"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, startDate: new Date(e.target.value + '-01')});
                    if (errors.startDate) {
                      setErrors({...errors, startDate: ''});
                    }
                  }}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="month"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, endDate: new Date(e.target.value + '-01')});
                    if (errors.endDate) {
                      setErrors({...errors, endDate: ''});
                    }
                  }}
                  disabled={formData.isOngoing}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ongoing-project"
                checked={formData.isOngoing || false}
                onCheckedChange={(checked) => {
                  setFormData({...formData, isOngoing: checked as boolean});
                  if (checked) {
                    setFormData(prev => ({...prev, endDate: undefined}));
                    if (errors.endDate) {
                      setErrors({...errors, endDate: ''});
                    }
                  }
                }}
              />
              <label htmlFor="ongoing-project" className="text-sm font-medium">
                This is an ongoing project
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Project Images (URLs, one per line)</label>
              <Textarea
                value={formData.imageUrls?.join('\n') || ''}
                onChange={(e) => {
                  setFormData({...formData, imageUrls: e.target.value.split('\n').filter(Boolean)});
                  if (errors.imageUrls) {
                    setErrors({...errors, imageUrls: ''});
                  }
                }}
                placeholder="https://example.com/screenshot1.png&#10;https://example.com/screenshot2.png"
                rows={3}
                className={errors.imageUrls ? 'border-red-500' : ''}
              />
              {errors.imageUrls && (
                <p className="text-sm text-red-500 mt-1">{errors.imageUrls}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Add URLs to project screenshots or demo images
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>            <Button 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                editingId ? 'Update Project' : 'Add Project'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}