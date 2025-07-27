'use client';

// ==========================================
// CHAT THEMES COMPONENT
// ==========================================
// Facebook-style chat themes and customization

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Palette,
  Check,
  Sparkles,
  Heart,
  Star,
  Zap,
  Moon,
  Sun,
  Waves,
  Mountain
} from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string;
  type: 'color' | 'gradient' | 'pattern';
  preview: {
    primary: string;
    secondary: string;
    accent?: string;
    background?: string;
    pattern?: string;
  };
  isPremium?: boolean;
  icon?: React.ReactNode;
}

interface ChatThemesProps {
  selectedTheme: string;
  onThemeSelect: (themeId: string) => void;
  onClose: () => void;
  className?: string;
}

const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Classic blue theme',
    type: 'color',
    preview: {
      primary: '#3b82f6',
      secondary: '#e5e7eb',
      background: '#ffffff'
    },
    icon: <Palette className="w-4 h-4" />
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Easy on the eyes',
    type: 'color',
    preview: {
      primary: '#6366f1',
      secondary: '#374151',
      background: '#111827'
    },
    icon: <Moon className="w-4 h-4" />
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange gradient',
    type: 'gradient',
    preview: {
      primary: '#f97316',
      secondary: '#fed7aa',
      accent: '#ea580c',
      background: 'linear-gradient(135deg, #f97316, #ea580c)'
    },
    icon: <Sun className="w-4 h-4" />
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue waves',
    type: 'gradient',
    preview: {
      primary: '#0ea5e9',
      secondary: '#bae6fd',
      accent: '#0284c7',
      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)'
    },
    icon: <Waves className="w-4 h-4" />
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green tones',
    type: 'gradient',
    preview: {
      primary: '#10b981',
      secondary: '#bbf7d0',
      accent: '#059669',
      background: 'linear-gradient(135deg, #10b981, #059669)'
    },
    icon: <Mountain className="w-4 h-4" />
  },
  {
    id: 'love',
    name: 'Love',
    description: 'Romantic pink theme',
    type: 'gradient',
    preview: {
      primary: '#ec4899',
      secondary: '#fce7f3',
      accent: '#db2777',
      background: 'linear-gradient(135deg, #ec4899, #db2777)'
    },
    icon: <Heart className="w-4 h-4" />,
    isPremium: true
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    description: 'Cosmic purple theme',
    type: 'gradient',
    preview: {
      primary: '#8b5cf6',
      secondary: '#e9d5ff',
      accent: '#7c3aed',
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    },
    icon: <Sparkles className="w-4 h-4" />,
    isPremium: true
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Electric lime theme',
    type: 'gradient',
    preview: {
      primary: '#84cc16',
      secondary: '#ecfccb',
      accent: '#65a30d',
      background: 'linear-gradient(135deg, #84cc16, #65a30d)'
    },
    icon: <Zap className="w-4 h-4" />,
    isPremium: true
  }
];

const WALLPAPERS = [
  {
    id: 'none',
    name: 'None',
    preview: '#ffffff'
  },
  {
    id: 'bubbles',
    name: 'Bubbles',
    preview: '/wallpapers/bubbles.jpg'
  },
  {
    id: 'geometric',
    name: 'Geometric',
    preview: '/wallpapers/geometric.jpg'
  },
  {
    id: 'nature',
    name: 'Nature',
    preview: '/wallpapers/nature.jpg'
  }
];

export function ChatThemes({
  selectedTheme,
  onThemeSelect,
  onClose,
  className
}: ChatThemesProps) {
  const [selectedWallpaper, setSelectedWallpaper] = useState('none');
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);

  const handleThemeSelect = (theme: Theme) => {
    setPreviewTheme(theme);
    onThemeSelect(theme.id);
  };

  const currentTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Theme Preview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="relative rounded-lg overflow-hidden p-4 min-h-[200px]"
            style={{
              background: (previewTheme || currentTheme).preview.background || 
                          (previewTheme || currentTheme).preview.primary
            }}
          >
            {/* Mock conversation */}
            <div className="space-y-3">
              {/* Received message */}
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div 
                  className="max-w-xs rounded-2xl px-3 py-2 text-sm"
                  style={{ 
                    backgroundColor: (previewTheme || currentTheme).preview.secondary,
                    color: (previewTheme || currentTheme).preview.background?.includes('linear') ? '#000' : '#374151'
                  }}
                >
                  Hey! How are you doing today?
                </div>
              </div>
              
              {/* Sent message */}
              <div className="flex gap-2 justify-end">
                <div 
                  className="max-w-xs rounded-2xl px-3 py-2 text-sm text-white"
                  style={{ 
                    backgroundColor: (previewTheme || currentTheme).preview.primary
                  }}
                >
                  I&apos;m doing great! Thanks for asking 😊
                </div>
              </div>
              
              {/* Another received message */}
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div 
                  className="max-w-xs rounded-2xl px-3 py-2 text-sm"
                  style={{ 
                    backgroundColor: (previewTheme || currentTheme).preview.secondary,
                    color: (previewTheme || currentTheme).preview.background?.includes('linear') ? '#000' : '#374151'
                  }}
                >
                  That&apos;s awesome! Want to grab coffee later?
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Themes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Themes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => (
                <Card
                  key={theme.id}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 relative",
                    selectedTheme === theme.id && "ring-2 ring-blue-500"
                  )}
                  onClick={() => handleThemeSelect(theme)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {theme.icon}
                      <span className="font-medium text-sm">{theme.name}</span>
                      {theme.isPremium && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Pro
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      {theme.description}
                    </div>
                    
                    {/* Color Preview */}
                    <div className="flex gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ 
                          background: theme.preview.background || theme.preview.primary 
                        }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: theme.preview.secondary }}
                      />
                      {theme.preview.accent && (
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: theme.preview.accent }}
                        />
                      )}
                    </div>

                    {selectedTheme === theme.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Wallpapers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            Chat Wallpapers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {WALLPAPERS.map((wallpaper) => (
              <Card
                key={wallpaper.id}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 relative aspect-square",
                  selectedWallpaper === wallpaper.id && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedWallpaper(wallpaper.id)}
              >
                <CardContent className="p-0 h-full">
                  {wallpaper.id === 'none' ? (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">None</span>
                    </div>
                  ) : (
                    <div
                      className="w-full h-full rounded bg-cover bg-center"
                      style={{ backgroundImage: `url(${wallpaper.preview})` }}
                    />
                  )}
                  
                  {selectedWallpaper === wallpaper.id && (
                    <div className="absolute top-1 right-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onClose} className="flex-1">
          Apply Changes
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
