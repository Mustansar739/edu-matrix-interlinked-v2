'use client';

// ==========================================
// CONVERSATION LIST COMPONENT
// ==========================================
// Facebook-style conversation list with all features

import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Search,
  MoreVertical,
  Pin,
  Archive,
  VolumeX,
  Trash2,
  MessageCircle,
  Users,
  Video,
  Phone,
  Star,
  CheckCheck,
  Clock,
  Camera,
  Mic,
  File,
  MapPin,
  Gift,
  Image,
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
  }>;
  lastMessage?: {
    id: string;
    content: string | null;
    senderId: string;
    senderName: string;
    createdAt: string | Date;
    messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'STICKER' | 'GIF';
    mediaUrls?: string[];
  };
  unreadCount: number;
  lastActivity: string | Date;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isBlocked?: boolean;
  typingUsers?: Array<{
    id: string;
    name: string;
  }>;
  onlineCount?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectConversation?: (conversationId: string) => void;
  onArchiveConversation?: (conversationId: string) => void;
  onMuteConversation?: (conversationId: string) => void;
  onPinConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onBlockConversation?: (conversationId: string) => void;
  onVideoCall?: (conversationId: string) => void;
  onVoiceCall?: (conversationId: string) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  currentUserId,
  activeConversationId,
  searchQuery = '',
  onSearchChange,
  onSelectConversation,
  onArchiveConversation,
  onMuteConversation,
  onPinConversation,
  onDeleteConversation,
  onBlockConversation,
  onVideoCall,
  onVoiceCall,
  className
}: ConversationListProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations.filter(conv => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = conv.title?.toLowerCase().includes(query);
        const matchesParticipant = conv.participants.some(p => 
          p.name.toLowerCase().includes(query)
        );
        const matchesLastMessage = conv.lastMessage?.content?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesParticipant && !matchesLastMessage) {
          return false;
        }
      }

      // Status filter
      switch (filter) {
        case 'unread':
          return conv.unreadCount > 0;
        case 'pinned':
          return conv.isPinned;
        case 'archived':
          return conv.isArchived;
        default:
          return !conv.isArchived; // Show non-archived by default
      }
    });

    // Sort conversations
    return filtered.sort((a, b) => {
      // Pinned conversations first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then by last activity
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [conversations, searchQuery, filter]);

  // Get conversation display name
  const getConversationName = (conversation: Conversation) => {
    if (conversation.title) return conversation.title;
    
    if (conversation.isGroup) {
      return conversation.participants
        .filter(p => p.userId !== currentUserId)
        .map(p => p.name)
        .join(', ') || 'Group Chat';
    }
    
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.name || 'Unknown User';
  };

  // Get conversation avatar
  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.isGroup) {
      // For groups, show first participant's avatar or group icon
      const firstParticipant = conversation.participants.find(p => p.userId !== currentUserId);
      return firstParticipant?.avatar;
    }
    
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.avatar;
  };

  // Get online status
  const getOnlineStatus = (conversation: Conversation) => {
    if (conversation.isGroup) {
      return conversation.onlineCount || 0;
    }
    
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.isOnline || false;
  };

  // Format last message
  const formatLastMessage = (conversation: Conversation) => {
    if (conversation.typingUsers?.length) {
      const typingNames = conversation.typingUsers.map(u => u.name).join(', ');
      return `${typingNames} ${conversation.typingUsers.length === 1 ? 'is' : 'are'} typing...`;
    }

    if (!conversation.lastMessage) return 'No messages yet';

    const { lastMessage } = conversation;
    const isOwn = lastMessage.senderId === currentUserId;
    const prefix = isOwn ? 'You: ' : (conversation.isGroup ? `${lastMessage.senderName}: ` : '');

    switch (lastMessage.messageType) {
      case 'TEXT':
        return `${prefix}${lastMessage.content}`;
      case 'IMAGE':
        return `${prefix}📷 Photo`;
      case 'VIDEO':
        return `${prefix}🎥 Video`;
      case 'AUDIO':
        return `${prefix}🎵 Voice message`;
      case 'FILE':
        return `${prefix}📎 File`;
      case 'LOCATION':
        return `${prefix}📍 Location`;
      case 'STICKER':
        return `${prefix}😀 Sticker`;
      case 'GIF':
        return `${prefix}🎭 GIF`;
      default:
        return `${prefix}Message`;
    }
  };

  // Get message type icon
  const getMessageTypeIcon = (messageType?: string) => {
    switch (messageType) {
      case 'IMAGE':
        return <Camera className="w-3 h-3" />;
      case 'VIDEO':
        return <Video className="w-3 h-3" />;
      case 'AUDIO':
        return <Mic className="w-3 h-3" />;
      case 'FILE':
        return <File className="w-3 h-3" />;
      case 'LOCATION':
        return <MapPin className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-900", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'unread', 'pinned', 'archived'] as const).map((filterType) => (
            <Button
              key={filterType}
              size="sm"
              variant={filter === filterType ? "default" : "ghost"}
              onClick={() => setFilter(filterType)}
              className="text-xs"
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === 'unread' && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {conversations.filter(c => c.unreadCount > 0).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                currentUserId={currentUserId}
                isActive={conversation.id === activeConversationId}
                displayName={getConversationName(conversation)}
                avatarUrl={getConversationAvatar(conversation)}
                onlineStatus={getOnlineStatus(conversation)}
                lastMessage={formatLastMessage(conversation)}
                messageTypeIcon={getMessageTypeIcon(conversation.lastMessage?.messageType)}
                onSelect={() => onSelectConversation?.(conversation.id)}
                onArchive={() => onArchiveConversation?.(conversation.id)}
                onMute={() => onMuteConversation?.(conversation.id)}
                onPin={() => onPinConversation?.(conversation.id)}
                onDelete={() => onDeleteConversation?.(conversation.id)}
                onBlock={() => onBlockConversation?.(conversation.id)}
                onVideoCall={() => onVideoCall?.(conversation.id)}
                onVoiceCall={() => onVoiceCall?.(conversation.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Individual Conversation Item Component
interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
  displayName: string;
  avatarUrl?: string;
  onlineStatus: boolean | number;
  lastMessage: string;
  messageTypeIcon?: React.ReactNode;
  onSelect: () => void;
  onArchive: () => void;
  onMute: () => void;
  onPin: () => void;
  onDelete: () => void;
  onBlock: () => void;
  onVideoCall: () => void;
  onVoiceCall: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  displayName,
  avatarUrl,
  onlineStatus,
  lastMessage,
  messageTypeIcon,
  onSelect,
  onArchive,
  onMute,
  onPin,
  onDelete,
  onBlock,
  onVideoCall,
  onVoiceCall
}: ConversationItemProps) {
  const [showActions, setShowActions] = useState(false);
  
  const lastActivityTime = formatDistanceToNow(new Date(conversation.lastActivity), { 
    addSuffix: true 
  });

  const isTyping = conversation.typingUsers && conversation.typingUsers.length > 0;

  return (
    <div
      className={cn(
        "relative group rounded-lg p-3 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800",
        isActive && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>
              {conversation.isGroup ? (
                <Users className="w-6 h-6" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Online Status Indicator */}
          {!conversation.isGroup && onlineStatus && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
          )}
          
          {/* Group Online Count */}
          {conversation.isGroup && typeof onlineStatus === 'number' && onlineStatus > 0 && (
            <Badge className="absolute -bottom-1 -right-1 text-xs" variant="secondary">
              {onlineStatus}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-medium truncate",
                conversation.unreadCount > 0 && "font-semibold"
              )}>
                {displayName}
              </h3>
              {conversation.isPinned && <Pin className="w-3 h-3 text-gray-400" />}
              {conversation.isMuted && <VolumeX className="w-3 h-3 text-gray-400" />}
              {conversation.isGroup && <Users className="w-3 h-3 text-gray-400" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {lastActivityTime}
              </span>
              {conversation.unreadCount > 0 && (
                <Badge className="text-xs" variant="default">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {messageTypeIcon && (
              <span className="text-gray-400 flex-shrink-0">
                {messageTypeIcon}
              </span>
            )}
            <p className={cn(
              "text-sm truncate",
              isTyping ? "text-blue-500 italic" : "text-gray-600 dark:text-gray-300",
              conversation.unreadCount > 0 && !isTyping && "font-medium text-gray-900 dark:text-gray-100"
            )}>
              {lastMessage}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="flex items-center gap-1">
            {!conversation.isGroup && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVideoCall();
                        }}
                        className="w-8 h-8 p-0"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Video call</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVoiceCall();
                        }}
                        className="w-8 h-8 p-0"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Voice call</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { onPin(); }}>
                  <Pin className="w-4 h-4 mr-2" />
                  {conversation.isPinned ? 'Unpin' : 'Pin'} conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onMute(); }}>
                  <VolumeX className="w-4 h-4 mr-2" />
                  {conversation.isMuted ? 'Unmute' : 'Mute'} notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onArchive(); }}>
                  <Archive className="w-4 h-4 mr-2" />
                  {conversation.isArchived ? 'Unarchive' : 'Archive'} conversation
                </DropdownMenuItem>
                {!conversation.isGroup && (
                  <DropdownMenuItem onClick={() => { onBlock(); }}>
                    <Users className="w-4 h-4 mr-2" />
                    {conversation.isBlocked ? 'Unblock' : 'Block'} user
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => { onDelete(); }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
