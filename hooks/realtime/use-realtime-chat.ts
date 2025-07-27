/**
 * @fileoverview Real-time Chat Hook for Educational Platform
 * @module useRealtimeChat
 * @category Realtime Hooks
 * 
 * Essential for instant communication in educational environment
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeConnection } from './use-realtime-connection';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'CONTACT' | 'STICKER' | 'VOICE_NOTE';
  mediaUrls?: string[];
  mediaMetadata?: any;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  mentions?: string[];
  reactions?: MessageReaction[];
  reads?: MessageRead[];
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  reaction: string;
  createdAt: string;
}

interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  deliveredAt?: string;
}

interface ChatConversation {
  id: string;
  title?: string;
  type: 'DIRECT' | 'GROUP' | 'BROADCAST';
  isGroup: boolean;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  lastActivity: string;
  isArchived: boolean;
  isMuted: boolean;
  isBlocked: boolean;
}

interface ChatParticipant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
}

interface TypingUser {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  startedAt: string;
}

interface ChatState {
  activeConversation: string | null;
  conversations: { [id: string]: ChatConversation };
  messages: { [conversationId: string]: ChatMessage[] };
  typingUsers: { [conversationId: string]: TypingUser[] };
  onlineUsers: { [userId: string]: boolean };
  loading: boolean;
  error: string | null;
}

/**
 * Hook for real-time educational chat system
 * 
 * WHY THIS IS ESSENTIAL FOR EDUCATION:
 * - Instant help between students and teachers
 * - Study group discussions
 * - Course-specific chat rooms
 * - Real-time Q&A during lectures
 * - Collaborative project communication
 * 
 * WITHOUT THIS HOOK:
 * ❌ No instant help/support
 * ❌ Delayed communication
 * ❌ Poor collaboration
 * ❌ Students feel isolated
 * ❌ Teachers can't provide immediate feedback
 * 
 * @example
 * ```tsx
 * function ChatInterface() {
 *   const { 
 *     messages, 
 *     sendMessage, 
 *     joinRoom,
 *     typingUsers 
 *   } = useRealtimeChat();
 *   
 *   return (
 *     <div className="chat-container">
 *       {messages.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *       <ChatInput onSend={sendMessage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeChat() {
  const { isConnected, emit, on } = useRealtimeConnection();
  const [state, setState] = useState<ChatState>({
    activeConversation: null,
    conversations: {},
    messages: {},
    typingUsers: {},
    onlineUsers: {},
    loading: false,
    error: null,
  });

  // Listen for real-time events
  useEffect(() => {
    if (!isConnected) return;

    // New message received
    const cleanup1 = on('message:new', (data: { message: ChatMessage; conversationId: string }) => {
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversationId]: [
            ...(prev.messages[data.conversationId] || []),
            data.message,
          ],
        },
        conversations: {
          ...prev.conversations,
          [data.conversationId]: {
            ...prev.conversations[data.conversationId],
            lastMessage: data.message,
            lastActivity: data.message.createdAt,
          },
        },
      }));
    });

    // Message edited
    const cleanup2 = on('message:edited', (data: { message: ChatMessage; conversationId: string }) => {
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversationId]: (prev.messages[data.conversationId] || []).map(msg =>
            msg.id === data.message.id ? data.message : msg
          ),
        },
      }));
    });

    // Message deleted
    const cleanup3 = on('message:deleted', (data: { messageId: string; conversationId: string }) => {
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversationId]: (prev.messages[data.conversationId] || []).filter(msg =>
            msg.id !== data.messageId
          ),
        },
      }));
    });

    // Message reactions updated
    const cleanup4 = on('message:reaction:updated', (data: { messageId: string; reactions: MessageReaction[]; conversationId: string }) => {
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversationId]: (prev.messages[data.conversationId] || []).map(msg =>
            msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
          ),
        },
      }));
    });

    // Typing indicator
    const cleanup5 = on('conversation:typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      setState(prev => {
        const currentTyping = prev.typingUsers[data.conversationId] || [];
        let updatedTyping;

        if (data.isTyping) {
          // Add user to typing if not already there
          updatedTyping = currentTyping.find(u => u.userId === data.userId)
            ? currentTyping.map(u => u.userId === data.userId ? { ...u, startedAt: new Date().toISOString() } : u)
            : [...currentTyping, { userId: data.userId, conversationId: data.conversationId, isTyping: true, startedAt: new Date().toISOString() }];
        } else {
          // Remove user from typing
          updatedTyping = currentTyping.filter(u => u.userId !== data.userId);
        }

        return {
          ...prev,
          typingUsers: {
            ...prev.typingUsers,
            [data.conversationId]: updatedTyping,
          },
        };
      });
    });

    // Messages read
    const cleanup6 = on('conversation:messages:read', (data: { conversationId: string; messageIds: string[]; userId: string; readAt: string }) => {
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversationId]: (prev.messages[data.conversationId] || []).map(msg =>
            data.messageIds.includes(msg.id)
              ? {
                  ...msg,
                  reads: [
                    ...(msg.reads || []).filter(r => r.userId !== data.userId),
                    { id: '', messageId: msg.id, userId: data.userId, readAt: data.readAt },
                  ],
                }
              : msg
          ),
        },
      }));
    });

    // User online/offline status
    const cleanup7 = on('user:online', (data: { userId: string; isOnline: boolean }) => {
      setState(prev => ({
        ...prev,
        onlineUsers: {
          ...prev.onlineUsers,
          [data.userId]: data.isOnline,
        },
      }));
    });

    const cleanup8 = on('user:offline', (data: { userId: string }) => {
      setState(prev => ({
        ...prev,
        onlineUsers: {
          ...prev.onlineUsers,
          [data.userId]: false,
        },
      }));
    });

    // Error handling
    const cleanup9 = on('message:error', (data: { error: string }) => {
      setState(prev => ({
        ...prev,
        error: data.error,
      }));
    });

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
      cleanup6();
      cleanup7();
      cleanup8();
      cleanup9();
    };
  }, [isConnected, on]);
  // Join conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (!isConnected) return;

    setState(prev => ({ ...prev, activeConversation: conversationId }));
    emit('conversation:join', { conversationId });
  }, [isConnected, emit]);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (!isConnected) return;

    emit('conversation:leave', { conversationId });
    setState(prev => ({ ...prev, activeConversation: null }));
  }, [isConnected, emit]);

  // Send message
  const sendMessage = useCallback((
    content: string, 
    messageType: ChatMessage['messageType'] = 'TEXT',
    metadata: {
      replyToId?: string;
      mediaUrls?: string[];
      mediaMetadata?: any;
      mentions?: string[];
    } = {}
  ) => {
    if (!isConnected || !state.activeConversation || !content.trim()) return;

    emit('message:send', {
      conversationId: state.activeConversation,
      content: content.trim(),
      type: messageType,
      metadata,
    });
  }, [isConnected, emit, state.activeConversation]);

  // Edit message
  const editMessage = useCallback((messageId: string, content: string) => {
    if (!isConnected || !content.trim()) return;

    emit('message:edit', { messageId, content: content.trim() });
  }, [isConnected, emit]);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!isConnected) return;

    emit('message:delete', { messageId });
  }, [isConnected, emit]);

  // Add reaction
  const addReaction = useCallback((messageId: string, emoji: string, reaction: string = 'LIKE') => {
    if (!isConnected) return;

    emit('message:reaction:add', { messageId, emoji, reaction });
  }, [isConnected, emit]);

  // Remove reaction
  const removeReaction = useCallback((messageId: string, emoji: string) => {
    if (!isConnected) return;

    emit('message:reaction:remove', { messageId, emoji });
  }, [isConnected, emit]);

  // Start typing
  const startTyping = useCallback(() => {
    if (!isConnected || !state.activeConversation) return;

    emit('conversation:typing:start', { conversationId: state.activeConversation });
  }, [isConnected, emit, state.activeConversation]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!isConnected || !state.activeConversation) return;

    emit('conversation:typing:stop', { conversationId: state.activeConversation });
  }, [isConnected, emit, state.activeConversation]);

  // Mark messages as read
  const markMessagesAsRead = useCallback((messageIds: string[]) => {
    if (!isConnected || !state.activeConversation || messageIds.length === 0) return;

    emit('conversation:messages:read', {
      conversationId: state.activeConversation,
      messageIds,
    });
  }, [isConnected, emit, state.activeConversation]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    activeConversation: state.activeConversation,
    conversations: Object.values(state.conversations),
    messages: state.messages[state.activeConversation || ''] || [],
    typingUsers: state.typingUsers[state.activeConversation || ''] || [],
    onlineUsers: state.onlineUsers,
    loading: state.loading,
    error: state.error,
    isConnected,

    // Actions
    joinConversation,
    leaveConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    clearError,

    // Utilities
    getConversation: (id: string) => state.conversations[id],
    getMessages: (conversationId: string) => state.messages[conversationId] || [],
    getTypingUsers: (conversationId: string) => state.typingUsers[conversationId] || [],
    isUserOnline: (userId: string) => state.onlineUsers[userId] || false,
  };
}
