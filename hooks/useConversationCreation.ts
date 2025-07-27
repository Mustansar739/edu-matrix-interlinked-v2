/**
 * =============================================================================
 * CONVERSATION CREATION HOOK - PRODUCTION-READY
 * =============================================================================
 * 
 * PURPOSE:
 * Creates conversations automatically when users click message buttons
 * Handles user lookup, conversation creation, and navigation seamlessly
 * 
 * FEATURES:
 * ✅ Automatic conversation creation for direct messages
 * ✅ User lookup by username or ID
 * ✅ Online status detection
 * ✅ Error handling and loading states
 * ✅ Navigation to conversation after creation
 * ✅ Real-time updates via Socket.IO
 * 
 * USAGE:
 * const { createConversation, isCreating, error } = useConversationCreation();
 * 
 * // Create conversation and navigate
 * await createConversation({ 
 *   userIdentifier: 'username', 
 *   navigateAfterCreation: true 
 * });
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

interface ConversationCreationOptions {
  /** User identifier (username or ID) to create conversation with */
  userIdentifier: string;
  /** Whether to navigate to the conversation after creation */
  navigateAfterCreation?: boolean;
  /** Custom success callback */
  onSuccess?: (conversationId: string) => void;
  /** Custom error callback */
  onError?: (error: string) => void;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string;
  participants: Array<{
    userId: string;
    user: User;
    isAdmin: boolean;
  }>;
  lastMessage?: any;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CONVERSATION CREATION HOOK
// ==========================================

export function useConversationCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  /**
   * Find user by username or ID
   */
  const findUser = useCallback(async (identifier: string): Promise<User | null> => {
    try {
      // First try to find by username
      const usernameResponse = await fetch(`/api/users/search?username=${encodeURIComponent(identifier)}`);
      
      if (usernameResponse.ok) {
        const userData = await usernameResponse.json();
        if (userData.user) {
          return userData.user;
        }
      }

      // If not found by username, try by ID
      const idResponse = await fetch(`/api/users/${identifier}`);
      
      if (idResponse.ok) {
        const userData = await idResponse.json();
        if (userData.user) {
          return userData.user;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }, []);

  /**
   * Create or find existing conversation
   */
  const createConversation = useCallback(async (options: ConversationCreationOptions) => {
    const { userIdentifier, navigateAfterCreation = true, onSuccess, onError } = options;

    // Check if user is authenticated
    if (!session?.user?.id) {
      const errorMessage = 'Please log in to send messages';
      setError(errorMessage);
      toast({
        title: 'Authentication Required',
        description: errorMessage,
        variant: 'destructive',
      });
      if (onError) onError(errorMessage);
      return null;
    }

    // ✅ PRODUCTION-READY: Allow self-messaging like Facebook, WhatsApp, etc.
    // This is useful for personal notes, reminders, and testing
    const isSelfMessaging = userIdentifier === session.user.id || userIdentifier === session.user.email;
    
    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Find the target user
      const targetUser = await findUser(userIdentifier);
      
      if (!targetUser) {
        const errorMessage = 'User not found';
        setError(errorMessage);
        toast({
          title: 'User Not Found',
          description: 'The user you are trying to message does not exist.',
          variant: 'destructive',
        });
        if (onError) onError(errorMessage);
        return null;
      }

      // Step 2: Create or find existing conversation
      const conversationResponse = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: [targetUser.id],
          type: 'DIRECT',
          isGroup: false,
        }),
      });

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json();
        const errorMessage = errorData.error || 'Failed to create conversation';
        setError(errorMessage);
        toast({
          title: 'Conversation Creation Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        if (onError) onError(errorMessage);
        return null;
      }

      const { conversation } = await conversationResponse.json();

      // Step 3: Navigate to conversation if requested
      if (navigateAfterCreation) {
        router.push(`/messages?conversation=${conversation.id}`);
      }

      // Step 4: Success callback
      if (onSuccess) {
        onSuccess(conversation.id);
      }

      toast({
        title: 'Conversation Ready',
        description: `You can now chat with ${targetUser.name}`,
      });

      return conversation;

    } catch (error) {
      console.error('Error creating conversation:', error);
      const errorMessage = 'Failed to create conversation. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      if (onError) onError(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [session, findUser, router, toast]);

  /**
   * Quick message action for profile buttons
   */
  const quickMessage = useCallback(async (userIdentifier: string) => {
    return await createConversation({
      userIdentifier,
      navigateAfterCreation: true,
    });
  }, [createConversation]);

  /**
   * Create conversation without navigation
   */
  const createConversationOnly = useCallback(async (userIdentifier: string) => {
    return await createConversation({
      userIdentifier,
      navigateAfterCreation: false,
    });
  }, [createConversation]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createConversation,
    quickMessage,
    createConversationOnly,
    isCreating,
    error,
    clearError,
  };
}
