'use client';

// ==========================================
// ADVANCED MESSAGING HOOK
// ==========================================
// Complete hook for Facebook-style messaging with all features

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../../lib/socket/socket-context-clean';
import type { Socket } from 'socket.io-client';

export interface Message {
  id: string;
  content: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'STICKER' | 'GIF';
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isEdited?: boolean;
  editedAt?: string | Date;
  mediaUrls?: string[];
  mediaMetadata?: any;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    messageType: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string }>;
    userReacted?: boolean;
  }>;
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  isDelivered?: boolean;
  isRead?: boolean;
  isPinned?: boolean;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  mentions?: string[];
  isForwarded?: boolean;
  forwardedFrom?: string;
  threadCount?: number;
  lastThreadMessage?: any;
}

export interface Conversation {
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
  }>;
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: string | Date;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isBlocked?: boolean;
  isEncrypted?: boolean;
  theme?: string;
  wallpaper?: string;
  customSettings?: {
    messageTimer?: number;
    allowNotifications?: boolean;
    allowMessageRequests?: boolean;
  };
}

export interface CallState {
  isActive: boolean;
  type?: 'voice' | 'video';
  conversationId?: string;
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
    isMuted?: boolean;
    isVideoEnabled?: boolean;
  }>;
  startTime?: Date;
}

export interface SearchResult {
  messageId: string;
  conversationId: string;
  content: string;
  senderName: string;
  createdAt: string;
  context: string;
}

export function useAdvancedMessaging(initialConversationId?: string | null) {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [callState, setCallState] = useState<CallState>({ isActive: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: Array<{ id: string; name: string; avatar?: string }> }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [conversationId: string]: number }>({});

  const currentUserId = session?.user?.id;

  // Initialize socket event listeners (no socket creation)
  useEffect(() => {
    if (!currentUserId || !socket || !isConnected) return;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to messaging server');
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from messaging server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to messaging server');
    });

    // Message events
    socket.on('message:new', (data) => {
      console.log('📨 Received new message:', data)
      const { message, conversationId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message]
      }));

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, lastMessage: message, lastActivity: message.createdAt }
          : conv
      ));

      // Update unread count if not current conversation
      if (activeConversation?.id !== conversationId && message.senderId !== currentUserId) {
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1
        }));
      }
    });

    socket.on('message:edited', (data) => {
      const { message, conversationId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.id === message.id ? message : msg
        ) || []
      }));
    });

    socket.on('message:deleted', (data) => {
      const { messageId, conversationId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
      }));
    });

    socket.on('message:reaction:updated', (data) => {
      const { messageId, reactions, conversationId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.id === messageId ? { ...msg, reactions } : msg
        ) || []
      }));
    });

    socket.on('message:sent', (data) => {
      const { messageId, conversationId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.id === messageId ? { ...msg, status: 'SENT' } : msg
        ) || []
      }));
    });

    socket.on('message:error', (data) => {
      setError(data.error);
    });

    // Typing events
    socket.on('conversation:typing', (data) => {
      const { conversationId, userId, isTyping, userName } = data;
      if (userId === currentUserId) return;

      setTypingUsers(prev => {
        const current = prev[conversationId] || [];
        if (isTyping) {
          const existing = current.find(u => u.id === userId);
          if (!existing) {
            return {
              ...prev,
              [conversationId]: [...current, { id: userId, name: userName }]
            };
          }
        } else {
          return {
            ...prev,
            [conversationId]: current.filter(u => u.id !== userId)
          };
        }
        return prev;
      });
    });

    // Online status events
    socket.on('user:online', (data) => {
      const { userId, isOnline } = data;
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: isOnline
      }));
    });

    socket.on('user:offline', (data) => {
      const { userId } = data;
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: false
      }));
    });

    // Read receipts
    socket.on('conversation:messages:read', (data) => {
      const { conversationId, messageIds, userId } = data;
      if (userId === currentUserId) return; setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, status: 'READ' } : msg
        ) || []
      }));
    });

    return () => {
      // Cleanup function - remove event listeners when component unmounts
      if (socket) {
        socket.off('message:new');
        socket.off('message:edited');
        socket.off('message:deleted');
        socket.off('message:reaction:updated');
        socket.off('message:sent');
        socket.off('message:error');
        socket.off('conversation:typing');
        socket.off('user:online');
        socket.off('user:offline');
        socket.off('conversation:messages:read');
      }
    };
  }, [currentUserId, socket, isConnected, activeConversation?.id]);

  // Load conversations
  useEffect(() => {
    if (!currentUserId) return;

    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/messages/conversations');
        if (!response.ok) throw new Error('Failed to load conversations');

        const data = await response.json();
        setConversations(data.conversations || []);

        // PRODUCTION FIX: Remove HTTP API call for unread counts
        // Unread counts will be handled by the UnreadCountProvider via Socket.IO
        // This eliminates duplicate API calls and ensures real-time updates
        console.log('✅ Conversations loaded, unread counts handled by UnreadCountProvider');
        
      } catch (error) {
        console.error('Error loading conversations:', error);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentUserId]);

  // Handle initial conversation ID from URL
  useEffect(() => {
    if (!initialConversationId || !conversations.length) return;

    const targetConversation = conversations.find(conv => conv.id === initialConversationId);
    if (targetConversation) {
      setActiveConversation(targetConversation);
    } else {
      // Try to fetch the specific conversation if not found in the list
      const fetchSpecificConversation = async () => {
        try {
          const response = await fetch(`/api/messages/conversations/${initialConversationId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.conversation) {
              setActiveConversation(data.conversation);
              // Add to conversations list if not already there
              setConversations(prev => {
                const exists = prev.find(conv => conv.id === initialConversationId);
                if (!exists) {
                  return [data.conversation, ...prev];
                }
                return prev;
              });
            }
          } else {
            console.error('Failed to fetch conversation:', response.statusText);
            setError('Failed to load conversation');
          }
        } catch (error) {
          console.error('Error fetching specific conversation:', error);
          setError('Failed to load conversation');
        }
      };
      
      fetchSpecificConversation();
    }
  }, [initialConversationId, conversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation || !currentUserId) return;

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages/conversations/${activeConversation.id}/messages`);
        if (!response.ok) throw new Error('Failed to load messages');

        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [activeConversation.id]: data.messages || []
        }));        // Join conversation room with enhanced debugging
        if (socket && isConnected) {
          console.log('🏠 Joining conversation room:', activeConversation.id)
          socket.emit('conversation:join', { conversationId: activeConversation.id }, (response: any) => {
            console.log('✅ Joined conversation room:', response)
          });
        } else {
          console.warn('⚠️ Socket not connected when trying to join conversation')
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setError('Failed to load messages');
      }
    };

    loadMessages(); return () => {
      // Leave conversation room when changing conversations
      if (socket) {
        socket.emit('conversation:leave', { conversationId: activeConversation.id });
      }
    };
  }, [activeConversation, currentUserId]);

  // Send message - FIXED: Use API-first approach for production reliability
  const sendMessage = useCallback(async (conversationId: string, messageData: any) => {
    if (!currentUserId) return;

    try {
      const tempId = `temp-${Date.now()}`;

      const replyToMessage = messageData.replyToId ? messages[conversationId]?.find(m => m.id === messageData.replyToId) : undefined;
      const tempMessage: Message = {
        id: tempId,
        content: messageData.content,
        messageType: messageData.messageType || 'TEXT',
        senderId: currentUserId,
        createdAt: new Date(),
        status: 'SENDING',
        replyTo: replyToMessage ? {
          id: replyToMessage.id,
          content: replyToMessage.content || '',
          senderName: replyToMessage.senderName || 'Unknown',
          messageType: replyToMessage.messageType
        } : undefined
      };

      // Optimistically add message to UI
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), tempMessage]
      }));

      // CRITICAL FIX: Send via API instead of direct Socket.IO for production reliability
      console.log('📤 Sending message via API:', {
        conversationId,
        contentLength: messageData.content?.length || 0,
        messageType: messageData.messageType || 'TEXT'
      })

      const response = await fetch('/api/messages?action=message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          content: messageData.content,
          messageType: messageData.messageType || 'TEXT',
          mediaUrls: messageData.mediaUrls || undefined,
          replyToId: messageData.replyToId || undefined,
          mentions: messageData.mentions || undefined,
        }),
      });

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();
      console.log('✅ Message sent successfully:', result)
      const sentMessage = result.message;

      // Update the optimistic message with real data and mark as sent
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.id === tempId ? { ...sentMessage, status: 'SENT' } : msg
        ) || []
      }));

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, lastMessage: sentMessage, lastActivity: sentMessage.createdAt }
          : conv
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      
      // Mark optimistic message as failed
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.status === 'SENDING' ? { ...msg, status: 'FAILED' } : msg
        ) || []
      }));
    }
  }, [currentUserId, messages]);

  // Legacy socket-based sending (for fallback only)
  const sendMessageViaSocket = useCallback(async (conversationId: string, messageData: any) => {
    if (!currentUserId || !socket) return;

    try {
      const tempId = `temp-${Date.now()}`;

      // Send via socket for real-time delivery (LEGACY - for fallback only)
      socket.emit('message:send', {
        conversationId,
        content: messageData.content,
        type: messageData.messageType || 'TEXT',
        metadata: {
          replyToId: messageData.replyToId,
          mediaUrls: messageData.mediaUrls,
          mentions: messageData.mentions,
          priority: messageData.priority
        }
      });

      // If there are files, upload them via API
      if (messageData.mediaFiles?.length > 0) {
        const formData = new FormData();
        messageData.mediaFiles.forEach((file: File) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();          // Update message with media URLs
          socket.emit('message:update-media', {
            messageId: tempId,
            mediaUrls: uploadData.urls
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update temp message to show error
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg =>
          msg.id.startsWith('temp-') ? { ...msg, status: 'FAILED' } : msg
        ) || []
      }));
      throw error;
    }
  }, [currentUserId, messages]);
  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!socket) return;

    try {
      socket.emit('message:edit', {
        messageId,
        content: newContent
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, []);
  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!socket) return;

    try {
      socket.emit('message:delete', { messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);
  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!socket) return;

    try {
      socket.emit('message:reaction:add', {
        messageId,
        emoji
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, []);
  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!socket) return;

    try {
      socket.emit('message:reaction:remove', {
        messageId,
        emoji
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }, []);

  // Forward message
  const forwardMessage = useCallback(async (messageId: string, conversationIds: string[]) => {
    try {
      const response = await fetch('/api/messages/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, conversationIds })
      });

      if (!response.ok) throw new Error('Failed to forward message');
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }, []);

  // Pin message
  const pinMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to pin message');
    } catch (error) {
      console.error('Error pinning message:', error);
      throw error;
    }
  }, []);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/archive`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to archive conversation');

      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, isArchived: !conv.isArchived } : conv
      ));
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }, []);

  // Mute conversation
  const muteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/mute`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to mute conversation');

      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, isMuted: !conv.isMuted } : conv
      ));
    } catch (error) {
      console.error('Error muting conversation:', error);
      throw error;
    }
  }, []);

  // Block conversation
  const blockConversation = useCallback(async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation || conversation.isGroup) return;

      const otherUserId = conversation.participants.find(p => p.userId !== currentUserId)?.userId;
      if (!otherUserId) return;

      const response = await fetch(`/api/messages/users/${otherUserId}/block`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to block user');

      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, isBlocked: !conv.isBlocked } : conv
      ));
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }, [conversations, currentUserId]);

  // Search messages
  const searchMessages = useCallback(async (query: string, conversationId?: string) => {
    try {
      const params = new URLSearchParams({ q: query });
      if (conversationId) params.append('conversationId', conversationId);

      const response = await fetch(`/api/messages/search?${params}`);
      if (!response.ok) throw new Error('Failed to search messages');

      const data = await response.json();
      setSearchResults(data.results || []);
      return data.results;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }, []);

  // Start call
  const startCall = useCallback(async (conversationId: string, type: 'voice' | 'video') => {
    try {
      setCallState({
        isActive: true,
        type,
        conversationId,
        startTime: new Date()
      });      // Emit call start event
      if (socket) {
        socket.emit('call:start', {
          conversationId,
          type
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }, []);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (socket && callState.conversationId) {
        socket.emit('call:end', {
          conversationId: callState.conversationId
        });
      }

      setCallState({ isActive: false });
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }, [callState.conversationId]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    if (!socket || messageIds.length === 0) return;

    try {
      socket.emit('conversation:messages:read', {
        conversationId,
        messageIds
      });

      // Update local unread count
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, []);
  // Set typing status
  const setTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!socket) return;

    try {
      if (isTyping) {
        socket.emit('conversation:typing:start', { conversationId });
      } else {
        socket.emit('conversation:typing:stop', { conversationId });
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, []);

  // Get total unread count across all conversations
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  return {
    conversations,
    messages,
    activeConversation,
    searchResults,
    callState,
    isLoading,
    error,
    onlineUsers,
    typingUsers,
    unreadCounts,
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
    markAsRead,
    setTyping,
    getTotalUnreadCount
  };
}
