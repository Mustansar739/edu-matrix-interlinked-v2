'use client';

// ==========================================
// USER INFO COMPONENT
// ==========================================
// User information and conversation settings

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  X,
  Phone,
  Video,
  Shield,
  VolumeX,
  Archive,
  Trash2,
  Pin,
  Star,
  Image,
  File,
  Link,
  MapPin,
  Users,
  Settings,
  Clock,
  Bell,
  Eye,
  Heart,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface Conversation {
  id: string;
  title?: string;
  type: 'DIRECT' | 'GROUP';
  isGroup: boolean;
  participants: Array<{
    id: string;
    userId: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    isAdmin?: boolean;
    lastSeen?: string;
    joinedAt?: string;
  }>;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isBlocked?: boolean;
  isEncrypted?: boolean;
  theme?: string;
  wallpaper?: string;
  createdAt?: string;
  customSettings?: {
    messageTimer?: number;
    allowNotifications?: boolean;
    allowMessageRequests?: boolean;
  };
}

interface UserInfoProps {
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onBlock: () => void;
  onMute: () => void;
  onArchive: () => void;
  className?: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  thumbnail?: string;
  title?: string;
  createdAt: string;
}

// Mock shared media data
const SHARED_MEDIA: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: '/api/placeholder/300/200',
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: '2',
    type: 'video',
    url: '/videos/sample.mp4',
    thumbnail: '/api/placeholder/300/200',
    createdAt: '2024-01-09T15:30:00Z'
  },
  {
    id: '3',
    type: 'file',
    url: '/files/document.pdf',
    title: 'Project Proposal.pdf',
    createdAt: '2024-01-08T09:15:00Z'
  },
  {
    id: '4',
    type: 'link',
    url: 'https://example.com',
    title: 'Interesting Article',
    createdAt: '2024-01-07T14:20:00Z'
  }
];

export function UserInfo({
  conversation,
  currentUserId,
  onClose,
  onBlock,
  onMute,
  onArchive,
  className
}: UserInfoProps) {
  const [settings, setSettings] = useState({
    notifications: !conversation.isMuted,
    readReceipts: true,
    typing: true,
    messageTimer: conversation.customSettings?.messageTimer || 0
  });

  const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
  const isGroup = conversation.isGroup;

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const groupedMedia = SHARED_MEDIA.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  return (
    <div className={cn("h-full flex flex-col bg-white dark:bg-gray-900", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {isGroup ? 'Group Info' : 'Contact Info'}
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Profile Section */}
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={isGroup ? undefined : otherParticipant?.avatar} />
              <AvatarFallback className="text-2xl">
                {isGroup ? (
                  <Users className="w-12 h-12" />
                ) : (
                  otherParticipant?.name?.charAt(0) || 'U'
                )}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-xl font-semibold mb-1">
              {isGroup 
                ? (conversation.title || 'Group Chat')
                : (otherParticipant?.name || 'Unknown User')
              }
            </h3>
            
            {!isGroup && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {otherParticipant?.isOnline ? (
                  <span className="text-green-500">● Active now</span>
                ) : (
                  `Last seen ${formatLastSeen(otherParticipant?.lastSeen)}`
                )}
              </div>
            )}

            {isGroup && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {conversation.participants.length} members
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center mb-4">
              {!isGroup && (
                <>
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline">
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap justify-center gap-2">
              {conversation.isEncrypted && (
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Encrypted
                </Badge>
              )}
              {conversation.isPinned && (
                <Badge variant="secondary">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {conversation.isMuted && (
                <Badge variant="secondary">
                  <VolumeX className="w-3 h-3 mr-1" />
                  Muted
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Tabs for different sections */}
          <Tabs defaultValue="media" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="members">{isGroup ? 'Members' : 'About'}</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Shared Media Tab */}
            <TabsContent value="media" className="space-y-4">
              <div className="space-y-4">
                {/* Photos & Videos */}
                {groupedMedia.image && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Photos ({groupedMedia.image.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2">
                        {groupedMedia.image.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                          >
                            <img
                              src={item.url}
                              alt="Shared media"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      {groupedMedia.image.length > 6 && (
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View all {groupedMedia.image.length} photos
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Files */}
                {groupedMedia.file && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <File className="w-4 h-4" />
                        Files ({groupedMedia.file.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {groupedMedia.file.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                              <File className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {groupedMedia.file.length > 3 && (
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View all {groupedMedia.file.length} files
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Links */}
                {groupedMedia.link && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Links ({groupedMedia.link.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {groupedMedia.link.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                              <Link className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {item.url}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {groupedMedia.link.length > 3 && (
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View all {groupedMedia.link.length} links
                        </Button>
                      )}
                    </CardContent>
                
                </Card>
              )}

              {Object.keys(groupedMedia).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div className="text-sm">No shared media</div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Members/About Tab */}
          <TabsContent value="members" className="space-y-4">
            {isGroup ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Members ({conversation.participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {conversation.participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{participant.name}</div>
                          <div className="text-xs text-gray-500">
                            {participant.isAdmin ? 'Admin' : 'Member'}
                            {participant.isOnline && ' • Online'}
                          </div>
                        </div>
                        {participant.userId === currentUserId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Add Members
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {otherParticipant?.joinedAt && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm">Joined</div>
                          <div className="text-xs text-gray-500">
                            {new Date(otherParticipant.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm">Local time</div>
                        <div className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Chat Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">Notifications</div>
                      <div className="text-xs text-gray-500">Get notified about new messages</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">Read Receipts</div>
                      <div className="text-xs text-gray-500">Send read confirmations</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.readReceipts}
                    onCheckedChange={(checked) => handleSettingChange('readReceipts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">Typing Indicators</div>
                      <div className="text-xs text-gray-500">Show when you&apos;re typing</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.typing}
                    onCheckedChange={(checked) => handleSettingChange('typing', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Privacy & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onMute}
                >
                  <VolumeX className="w-4 h-4 mr-3" />
                  {conversation.isMuted ? 'Unmute' : 'Mute'} Conversation
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onArchive}
                >
                  <Archive className="w-4 h-4 mr-3" />
                  {conversation.isArchived ? 'Unarchive' : 'Archive'} Conversation
                </Button>

                {!isGroup && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={onBlock}
                  >
                    <Shield className="w-4 h-4 mr-3" />
                    {conversation.isBlocked ? 'Unblock' : 'Block'} User
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Conversation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  </div>
);
}
