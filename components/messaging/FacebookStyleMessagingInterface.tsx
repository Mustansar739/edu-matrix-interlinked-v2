'use client';

// ==========================================
// FACEBOOK-STYLE MESSAGING INTERFACE
// ==========================================
// Modern, responsive messaging interface with Facebook Messenger styling

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ConversationList } from './ConversationList';
import { FacebookStyleMessageBubble } from './FacebookStyleMessageBubble';
import { MessageInput } from './MessageInput';
import { VoiceCallInterface } from './VoiceCallInterface';
import { VideoCallInterface } from './VideoCallInterface';
import { MediaViewer } from './MediaViewer';
import { SearchInterface } from './SearchInterface';
import { ChatThemes } from './ChatThemes';
import { UserInfo } from './UserInfo';
import { useAdvancedMessaging } from '@/hooks/messaging/useAdvancedMessaging';
import type { Message, Conversation } from '@/hooks/messaging/useAdvancedMessaging';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Users,
  Settings,
  Archive,
  Pin,
  VolumeX,
  Trash2,
  Star,
  ArrowLeft,
  Menu,
  Maximize2,
  Minimize2,
  X,
  Shield,
  Palette,
  Plus,
  Smile
} from 'lucide-react';

export function FacebookStyleMessagingInterface({ initialConversationId }: { initialConversationId?: string | null }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const {
    conversations,
    messages,
    activeConversation,
    searchResults,
    callState,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    forwardMessage,
    pinMessage,
    archiveConversation,
    muteConversation,
    blockConversation,
    setActiveConversation,
    searchMessages,
    startCall,
    endCall,
    setTyping,
    markAsRead,
    onlineUsers,
    typingUsers
  } = useAdvancedMessaging(initialConversationId || '');

  // UI State
  const [showSearch, setShowSearch] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showMobileConversations, setShowMobileConversations] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('default');
  
  // Message State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  
  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatHeaderRef = useRef<HTMLDivElement>(null);
  
  // Current user and conversation data
  const currentUserId = session?.user?.id || '';
  const currentMessages = activeConversation ? messages[activeConversation.id] || [] : [];

  // Effects
  useEffect(() => {
    if (activeConversation && currentMessages.length > 0) {
      // Mark messages as read
      markAsRead(activeConversation.id, [session?.user?.id || '']);
      
      // Scroll to bottom
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [activeConversation, currentMessages, markAsRead]);

  // Event Handlers
  const handleSendMessage = async (messageData: any) => {
    if (!activeConversation) return;

    try {
      await sendMessage(activeConversation.id, messageData);
      setReplyingTo(null);
      setEditingMessage(null);
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      setEditingMessage(null);
      toast({
        title: "Message updated",
        description: "Your message has been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to update message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: "Message deleted",
        description: "The message has been removed.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = currentMessages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(r => r.emoji === emoji && r.userReacted);
      
      if (existingReaction) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      toast({
        title: "Failed to add reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVoiceCall = async (conversationId: string) => {
    try {
      await startCall(conversationId, 'voice');
    } catch (error) {
      toast({
        title: "Failed to start call",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVideoCall = async (conversationId: string) => {
    try {
      await startCall(conversationId, 'video');
    } catch (error) {
      toast({
        title: "Failed to start call",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get conversation display info
  const getConversationDisplayInfo = (conversation: Conversation) => {
    if (conversation.isGroup) {
      return {
        name: conversation.title || 'Group Chat',
        subtitle: `${conversation.participants.length} members`,
        avatar: conversation.participants[0]?.avatar,
        isOnline: conversation.participants.some(p => 
          p.userId !== currentUserId && onlineUsers[p.userId]
        )
      };
    } else {
      const otherUser = conversation.participants.find(p => p.userId !== currentUserId);
      return {
        name: otherUser?.name || 'Unknown User',
        subtitle: onlineUsers[otherUser?.userId || ''] ? 'Active now' : 
                  otherUser?.lastSeen ? `Last seen ${otherUser.lastSeen}` : 'Offline',
        avatar: otherUser?.avatar,
        isOnline: onlineUsers[otherUser?.userId || ''] || false
      };
    }
  };

  const conversationInfo = activeConversation ? getConversationDisplayInfo(activeConversation) : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "h-full flex bg-gray-50 dark:bg-gray-900 transition-all duration-300",
        isFullscreen && "fixed inset-0 z-50"
      )}>
        {/* Conversations Sidebar */}
        <div className={cn(
          "w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0",
          "md:flex md:flex-col",
          showMobileConversations ? "flex flex-col" : "hidden md:flex"
        )}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full">
                  <Plus className="w-5 h-5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 dark:bg-gray-700 border-none rounded-full focus:ring-2 focus:ring-blue-500 h-10"
              />
            </div>
          </div>

          <ConversationList
            conversations={conversations.map(conv => ({
              ...conv,
              lastMessage: conv.lastMessage ? {
                ...conv.lastMessage,
                senderName: conv.lastMessage.senderName || 'Unknown User'
              } : undefined
            }))}
            currentUserId={currentUserId}
            activeConversationId={activeConversation?.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectConversation={(id) => {
              const conversation = conversations.find(c => c.id === id);
              if (conversation) {
                setActiveConversation(conversation);
                setShowMobileConversations(false);
              }
            }}
            onArchiveConversation={archiveConversation}
            onMuteConversation={muteConversation}
            onPinConversation={(id) => {
              const conversation = conversations.find(c => c.id === id);
              if (conversation) {
                // Toggle pin status
              }
            }}
            onDeleteConversation={(id) => {
              // Handle delete conversation
            }}
            onBlockConversation={blockConversation}
            onVideoCall={handleVideoCall}
            onVoiceCall={handleVoiceCall}
            className="flex-1"
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div ref={chatHeaderRef} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile back button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      onClick={() => setShowMobileConversations(true)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>

                    {/* Conversation Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-gray-800">
                          <AvatarImage src={conversationInfo?.avatar} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                            {activeConversation.isGroup ? (
                              <Users className="w-5 h-5" />
                            ) : (
                              conversationInfo?.name?.charAt(0) || 'U'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {conversationInfo?.isOnline && !activeConversation.isGroup && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                          {conversationInfo?.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {conversationInfo?.subtitle}
                          </p>
                          {activeConversation.isEncrypted && (
                            <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                          )}
                          {activeConversation.isMuted && (
                            <VolumeX className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      onClick={() => setShowSearch(!showSearch)}
                    >
                      <Search className="w-5 h-5 text-blue-500" />
                    </Button>

                    {!activeConversation.isGroup && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          onClick={() => handleVoiceCall(activeConversation.id)}
                        >
                          <Phone className="w-5 h-5 text-blue-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          onClick={() => handleVideoCall(activeConversation.id)}
                        >
                          <Video className="w-5 h-5 text-blue-500" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      onClick={() => setShowUserInfo(!showUserInfo)}
                    >
                      <Info className="w-5 h-5 text-blue-500" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setShowThemes(true)}>
                          <Palette className="w-4 h-4 mr-2" />
                          Change Theme
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveConversation(activeConversation.id)}>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => muteConversation(activeConversation.id)}>
                          <VolumeX className="w-4 h-4 mr-2" />
                          {activeConversation.isMuted ? 'Unmute' : 'Mute'} Notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                          {isFullscreen ? (
                            <>
                              <Minimize2 className="w-4 h-4 mr-2" />
                              Exit Fullscreen
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-4 h-4 mr-2" />
                              Fullscreen
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Search Interface */}
              {showSearch && (
                <SearchInterface
                  conversationId={activeConversation.id}
                  onClose={() => setShowSearch(false)}
                  onMessageSelect={(messageId) => {
                    // Scroll to message
                    const messageElement = document.getElementById(`message-${messageId}`);
                    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                />
              )}

              {/* Messages Area */}
              <ScrollArea className="flex-1 bg-gray-50 dark:bg-gray-900" ref={messagesContainerRef}>
                <div className="p-4 space-y-2">
                  {currentMessages.map((message, index) => {
                    const prevMessage = currentMessages[index - 1];
                    const showAvatar = !prevMessage || 
                      prevMessage.senderId !== message.senderId ||
                      new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000; // 5 minutes

                    return (
                      <div key={message.id} id={`message-${message.id}`}>
                        <FacebookStyleMessageBubble
                          message={message}
                          currentUserId={currentUserId}
                          showAvatar={showAvatar}
                          showSender={activeConversation.isGroup}
                          isGroupChat={activeConversation.isGroup}
                          onReaction={handleReaction}
                          onReply={(messageId: string) => {
                            const msg = currentMessages.find(m => m.id === messageId);
                            if (msg) setReplyingTo(msg);
                          }}
                          onForward={(messageId: string) => {
                            const msg = currentMessages.find(m => m.id === messageId);
                            if (msg) setForwardingMessage(msg);
                          }}
                          onEdit={(messageId: string, newContent: string) => handleEditMessage(messageId, newContent)}
                          onDelete={handleDeleteMessage}
                          onPin={() => {}}
                          onCopy={(content: string) => {
                            navigator.clipboard.writeText(content);
                            toast({
                              title: "Copied to clipboard",
                              description: "Message text has been copied.",
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {typingUsers[activeConversation.id] && typingUsers[activeConversation.id].length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {typingUsers[activeConversation.id].length === 1
                          ? `${typingUsers[activeConversation.id][0].name} is typing...`
                          : `${typingUsers[activeConversation.id].length} people are typing...`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTypingStart={() => setTyping(activeConversation.id, true)}
                  onTypingStop={() => setTyping(activeConversation.id, false)}
                  replyTo={replyingTo ? {
                    id: replyingTo.id,
                    content: replyingTo.content || '',
                    senderName: replyingTo.senderName || 'Unknown',
                    messageType: replyingTo.messageType
                  } : undefined}
                  onCancelReply={() => setReplyingTo(null)}
                  editMessage={editingMessage ? {
                    id: editingMessage.id,
                    content: editingMessage.content || ''
                  } : undefined}
                  onCancelEdit={() => setEditingMessage(null)}
                  typingUsers={typingUsers[activeConversation.id] || []}
                  disabled={activeConversation.isBlocked}
                />
              </div>
            </>
          ) : (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center max-w-md">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Select a conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Choose a conversation from the sidebar to start messaging with your friends and contacts.
                </p>
                <Button
                  className="md:hidden bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full"
                  onClick={() => setShowMobileConversations(true)}
                >
                  <Menu className="w-4 h-4 mr-2" />
                  View Conversations
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Info Sidebar */}
        {showUserInfo && activeConversation && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <UserInfo
              conversation={activeConversation}
              currentUserId={currentUserId}
              onClose={() => setShowUserInfo(false)}
              onBlock={() => blockConversation(activeConversation.id)}
              onMute={() => muteConversation(activeConversation.id)}
              onArchive={() => archiveConversation(activeConversation.id)}
            />
          </div>
        )}

        {/* Mobile Conversations Sheet */}
        <Sheet open={showMobileConversations} onOpenChange={setShowMobileConversations}>
          <SheetContent side="left" className="p-0 w-80">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Mobile Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowMobileConversations(false)}
                    className="p-2 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-100 dark:bg-gray-700 border-none rounded-full"
                  />
                </div>
              </div>
              
              <ConversationList
                conversations={conversations.map(conv => ({
                  ...conv,
                  lastMessage: conv.lastMessage ? {
                    ...conv.lastMessage,
                    senderName: conv.lastMessage.senderName || 'Unknown User'
                  } : undefined
                }))}
                currentUserId={currentUserId}
                activeConversationId={activeConversation?.id}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectConversation={(id) => {
                  const conversation = conversations.find(c => c.id === id);
                  if (conversation) {
                    setActiveConversation(conversation);
                    setShowMobileConversations(false);
                  }
                }}
                onArchiveConversation={archiveConversation}
                onMuteConversation={muteConversation}
                onPinConversation={() => {}}
                onDeleteConversation={() => {}}
                onBlockConversation={blockConversation}
                onVideoCall={handleVideoCall}
                onVoiceCall={handleVoiceCall}
                className="flex-1"
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialogs and Modals */}
        {/* Chat Themes Dialog */}
        <Dialog open={showThemes} onOpenChange={setShowThemes}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose Theme</DialogTitle>
            </DialogHeader>
            <ChatThemes
              selectedTheme={selectedTheme}
              onThemeSelect={setSelectedTheme}
              onClose={() => setShowThemes(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Call Interfaces */}
        {callState.isActive && callState.type === 'voice' && (
          <VoiceCallInterface
            callState={callState}
            onEndCall={endCall}
            onMute={() => {}}
            onSpeaker={() => {}}
          />
        )}

        {callState.isActive && callState.type === 'video' && (
          <VideoCallInterface
            callState={callState}
            onEndCall={endCall}
            onMute={() => {}}
            onVideoToggle={() => {}}
            onScreenShare={() => {}}
          />
        )}

        {/* Media Viewer */}
        {selectedMedia && (
          <MediaViewer
            media={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            onDownload={() => {}}
            onShare={() => {}}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
