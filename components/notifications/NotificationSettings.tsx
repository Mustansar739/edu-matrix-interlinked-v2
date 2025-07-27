/**
 * NOTIFICATION SETTINGS COMPONENT
 * Settings panel for managing notification preferences
 */

'use client';

import { useState } from 'react';
import { Settings, Bell, BellOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

interface NotificationPreferences {
  posts: boolean;
  comments: boolean;
  likes: boolean;
  shares: boolean;
  follows: boolean;
  mentions: boolean;
  studyReminders: boolean;
  groupActivity: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    posts: true,
    comments: true,
    likes: true,
    shares: true,
    follows: true,
    mentions: true,
    studyReminders: true,
    groupActivity: true,
    emailNotifications: false,
    pushNotifications: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to save preferences
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const notificationCategories = [
    {
      title: 'Social Interactions',
      description: 'Notifications about likes, comments, and shares',
      settings: [
        { key: 'likes' as const, label: 'Likes on posts and comments', description: 'When someone likes your content' },
        { key: 'comments' as const, label: 'Comments on posts', description: 'When someone comments on your posts' },
        { key: 'shares' as const, label: 'Post shares', description: 'When someone shares your posts' },
        { key: 'mentions' as const, label: 'Mentions', description: 'When someone mentions you in a post or comment' },
      ]
    },
    {
      title: 'Social Network',
      description: 'Notifications about followers and social connections',
      settings: [
        { key: 'follows' as const, label: 'New followers', description: 'When someone starts following you' },
        { key: 'posts' as const, label: 'Posts from followed users', description: 'When people you follow make new posts' },
      ]
    },
    {
      title: 'Study & Groups',
      description: 'Educational and group-related notifications',
      settings: [
        { key: 'studyReminders' as const, label: 'Study reminders', description: 'Scheduled study session reminders' },
        { key: 'groupActivity' as const, label: 'Group activity', description: 'Activity in study groups you\'re part of' },
      ]
    },
    {
      title: 'Delivery Methods',
      description: 'How you want to receive notifications',
      settings: [
        { key: 'pushNotifications' as const, label: 'Push notifications', description: 'Browser and mobile push notifications' },
        { key: 'emailNotifications' as const, label: 'Email notifications', description: 'Daily digest via email' },
      ]
    }
  ];

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how and when you receive notifications from Students Interlinked
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{category.title}</h3>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="space-y-3">
              {category.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={setting.key} className="text-sm font-medium">
                      {setting.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={preferences[setting.key]}
                    onCheckedChange={(checked) => handlePreferenceChange(setting.key, checked)}
                  />
                </div>
              ))}
            </div>
            <Separator />
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2">
            {saved && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Settings saved successfully</span>
              </>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || saved}
            className="min-w-[100px]"
          >
            {isLoading ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
