'use client';

// ==========================================
// MESSAGE INPUT COMPONENT
// ==========================================
// Facebook-style message input with all features

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Send,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Video,
  Mic,
  MapPin,
  Gift,
  Plus,
  X,
  Play,
  Pause,
  Square,
  File,
  Camera,
  Clock,
  AlarmClock,
  Calendar,
  MoreHorizontal,
  Reply,
  Edit3,
  Type,
  Bold,
  Italic,
  Underline,
  Link
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: MessageData) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowFileUpload?: boolean;
  allowVoiceMessage?: boolean;
  allowScheduling?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    messageType: string;
  };
  onCancelReply?: () => void;
  editMessage?: {
    id: string;
    content: string;
  };
  onCancelEdit?: () => void;
  typingUsers?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  className?: string;
}

interface MessageData {
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'STICKER' | 'GIF';
  mediaFiles?: File[];
  replyToId?: string;
  scheduledFor?: Date;
  mentions?: string[];
  formatting?: {
    bold?: number[][];
    italic?: number[][];
    underline?: number[][];
    links?: Array<{ text: string; url: string; start: number; end: number }>;
  };
}

interface MediaAttachment {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  progress?: number;
}

const EMOJI_SHORTCUTS = {
  ':)': '😊',
  ':D': '😃',
  ':(': '😞',
  ':P': '😛',
  '<3': '❤️',
  ':thumbsup:': '👍',
  ':fire:': '🔥',
  ':100:': '💯'
};

const STICKERS = [
  { id: '1', url: '/stickers/thumbs-up.png', name: 'Thumbs Up' },
  { id: '2', url: '/stickers/heart.png', name: 'Heart' },
  { id: '3', url: '/stickers/laughing.png', name: 'Laughing' },
  { id: '4', url: '/stickers/surprised.png', name: 'Surprised' },
];

export function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  allowFileUpload = true,
  allowVoiceMessage = true,
  allowScheduling = false,
  replyTo,
  onCancelReply,
  editMessage,
  onCancelEdit,
  typingUsers = [],
  className
}: MessageInputProps) {
  const [content, setContent] = useState(editMessage?.content || '');
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 3000);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Handle content change
  const handleContentChange = (value: string) => {
    if (value.length <= maxLength) {
      setContent(value);
      handleTypingStart();
      
      // Auto-replace emoji shortcuts
      let processedValue = value;
      Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
        processedValue = processedValue.replace(new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
      });
      
      if (processedValue !== value) {
        setContent(processedValue);
      }

      // Handle mentions
      const mentionMatch = value.match(/@(\w*)$/);
      if (mentionMatch) {
        setShowMentions(true);
        // In a real app, you'd search for users here
        setMentionSuggestions(['John Doe', 'Jane Smith', 'Bob Wilson']);
      } else {
        setShowMentions(false);
      }
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || !allowFileUpload) return;

    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);
      
      let type: 'image' | 'video' | 'audio' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const attachment: MediaAttachment = {
        id,
        file,
        url,
        type,
        progress: 0
      };

      setMediaAttachments(prev => [...prev, attachment]);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setMediaAttachments(prev => 
          prev.map(att => 
            att.id === id 
              ? { ...att, progress: Math.min((att.progress || 0) + 10, 100) }
              : att
          )
        );
      }, 100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setMediaAttachments(prev => 
          prev.map(att => 
            att.id === id 
              ? { ...att, progress: 100 }
              : att
          )
        );
      }, 1000);
    });
  }, [allowFileUpload]);

  // Handle voice recording
  const startRecording = async () => {
    if (!allowVoiceMessage) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        
        // Create a file-like object and handle it directly
        const audioFile = {
          name: `voice-${Date.now()}.wav`,
          type: 'audio/wav',
          size: blob.size,
          lastModified: Date.now(),
          stream: () => blob.stream(),
          arrayBuffer: () => blob.arrayBuffer(),
          text: () => blob.text(),
          slice: (start?: number, end?: number, contentType?: string) => blob.slice(start, end, contentType)
        } as File;
        
        // Handle the file directly instead of using FileList
        const id = Math.random().toString(36).substr(2, 9);
        const url = URL.createObjectURL(blob);        setMediaAttachments(prev => [...prev, {
          id,
          file: audioFile,
          url,
          type: 'audio' as const
        }]);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if ((!content.trim() && mediaAttachments.length === 0) || disabled) return;

    const messageData: MessageData = {
      content: content.trim(),
      messageType: mediaAttachments.length > 0 
        ? (mediaAttachments[0].type.toUpperCase() as any)
        : 'TEXT',
      mediaFiles: mediaAttachments.map(att => att.file),
      replyToId: replyTo?.id,
      scheduledFor: scheduledDate || undefined,
      mentions: extractMentions(content)
    };

    onSendMessage(messageData);

    // Reset form
    setContent('');
    setMediaAttachments([]);
    setScheduledDate(null);
    setShowScheduler(false);
    onCancelReply?.();
    onCancelEdit?.();

    // Stop typing
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }

    // Focus back to input
    textareaRef.current?.focus();
  };

  // Extract mentions from content
  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@(\w+)/g);
    return mentions ? mentions.map(m => m.substring(1)) : [];
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900", className)}>
      {/* Reply/Edit Preview */}
      {(replyTo || editMessage) && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {replyTo ? (
                <>
                  <Reply className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Replying to <strong>{replyTo.senderName}</strong>
                  </span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Editing message
                  </span>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={replyTo ? onCancelReply : onCancelEdit}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            {replyTo ? replyTo.content : editMessage?.content}
          </div>
        </div>
      )}

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {typingUsers.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="w-6 h-6 border-2 border-white dark:border-gray-900">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
              }
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      )}

      {/* Media Attachments Preview */}
      {mediaAttachments.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {mediaAttachments.map((attachment) => (
              <div key={attachment.id} className="relative">
                <Card className="p-2 w-24 h-24">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt="Attachment"
                      className="w-full h-full object-cover rounded"
                    />
                  ) : attachment.type === 'video' ? (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <Video className="w-8 h-8 text-gray-500" />
                    </div>
                  ) : attachment.type === 'audio' ? (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <Mic className="w-8 h-8 text-gray-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <File className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  
                  {/* Progress indicator */}
                  {attachment.progress !== undefined && attachment.progress < 100 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                      <Progress value={attachment.progress} className="w-16" />
                    </div>
                  )}

                  {/* Remove button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                    onClick={() => {
                      setMediaAttachments(prev => prev.filter(att => att.id !== attachment.id));
                      URL.revokeObjectURL(attachment.url);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Card>
                
                {/* File info */}
                <div className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400 truncate max-w-24">
                  {attachment.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Message Indicator */}
      {scheduledDate && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Scheduled for {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString()}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setScheduledDate(null);
                setShowScheduler(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* Voice Recording */}
          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Recording</span>
                <span className="text-sm">{formatRecordingTime(recordingTime)}</span>
              </div>
              <div className="flex-1"></div>
              <Button size="sm" variant="ghost" onClick={stopRecording}>
                <Square className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Attachment Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={disabled}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Photos & Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      handleFileUpload(files);
                    };
                    input.click();
                  }}>
                    <File className="w-4 h-4 mr-2" />
                    Files
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                  </DropdownMenuItem>
                  {allowScheduling && (
                    <DropdownMenuItem onClick={() => setShowScheduler(true)}>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Message
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Text Input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="min-h-[44px] max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 pr-20"
                  rows={1}
                />
                
                {/* Character Count */}
                {content.length > maxLength * 0.8 && (
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                    {content.length}/{maxLength}
                  </div>
                )}

                {/* Mention Suggestions */}
                {showMentions && mentionSuggestions.length > 0 && (
                  <Card className="absolute bottom-full left-0 right-0 mb-2 p-2 shadow-lg">
                    {mentionSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          const newContent = content.replace(/@\w*$/, `@${suggestion} `);
                          setContent(newContent);
                          setShowMentions(false);
                        }}
                      >
                        @{suggestion}
                      </Button>
                    ))}
                  </Card>
                )}
              </div>

              {/* Emoji & Stickers */}
              <div className="flex items-center gap-1">
                <Popover open={showStickers} onOpenChange={setShowStickers}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" disabled={disabled}>
                      <Gift className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" side="top">
                    <div className="grid grid-cols-4 gap-2">
                      {STICKERS.map((sticker) => (
                        <Button
                          key={sticker.id}
                          variant="ghost"
                          className="p-2 h-auto"
                          onClick={() => {
                            // Handle sticker send
                            setShowStickers(false);
                          }}
                        >
                          <img src={sticker.url} alt={sticker.name} className="w-8 h-8" />
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" disabled={disabled}>
                      <Smile className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" side="top">
                    <div className="grid grid-cols-8 gap-1">
                      {['😊', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🎉', '🔥', '💯', '👏', '🙏', '💪', '🎯', '⭐'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-lg"
                          onClick={() => {
                            setContent(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Voice Message */}
              {allowVoiceMessage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        className="active:bg-red-100 dark:active:bg-red-900"
                      >
                        <Mic className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Hold to record voice message</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}

          {/* Send Button */}
          {!isRecording && (
            <Button
              onClick={handleSendMessage}
              disabled={(!content.trim() && mediaAttachments.length === 0) || disabled}
              size="sm"
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Schedule Message Dialog */}
      {showScheduler && (
        <Card className="absolute bottom-full left-4 right-4 mb-2 p-4 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Schedule Message</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowScheduler(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const date = new Date();
                  date.setHours(date.getHours() + 1);
                  setScheduledDate(date);
                  setShowScheduler(false);
                }}
              >
                <Clock className="w-4 h-4 mr-2" />
                1 Hour
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + 1);
                  setScheduledDate(date);
                  setShowScheduler(false);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Tomorrow
              </Button>
            </div>
            
            <div>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setScheduledDate(date);
                  setShowScheduler(false);
                }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
