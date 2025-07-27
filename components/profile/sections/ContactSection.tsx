// ==========================================
// CONTACT SECTION - Contact Information & Social Links
// ==========================================
// Contact details and social media presence

'use client';

import { useState } from 'react';
import { UnifiedProfile, ContactMethod } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Edit,
  Phone,
  Mail,
  MapPin,
  Globe,
  Linkedin,
  Github,
  ExternalLink,
  Copy,
  MessageCircle,
  Share2,
  Shield,
  Eye,
  EyeOff,
  QrCode,
  Download
} from 'lucide-react';

interface ContactSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
  onUpdate: (data: Partial<UnifiedProfile>) => Promise<void>;
}

export function ContactSection({ profile, canEdit, onUpdate }: ContactSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
    const [formData, setFormData] = useState({
    email: profile.email || '',
    phoneNumber: profile.phoneNumber || '',
    city: profile.city || '',
    country: profile.country || '',
    websiteUrl: profile.websiteUrl || '',
    showContactInfo: profile.showContactInfo ?? true,
    recruiterContact: profile.recruiterContact ?? false,
    preferredContactMethod: (profile.preferredContactMethod as ContactMethod) || ContactMethod.EMAIL
  });
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Phone number validation (basic)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        newErrors.phoneNumber = 'Please enter a valid phone number';
      }
    }    // URL validations
    const urlFields = {
      websiteUrl: 'Website URL'
    };

    Object.entries(urlFields).forEach(([field, label]) => {
      const value = formData[field as keyof typeof formData] as string;
      if (value && value.trim()) {
        try {
          new URL(value);
        } catch {
          newErrors[field] = `Please enter a valid ${label}`;
        }
      }
    });

    // City and country length validation
    if (formData.city && formData.city.trim().length > 50) {
      newErrors.city = 'City name must be less than 50 characters';
    }
    if (formData.country && formData.country.trim().length > 50) {
      newErrors.country = 'Country name must be less than 50 characters';
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
      toast({
        title: "Success",
        description: "Contact information updated successfully.",
      });
      setIsEditing(false);
      setErrors({});
    } catch (error) {
      console.error('Error saving contact information:', error);
      toast({
        title: "Error",
        description: "Failed to update contact information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setFormData({
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
      city: profile.city || '',
      country: profile.country || '',
      websiteUrl: profile.websiteUrl || '',
      showContactInfo: profile.showContactInfo ?? true,
      recruiterContact: profile.recruiterContact ?? false,
      preferredContactMethod: (profile.preferredContactMethod as ContactMethod) || ContactMethod.EMAIL
    });
    setErrors({});
    setIsEditing(false);
  };
  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/u/${profile.username}`;
    const shareText = `Connect with ${profile.name} on Edu Matrix Interlinked`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name} - Professional Profile`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Shared!",
          description: "Profile link copied to clipboard.",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Shared!",
        description: "Profile link copied to clipboard.",
      });
    }
  };

  const contactMethods = [
    {
      id: 'email',
      label: 'Email',
      value: profile.email,
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:${profile.email}`,
      visible: true,
      copyable: true
    },
    {
      id: 'phone',
      label: 'Phone',
      value: profile.phoneNumber,
      icon: <Phone className="h-4 w-4" />,
      href: `tel:${profile.phoneNumber}`,
      visible: profile.showContactInfo,
      copyable: true
    },
    {
      id: 'location',
      label: 'Location',
      value: [profile.city, profile.country].filter(Boolean).join(', '),
      icon: <MapPin className="h-4 w-4" />,
      href: null,
      visible: true,
      copyable: true
    }
  ];
  const socialLinks = [
    {
      id: 'website',
      label: 'Website',
      value: profile.websiteUrl,
      icon: <ExternalLink className="h-4 w-4 text-purple-600" />,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contact Information
        </CardTitle>
        {canEdit && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Contact Information</DialogTitle>
              </DialogHeader>
                <div className="grid gap-6 py-4">
                {/* Basic Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({...formData, email: e.target.value});
                        if (errors.email) {
                          setErrors({...errors, email: ''});
                        }
                      }}
                      placeholder="your.email@example.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        setFormData({...formData, phoneNumber: e.target.value});
                        if (errors.phoneNumber) {
                          setErrors({...errors, phoneNumber: ''});
                        }
                      }}
                      placeholder="+1 (555) 123-4567"
                      className={errors.phoneNumber ? 'border-red-500' : ''}
                    />
                    {errors.phoneNumber && (
                      <p className="text-sm text-red-500 mt-1">{errors.phoneNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => {
                          setFormData({...formData, city: e.target.value});
                          if (errors.city) {
                            setErrors({...errors, city: ''});
                          }
                        }}
                        placeholder="San Francisco"
                        className={errors.city ? 'border-red-500' : ''}
                      />
                      {errors.city && (
                        <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <Input
                        value={formData.country}
                        onChange={(e) => {
                          setFormData({...formData, country: e.target.value});
                          if (errors.country) {
                            setErrors({...errors, country: ''});
                          }
                        }}
                        placeholder="United States"
                        className={errors.country ? 'border-red-500' : ''}
                      />
                      {errors.country && (
                        <p className="text-sm text-red-500 mt-1">{errors.country}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Links */}                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Social Links</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Personal Website</label>
                    <p className="text-xs text-gray-500 mb-2">Your LinkedIn, GitHub, portfolio, or any other website</p>
                    <Input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => {
                        setFormData({...formData, websiteUrl: e.target.value});
                        if (errors.websiteUrl) {
                          setErrors({...errors, websiteUrl: ''});
                        }
                      }}
                      placeholder="https://your-website.com"
                      className={errors.websiteUrl ? 'border-red-500' : ''}
                    />
                    {errors.websiteUrl && (
                      <p className="text-sm text-red-500 mt-1">{errors.websiteUrl}</p>
                    )}
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Privacy Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Show Contact Information</label>
                      <p className="text-xs text-gray-500">Allow visitors to see your phone number</p>
                    </div>
                    <Switch
                      checked={formData.showContactInfo}
                      onCheckedChange={(checked) => setFormData({...formData, showContactInfo: checked})}
                    />
                  </div>

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
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Methods */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Methods</h4>
          <div className="space-y-3">
            {contactMethods.map((method) => (
              method.value && method.visible && (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gray-100">
                      {method.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{method.label}</div>
                      <div className="text-sm text-gray-600">{method.value}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.href && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={method.href}>
                          {method.id === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                        </a>
                      </Button>
                    )}                    {method.copyable && method.value && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCopyToClipboard(method.value!, method.label)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Social Presence</h4>
          <div className="grid grid-cols-2 gap-3">
            {socialLinks.map((link) => (
              link.value && (
                <Button
                  key={link.id}
                  variant="outline"
                  className={`h-auto p-4 justify-start ${link.color}`}
                  asChild
                >
                  <a href={link.value} target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center gap-3">
                      {link.icon}
                      <div className="text-left">
                        <div className="text-sm font-medium">{link.label}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[120px]">
                          {link.value.replace(/^https?:\/\//, '')}
                        </div>
                      </div>
                    </div>
                  </a>
                </Button>
              )
            ))}
          </div>
        </div>

        {/* Profile Sharing */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Profile
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Profile URL</div>
                <div className="text-xs text-gray-600">
                  edumatrix.com/u/{profile.username}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopyToClipboard(
                    `${window.location.origin}/u/${profile.username}`,
                    'Profile URL'
                  )}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleShareProfile}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200">
              <Button size="sm" variant="outline" className="gap-2">
                <QrCode className="h-3 w-3" />
                QR Code
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="h-3 w-3" />
                vCard
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <MessageCircle className="h-3 w-3" />
                Message
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">Privacy & Contact Settings</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  {profile.showContactInfo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Contact info is {profile.showContactInfo ? 'visible' : 'hidden'} to visitors
                </div>
                <div className="flex items-center gap-2">
                  {profile.recruiterContact ? <MessageCircle className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Recruiter contact is {profile.recruiterContact ? 'enabled' : 'disabled'}
                </div>
              </div>
            </div>
          </div>
        </div>        {/* Empty State */}
        {!profile.email && !profile.phoneNumber && !profile.websiteUrl && (
          <div className="text-center py-8 text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No contact information added</p>
            <p className="text-sm mb-4">Add your contact details to help others connect with you.</p>
            {canEdit && (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Add Contact Information
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}