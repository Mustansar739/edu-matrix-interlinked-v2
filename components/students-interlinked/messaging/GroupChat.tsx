'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, Settings, UserPlus, Search, MoreVertical, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface GroupMessage {
  id: string;
  content: string;
  senderId: string;
  groupId: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  sender: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
}

interface GroupMember {
  id: string;
  name: string;
  username: string;
  image?: string;
  role: 'admin' | 'moderator' | 'member';
  isOnline: boolean;
  joinedAt: string;
}

interface StudyGroupChat {
  id: string;
  name: string;
  description: string;
  image?: string;
  members: GroupMember[];
  memberCount: number;
  isPrivate: boolean;
  educationalContext?: {
    subject?: string;
    course?: string;
    level?: string;
  };
}

interface GroupChatProps {
  currentUserId: string;
  group: StudyGroupChat;
  className?: string;
}

export default function GroupChat({
  currentUserId,
  group,
  className
}: GroupChatProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock messages
  useEffect(() => {
    const mockMessages: GroupMessage[] = [
      {
        id: '1',
        content: 'Welcome to the Calculus study group! 📚',
        senderId: 'system',
        groupId: group.id,
        timestamp: '2024-06-14T09:00:00Z',
        type: 'system',
        sender: {
          id: 'system',
          name: 'System',
          username: 'system'
        }
      },
      {
        id: '2',
        content: 'Hey everyone! Ready for tomorrow\'s exam?',
        senderId: '2',
        groupId: group.id,
        timestamp: '2024-06-14T10:30:00Z',
        type: 'text',
        sender: {
          id: '2',
          name: 'Sarah Chen',
          username: 'sarahc',
          image: '/api/placeholder/32/32'
        }
      },
      {
        id: '3',
        content: 'I\'m still struggling with integration by parts 😅',
        senderId: '3',
        groupId: group.id,
        timestamp: '2024-06-14T10:32:00Z',
        type: 'text',
        sender: {
          id: '3',
          name: 'Alex Rodriguez',
          username: 'alexr',
          image: '/api/placeholder/32/32'
        }
      },
      {
        id: '4',
        content: 'Let me explain it! The formula is ∫u dv = uv - ∫v du',
        senderId: currentUserId,
        groupId: group.id,
        timestamp: '2024-06-14T10:35:00Z',
        type: 'text',
        sender: {
          id: currentUserId,
          name: 'You',
          username: 'you'
        }
      }
    ];
    setMessages(mockMessages);
  }, [group.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: GroupMessage = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: currentUserId,
      groupId: group.id,
      timestamp: new Date().toISOString(),
      type: 'text',
      sender: {
        id: currentUserId,
        name: 'You',
        username: 'you'
      }
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredMembers = group.members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-600" />;
      case 'moderator':
        return <Settings className="h-3 w-3 text-blue-600" />;
      default:
        return null;
    }
  };

  const currentUserRole = group.members.find(m => m.id === currentUserId)?.role || 'member';

  return (
    <div className={cn("flex h-[600px] border rounded-lg overflow-hidden", className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Group Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={group.image} />
                <AvatarFallback>
                  <Users className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {group.name}
                  {group.isPrivate && (
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {group.memberCount} members
                  {group.educationalContext?.subject && ` • ${group.educationalContext.subject}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMembers(!showMembers)}
              >
                <Users className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Group Info</DropdownMenuItem>
                  <DropdownMenuItem>Search Messages</DropdownMenuItem>
                  <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                  {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
                    <>
                      <DropdownMenuItem>Manage Members</DropdownMenuItem>
                      <DropdownMenuItem>Group Settings</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem className="text-red-600">Leave Group</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.type === 'system' ? (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {message.content}
                    </Badge>
                  </div>
                ) : (
                  <div className={cn(
                    "flex gap-3",
                    message.senderId === currentUserId && "flex-row-reverse"
                  )}>
                    {message.senderId !== currentUserId && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.image} />
                        <AvatarFallback className="text-xs">
                          {message.sender.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      message.senderId === currentUserId && "flex flex-col items-end"
                    )}>
                      {message.senderId !== currentUserId && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{message.sender.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <div className={cn(
                        "rounded-lg px-3 py-2",
                        message.senderId === currentUserId
                          ? "bg-blue-600 text-white"
                          : "bg-muted"
                      )}>
                        <p className="text-sm">{message.content}</p>
                        {message.senderId === currentUserId && (
                          <p className="text-xs mt-1 text-blue-100">
                            {formatTime(message.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${group.name}...`}
              />
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="w-80 border-l bg-muted/20">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Members ({group.memberCount})</h3>
              {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
                <Button variant="ghost" size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {member.name}
                      </span>
                      {getRoleIcon(member.role)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{member.username}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      {(currentUserRole === 'admin' || currentUserRole === 'moderator') && member.role === 'member' && (
                        <>
                          <DropdownMenuItem>Make Moderator</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Remove from Group</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
