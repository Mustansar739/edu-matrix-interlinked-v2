// ==========================================
// CERTIFICATIONS SECTION - Professional Credentials
// ==========================================
// Professional certifications and credentials with verification status

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProfile, Certification } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, X } from 'lucide-react';
import {
  Edit,
  Plus,
  Award,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  ChevronRight,
  Star,
  Verified,
  Link
} from 'lucide-react';

interface CertificationsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
  preview?: boolean;
}

export function CertificationsSection({ 
  profile, 
  canEdit, 
  onUpdate, 
  preview = false 
}: CertificationsSectionProps) {  
  const [isAddingCertification, setIsAddingCertification] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Certification>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSkill, setCurrentSkill] = useState('');
  const { toast } = useToast();
  const certifications = profile.certifications || [];  
  const displayCertifications = preview ? certifications.slice(0, 3) : certifications;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Optional field length validation (only if fields are provided)
    if (formData.name && formData.name.trim()) {
      if (formData.name.trim().length < 2) {
        newErrors.name = 'Certification name must be at least 2 characters';
      } else if (formData.name.trim().length > 100) {
        newErrors.name = 'Certification name must be less than 100 characters';
      }
    }

    if (formData.issuer && formData.issuer.trim()) {
      if (formData.issuer.trim().length < 2) {
        newErrors.issuer = 'Issuing organization must be at least 2 characters';
      } else if (formData.issuer.trim().length > 100) {
        newErrors.issuer = 'Issuing organization must be less than 100 characters';
      }
    }

    // URL validation (only if URL is provided)
    if (formData.credentialUrl && formData.credentialUrl.trim()) {
      try {
        new URL(formData.credentialUrl);
      } catch {
        newErrors.credentialUrl = 'Please enter a valid URL';
      }
    }

    // Date validation (only if both dates are provided)
    if (formData.issueDate && formData.expiryDate) {
      const issueDate = new Date(formData.issueDate);
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= issueDate) {
        newErrors.expiryDate = 'Expiry date must be after issue date';
      }
    }

    // Check if at least one meaningful field is provided
    const hasAnyMeaningfulField = 
      (formData.name && formData.name.trim()) ||
      (formData.issuer && formData.issuer.trim()) ||
      (formData.credentialId && formData.credentialId.trim()) ||
      (formData.credentialUrl && formData.credentialUrl.trim()) ||
      formData.issueDate;

    if (!hasAnyMeaningfulField) {
      newErrors.general = 'Please provide at least one field (name, issuer, credential ID, URL, or date)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Skills management functions
  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !formData.skills?.includes(trimmedSkill)) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), trimmedSkill]
      });
    }
    setCurrentSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter(skill => skill !== skillToRemove) || []
    });
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentSkill.trim()) {
        addSkill(currentSkill);
      }
    } else if (e.key === 'Backspace' && !currentSkill && formData.skills?.length) {
      // Remove last skill if backspace is pressed and input is empty
      const skills = formData.skills;
      removeSkill(skills[skills.length - 1]);
    }
  };

  const handleAddCertification = () => {
    setFormData({
      name: '',
      issuer: '',
      issueDate: new Date(),
      expiryDate: undefined,
      credentialId: '',
      credentialUrl: '',
      skills: []
      // Removed isVerified as it doesn't exist in database schema
    });
    setErrors({});
    setIsAddingCertification(true);
  };
  const handleEditCertification = (certification: Certification) => {
    setFormData(certification);
    setErrors({});
    setEditingId(certification.id);
    setCurrentSkill('');
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

    // Prevent multiple simultaneous saves
    if (isLoading) {
      console.log('Save already in progress, ignoring additional save request');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare the data for the API
      const certificationData = {
        name: formData.name?.trim() || '',
        issuer: formData.issuer?.trim() || '',
        issueDate: formData.issueDate ? formData.issueDate.toISOString() : undefined,
        expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : undefined,
        credentialId: formData.credentialId?.trim() || '',
        credentialUrl: formData.credentialUrl?.trim() || '',
        skills: Array.isArray(formData.skills) ? formData.skills : []
      };

      // Check for duplicates before creating
      if (!editingId) {
        const isDuplicate = certifications.some(cert => 
          cert.name?.toLowerCase().trim() === certificationData.name.toLowerCase().trim() &&
          cert.issuer?.toLowerCase().trim() === certificationData.issuer.toLowerCase().trim() &&
          certificationData.name && certificationData.issuer
        );

        if (isDuplicate) {
          toast({
            title: "Duplicate Certification",
            description: "A certification with the same name and issuer already exists.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      let response;
      
      if (editingId) {
        // Update existing certification using the item endpoint
        response = await fetch(`/api/profile/${profile.username}/certifications/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(certificationData)
        });
      } else {
        // Create new certification using the collection endpoint
        response = await fetch(`/api/profile/${profile.username}/certifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(certificationData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save certification');
      }

      const result = await response.json();
        console.log('Certification save result:', { 
        action: editingId ? 'UPDATE' : 'CREATE',
        certificationId: result.data?.certification?.id,
        success: result.success
      });
      
      // Update the profile data with the new/updated certification
      const updatedCertifications = [...(profile.certifications || [])];
      
      if (editingId) {
        // Update existing certification in the array
        const index = updatedCertifications.findIndex(cert => cert.id === editingId);
        if (index >= 0) {
          updatedCertifications[index] = result.data.certification;
        }
      } else {
        // Add new certification to the array
        updatedCertifications.push(result.data.certification);
      }
      
      // Update the profile via the onUpdate callback (for UI consistency)
      await onUpdate({ certifications: updatedCertifications });
      
      toast({
        title: "Success",
        description: `Certification ${editingId ? 'updated' : 'added'} successfully.`,
      });
      
      setIsAddingCertification(false);
      setEditingId(null);
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Error saving certification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingId ? 'update' : 'add'} certification. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    const certification = certifications.find(c => c.id === id);
    if (!confirm(`Are you sure you want to delete "${certification?.name || 'this certification'}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete certification using the item endpoint
      const response = await fetch(`/api/profile/${profile.username}/certifications/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete certification');
      }

      const result = await response.json();
      
      console.log('Certification delete result:', { 
        certificationId: id,
        success: result.success
      });
      
      // Update the profile data by removing the deleted certification
      const updatedCertifications = certifications.filter(cert => cert.id !== id);
      await onUpdate({ certifications: updatedCertifications });
      
      toast({
        title: "Success",
        description: "Certification deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete certification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setIsAddingCertification(false);
    setEditingId(null);
    setFormData({});
    setErrors({});
    setCurrentSkill('');
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const isExpired = (expiryDate?: Date | string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate?: Date | string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    return expiry > now && expiry <= threeMonthsFromNow;
  };

  const getStatusBadge = (certification: Certification) => {
    if (isExpired(certification.expiryDate)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    if (isExpiringSoon(certification.expiryDate)) {
      return (
        <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
          <Clock className="h-3 w-3" />
          Expiring Soon
        </Badge>
      );
    }
    if (certification.credentialUrl) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return null;
  };

  const getCertificationIcon = (issuer: string) => {
    const issuerLower = issuer.toLowerCase();
    if (issuerLower.includes('aws') || issuerLower.includes('amazon')) {
      return '🟠'; // AWS orange
    }
    if (issuerLower.includes('google') || issuerLower.includes('gcp')) {
      return '🔵'; // Google blue
    }
    if (issuerLower.includes('microsoft') || issuerLower.includes('azure')) {
      return '🟦'; // Microsoft blue
    }
    if (issuerLower.includes('oracle')) {
      return '🔴'; // Oracle red
    }
    if (issuerLower.includes('cisco')) {
      return '🟢'; // Cisco blue/green
    }
    if (issuerLower.includes('salesforce')) {
      return '🔵'; // Salesforce blue
    }
    return '🏆'; // Generic trophy
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications
          {certifications.length > 0 && (
            <Badge variant="secondary">{certifications.length}</Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleAddCertification}
          >
            <Plus className="h-4 w-4" />
            Add Certification
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence>
          {displayCertifications.map((certification, index) => (
            <motion.div
              key={certification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                {/* Certification Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-white">
                    <span className="text-xl">{getCertificationIcon(certification.issuer || '')}</span>
                  </div>
                </div>

                {/* Certification Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {certification.name}
                        </h3>
                        {getStatusBadge(certification)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{certification.issuer}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Issued {certification.issueDate ? formatDate(certification.issueDate) : 'Date not specified'}</span>
                        </div>
                        {certification.expiryDate && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {isExpired(certification.expiryDate) 
                                  ? `Expired ${formatDate(certification.expiryDate)}`
                                  : `Expires ${formatDate(certification.expiryDate)}`
                                }
                              </span>
                            </div>
                          </>
                        )}
                        {!certification.expiryDate && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">No Expiration</span>
                          </>
                        )}
                      </div>

                      {/* Credential ID */}
                      {certification.credentialId && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Credential ID:</span> {certification.credentialId}
                          </p>
                        </div>
                      )}

                      {/* Skills */}
                      {certification.skills && certification.skills.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Skills Covered</h4>
                          <div className="flex flex-wrap gap-1">
                            {certification.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {certification.credentialUrl && (
                          <Button size="sm" variant="outline" className="gap-2" asChild>
                            <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                              View Credential
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCertification(certification)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(certification.id)}
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
        {preview && certifications.length > 3 && (
          <Button variant="outline" className="w-full gap-2">
            <span>View all {certifications.length} certifications</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Certification Summary */}
        {certifications.length > 0 && !preview && (
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Certification Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {certifications.filter(c => !isExpired(c.expiryDate)).length}
                </div>
                <div className="text-gray-600">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {certifications.filter(c => isExpiringSoon(c.expiryDate)).length}
                </div>
                <div className="text-gray-600">Expiring Soon</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {certifications.filter(c => c.credentialUrl).length}
                </div>
                <div className="text-gray-600">Verified</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(certifications.map(c => c.issuer)).size}
                </div>
                <div className="text-gray-600">Issuers</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {certifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No certifications added</p>
            <p className="text-sm mb-4">Showcase your professional credentials and achievements.</p>
            {canEdit && (
              <Button onClick={handleAddCertification} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Certification
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}      
      <Dialog 
        open={isAddingCertification || editingId !== null} 
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            handleCancel();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Certification' : 'Add Certification'}
            </DialogTitle>
          </DialogHeader>
            <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Certification Name *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) {
                    setErrors({...errors, name: ''});
                  }
                }}
                placeholder="e.g., AWS Certified Solutions Architect"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Issuing Organization *</label>
              <Input
                value={formData.issuer || ''}
                onChange={(e) => {
                  setFormData({...formData, issuer: e.target.value});
                  if (errors.issuer) {
                    setErrors({...errors, issuer: ''});
                  }
                }}
                placeholder="e.g., Amazon Web Services"
                className={errors.issuer ? 'border-red-500' : ''}
              />
              {errors.issuer && (
                <p className="text-sm text-red-500 mt-1">{errors.issuer}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Issue Date *</label>
                <Input
                  type="month"
                  value={formData.issueDate ? new Date(formData.issueDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, issueDate: new Date(e.target.value + '-01')});
                    if (errors.issueDate) {
                      setErrors({...errors, issueDate: ''});
                    }
                  }}
                  className={errors.issueDate ? 'border-red-500' : ''}
                />
                {errors.issueDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.issueDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Expiry Date</label>
                <Input
                  type="month"
                  value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    setFormData({...formData, expiryDate: e.target.value ? new Date(e.target.value + '-01') : undefined});
                    if (errors.expiryDate) {
                      setErrors({...errors, expiryDate: ''});
                    }
                  }}
                  className={errors.expiryDate ? 'border-red-500' : ''}
                />
                {errors.expiryDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Leave empty if certification doesn&apos;t expire</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Credential ID</label>
              <Input
                value={formData.credentialId || ''}
                onChange={(e) => setFormData({...formData, credentialId: e.target.value})}
                placeholder="e.g., ABC123XYZ789"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Credential URL</label>
              <Input
                type="url"
                value={formData.credentialUrl || ''}
                onChange={(e) => {
                  setFormData({...formData, credentialUrl: e.target.value});
                  if (errors.credentialUrl) {
                    setErrors({...errors, credentialUrl: ''});
                  }
                }}
                placeholder="https://www.credly.com/badges/..."
                className={errors.credentialUrl ? 'border-red-500' : ''}
              />
              {errors.credentialUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.credentialUrl}</p>
              )}              <p className="text-xs text-gray-500 mt-1">Link to verify your certification</p>
            </div>

            <div>
              <label className="text-sm font-medium">Skills Gained</label>
              <div className="space-y-2">
                {/* Display existing skills as badges */}
                {formData.skills && formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Input for adding new skills */}
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter to add"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500">
                  Type a skill name and press Enter to add it. Use Backspace to remove the last skill.
                </p>
              </div>
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
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                editingId ? 'Update Certification' : 'Add Certification'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}