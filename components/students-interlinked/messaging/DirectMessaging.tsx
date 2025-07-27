'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image, Smile, MoreVertical, Search, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  isRead: boolean;
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    username: string;
    image?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage: Message;
  unreadCount: number;
  isTyping: boolean;
}

interface DirectMessagingProps {
  currentUserId: string;
  initialConversations?: Conversation[];
  selectedConversationId?: string;
  className?: string;
}

export default function DirectMessaging({
  currentUserId,
  initialConversations = [],
  selectedConversationId,
  className
}: DirectMessagingProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(selectedConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data
  useEffect(() => {
    if (initialConversations.length === 0) {
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participant: {
            id: '2',
            name: 'Sarah Chen',
            username: 'sarahc',
            image: '/api/placeholder/40/40',
            isOnline: true
          },
          lastMessage: {
            id: '1',
            content: 'Hey! Did you understand the calculus problem from today?',
            senderId: '2',
            receiverId: currentUserId,
            timestamp: '2024-06-14T10:30:00Z',
            type: 'text',
            isRead: false
          },
          unreadCount: 2,
          isTyping: false
        },
        {
          id: '2',
          participant: {
            id: '3',
            name: 'Alex Rodriguez',
            username: 'alexr',
            image: '/api/placeholder/40/40',
            isOnline: false,
            lastSeen: '2024-06-14T08:15:00Z'
          },
          lastMessage: {
            id: '2',
            content: 'Thanks for the study notes! 📚',
            senderId: '3',
            receiverId: currentUserId,
            timestamp: '2024-06-13T18:45:00Z',
            type: 'text',
            isRead: true
          },
          unreadCount: 0,
          isTyping: false
        }
      ];
      setConversations(mockConversations);
    }
  }, [initialConversations, currentUserId]);

  // Mock messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'Hey! Did you understand the calculus problem from today?',
          senderId: '2',
          receiverId: currentUserId,
          timestamp: '2024-06-14T10:30:00Z',
          type: 'text',
          isRead: false
        },
        {
          id: '2',
          content: 'Which one? The integration by parts?',
          senderId: currentUserId,
          receiverId: '2',
          timestamp: '2024-06-14T10:32:00Z',
          type: 'text',
          isRead: true
        },
        {
          id: '3',
          content: 'Yes! I keep getting confused with the formula',
          senderId: '2',
          receiverId: currentUserId,
          timestamp: '2024-06-14T10:33:00Z',
          type: 'text',
          isRead: false
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: currentUserId,
      receiverId: conversations.find(c => c.id === selectedConversation)?.participant.id || '',
      timestamp: new Date().toISOString(),
      type: 'text',
      isRead: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Update conversation's last message
    setConversations(prev => prev.map(conv =>
      conv.id === selectedConversation
        ? { ...conv, lastMessage: message }
        : conv
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className={cn("flex h-[600px] border rounded-lg overflow-hidden", className)}>
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-muted/20">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                selectedConversation === conversation.id && "bg-muted"
              )}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.participant.image} />
                    <AvatarFallback>
                      {conversation.participant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.participant.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate">
                      {conversation.participant.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 rounded-full p-0 text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {conversation.isTyping ? (
                      <span className="text-blue-600 italic">Typing...</span>
                    ) : (
                      conversation.lastMessage.content
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConv.participant.image} />
                      <AvatarFallback>
                        {selectedConv.participant.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {selectedConv.participant.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">{selectedConv.participant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConv.participant.isOnline ? (
                        'Online'
                      ) : (
                        `Last seen ${formatTime(selectedConv.participant.lastSeen || '')}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                      <DropdownMenuItem>Clear Chat</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Block User</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.senderId === currentUserId ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2",
                      message.senderId === currentUserId
                        ? "bg-blue-600 text-white"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      message.senderId === currentUserId ? "text-blue-100" : "text-muted-foreground"
                    )}>
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Image className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="resize-none"
                  />
                </div>

                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>

                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,application/*"
            />
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
