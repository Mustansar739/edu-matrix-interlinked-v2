'use client';

// ==========================================
// FACEBOOK-STYLE MESSAGE BUBBLE COMPONENT
// ==========================================
// Modern message bubble with Facebook Messenger styling

import React, { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Edit,
  Trash2,
  Pin,
  Smile,
  Download,
  Share,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageCircle,
  Image as ImageIcon,
  Video as VideoIcon,
  File as FileIcon,
  Mic as MicIcon,
  MapPin,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
  Meh
} from 'lucide-react';
import type { Message } from '@/hooks/messaging/useAdvancedMessaging';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  showAvatar?: boolean;
  showSender?: boolean;
  isGroupChat?: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  className?: string;
}

const REACTION_EMOJIS = [
  { emoji: '👍', name: 'thumbs-up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😡', name: 'angry' },
];

export function FacebookStyleMessageBubble({
  message,
  currentUserId,
  showAvatar = true,
  showSender = true,
  isGroupChat = false,
  onReaction,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  className
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const messageRef = useRef<HTMLDivElement>(null);

  const isOwn = message.senderId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

  const handleReaction = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setShowReactions(false);
  };

  const handleEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content || '');
    }
  };

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="w-full">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleEdit} className="text-xs">
              Save
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsEditing(false);
                setEditContent(message.content || '');
              }}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    switch (message.messageType) {
      case 'TEXT':
        return (
          <div className="space-y-1">
            {message.replyTo && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 border-l-4 border-blue-500 text-sm">
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {message.replyTo.senderName}
                </div>
                <div className="text-gray-600 dark:text-gray-300 truncate">
                  {message.replyTo.content}
                </div>
              </div>
            )}
            
            {message.isForwarded && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
                <Forward className="w-3 h-3" />
                Forwarded {message.forwardedFrom && `from ${message.forwardedFrom}`}
              </div>
            )}
            
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </div>
            
            {message.isEdited && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                edited
              </div>
            )}
          </div>
        );

      case 'IMAGE':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {message.mediaUrls?.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt="Shared image"
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      // Handle image preview
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                </div>
              ))}
            </div>
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        );

      case 'VIDEO':
        return (
          <div className="space-y-2">
            <div className="relative max-w-sm">
              <video
                src={message.mediaUrls?.[0]}
                controls
                className="w-full rounded-lg"
                poster={message.mediaMetadata?.thumbnail}
              />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                <VideoIcon className="w-3 h-3 inline mr-1" />
                Video
              </div>
            </div>
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        );

      case 'AUDIO':
        return (
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-sm">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <MicIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Voice Message</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {message.mediaMetadata?.duration || '0:00'}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="p-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 5v10l7-5-7-5z" />
              </svg>
            </Button>
          </div>
        );

      case 'FILE':
        return (
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-sm">
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {message.mediaMetadata?.fileName || 'File'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {message.mediaMetadata?.fileSize || 'Unknown size'}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="p-2">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        );

      case 'LOCATION':
        return (
          <div className="space-y-2">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="font-medium text-sm">Location</span>
              </div>
              <div className="h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-500" />
              </div>
              {message.mediaMetadata?.address && (
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                  {message.mediaMetadata.address}
                </div>
              )}
            </div>
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm">
            {message.content || 'Unsupported message type'}
          </div>
        );
    }
  };

  const renderMessageStatus = () => {
    if (!isOwn) return null;

    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timeAgo}
        </span>
        {message.isRead ? (
          <CheckCheck className="w-3 h-3 text-blue-500" />
        ) : message.isDelivered ? (
          <CheckCheck className="w-3 h-3 text-gray-400" />
        ) : (
          <Clock className="w-3 h-3 text-gray-400" />
        )}
      </div>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <div className="flex items-center gap-1 mt-1">
        {message.reactions.map((reaction, index) => (
          <button
            key={`${reaction.emoji}-${index}`}
            onClick={() => handleReaction(reaction.emoji)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
              reaction.userReacted
                ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        "group relative flex gap-2 mb-1 transition-all duration-200",
        isOwn ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.senderAvatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold">
              {message.senderName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-xs md:max-w-md lg:max-w-lg",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Sender Name */}
        {showSender && !isOwn && isGroupChat && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 px-1">
            {message.senderName}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative px-4 py-2 rounded-2xl shadow-sm transition-all duration-200",
            isOwn
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md",
            "group-hover:shadow-md"
          )}
        >
          {/* Pinned indicator */}
          {message.isPinned && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Pin className="w-2 h-2 text-white" />
            </div>
          )}

          {renderMessageContent()}

          {/* Quick reactions */}
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              {REACTION_EMOJIS.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={() => handleReaction(reaction.emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}

          {/* Message actions */}
          <div className={cn(
            "absolute top-0 flex items-center gap-1 transition-all duration-200",
            isOwn ? "-left-16" : "-right-16",
            "opacity-0 group-hover:opacity-100"
          )}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full"
                    onClick={() => setShowReactions(!showReactions)}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>React</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full"
                    onClick={() => onReply?.(message.id)}
                  >
                    <Reply className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reply</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onForward?.(message.id)}>
                  <Forward className="w-4 h-4 mr-2" />
                  Forward
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCopy?.(message.content || '')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                  <Pin className="w-4 h-4 mr-2" />
                  {message.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(message.id)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reactions */}
        {renderReactions()}

        {/* Message Status */}
        {renderMessageStatus()}
      </div>
    </div>
  );
}
