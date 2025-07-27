// ==========================================
// MESSAGING REAL-TIME SERVICE
// ==========================================
// Facebook-style messaging real-time operations
// Separate from Students Interlinked module

import { io, Socket } from 'socket.io-client';

// Types for messaging
interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  mediaUrls?: string[];
  replyToId?: string;
  createdAt: Date;
}

interface ConversationData {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string;
  participants: string[];
  lastMessage?: MessageData;
  updatedAt: Date;
}

interface TypingData {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface MessageReactionData {
  messageId: string;
  userId: string;
  emoji: string;
  reaction: string;
}

interface MessageReadData {
  messageId: string;
  conversationId: string;
  userId: string;
  readAt: Date;
}

class MessagingRealTimeService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  
  // Connection management
  async connect(): Promise<void> {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      return new Promise((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket not initialized'));

        this.socket.on('connect', () => {
          console.log('✅ Messaging Socket.IO connected');
          this.isConnected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Messaging Socket.IO connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Messaging Socket.IO disconnected');
          this.isConnected = false;
        });
      });
    } catch (error) {
      console.error('❌ Messaging Socket.IO connection failed:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room management
  async joinConversation(conversationId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }
    
    this.socket?.emit('conversation:join', { conversationId });
  }

  async leaveConversation(conversationId: string): Promise<void> {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('conversation:leave', { conversationId });
  }

  // Message operations
  async sendMessage(messageData: Omit<MessageData, 'id' | 'createdAt'>): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('message:send', messageData);
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('message:edit', { messageId, content: newContent });
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('message:delete', { messageId });
  }

  // Message reactions
  async addMessageReaction(messageId: string, emoji: string, reaction: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('message:reaction:add', { messageId, emoji, reaction });
  }

  async removeMessageReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('message:reaction:remove', { messageId, emoji });
  }

  // Typing indicators
  async startTyping(conversationId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('conversation:typing:start', { conversationId });
  }

  async stopTyping(conversationId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('conversation:typing:stop', { conversationId });
  }

  // Read receipts
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('conversation:messages:read', { conversationId, messageIds });
  }

  // User status
  async updateOnlineStatus(isOnline: boolean): Promise<void> {
    if (!this.socket || !this.isConnected) {
      await this.connect();
    }

    this.socket?.emit('user:status:update', { isOnline });
  }

  // Event listeners
  onNewMessage(callback: (message: MessageData) => void): void {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
  }

  onMessageEdit(callback: (data: { messageId: string; content: string }) => void): void {
    if (!this.socket) return;
    this.socket.on('message:edited', callback);
  }

  onMessageDelete(callback: (data: { messageId: string }) => void): void {
    if (!this.socket) return;
    this.socket.on('message:deleted', callback);
  }

  onMessageReaction(callback: (data: MessageReactionData) => void): void {
    if (!this.socket) return;
    this.socket.on('message:reaction', callback);
  }

  onTypingStatus(callback: (data: TypingData) => void): void {
    if (!this.socket) return;
    this.socket.on('conversation:typing', callback);
  }

  onMessageRead(callback: (data: MessageReadData) => void): void {
    if (!this.socket) return;
    this.socket.on('message:read', callback);
  }

  onUserOnline(callback: (data: { userId: string; isOnline: boolean }) => void): void {
    if (!this.socket) return;
    this.socket.on('user:online', callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void): void {
    if (!this.socket) return;
    this.socket.on('user:offline', callback);
  }

  onConversationUpdate(callback: (conversation: ConversationData) => void): void {
    if (!this.socket) return;
    this.socket.on('conversation:updated', callback);
  }

  // Remove event listeners
  offNewMessage(): void {
    this.socket?.off('message:new');
  }

  offMessageEdit(): void {
    this.socket?.off('message:edited');
  }

  offMessageDelete(): void {
    this.socket?.off('message:deleted');
  }

  offMessageReaction(): void {
    this.socket?.off('message:reaction');
  }

  offTypingStatus(): void {
    this.socket?.off('conversation:typing');
  }

  offMessageRead(): void {
    this.socket?.off('message:read');
  }

  offUserStatus(): void {
    this.socket?.off('user:online');
    this.socket?.off('user:offline');
  }

  offConversationUpdate(): void {
    this.socket?.off('conversation:updated');
  }

  // Connection status
  isConnectedToSocket(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const messagingRealTimeService = new MessagingRealTimeService();
export default messagingRealTimeService;

// Export types
export type {
  MessageData,
  ConversationData,
  TypingData,
  MessageReactionData,
  MessageReadData
};
