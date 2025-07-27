/**
 * =============================================================================
 * MESSAGE HOOK - useMessage
 * =============================================================================
 * 
 * PURPOSE:
 * Custom React hook for messaging functionality in profile components.
 * Handles conversation creation and navigation to messaging interface.
 * 
 * FEATURES:
 * - Create new conversations with users
 * - Find existing conversations
 * - Navigate to messaging interface
 * - Error handling for messaging operations
 * - Permission validation
 * - Loading states
 * 
 * USAGE:
 * const { sendMessage, isLoading, canMessage } = useMessage(targetUserId)
 * 
 * API INTEGRATION:
 * - POST /api/messages/conversations - Create/find conversation
 * - Integration with existing messaging system
 * 
 * NAVIGATION:
 * - Automatic redirect to messages page
 * - Conversation parameter passing
 * - Proper route handling
 * 
 * ERROR HANDLING:
 * - Network errors
 * - Permission errors
 * - User feedback via toast
 * - Graceful degradation
 * 
 * PERMISSIONS:
 * - Authenticated users only
 * - Cannot message yourself
 * - Respect privacy settings
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UseMessageProps {
  targetUserId: string
  targetUserName?: string
}

interface UseMessageReturn {
  sendMessage: () => Promise<void>
  isLoading: boolean
  canMessage: boolean
  error: string | null
}

export function useMessage({
  targetUserId,
  targetUserName
}: UseMessageProps): UseMessageReturn {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user can send messages
  const canMessage = Boolean(
    session?.user?.id && 
    session.user.id !== targetUserId &&
    targetUserId
  )

  // Send message (create conversation and navigate)
  const sendMessage = useCallback(async () => {
    if (!canMessage) {
      if (!session?.user?.id) {
        toast.error('Please sign in to send messages')
      } else if (session.user.id === targetUserId) {
        toast.error('You cannot message yourself')
      } else {
        toast.error('Cannot send message to this user')
      }
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create or find existing conversation
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          participantIds: [session?.user?.id, targetUserId],
          type: 'DIRECT'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create conversation')
      }

      const conversation = await response.json()
      
      // Navigate to messages page with conversation
      const messagesUrl = `/messages?conversation=${conversation.id}`
      router.push(messagesUrl)
      
      // Show success message
      const targetName = targetUserName || 'user'
      toast.success(`Opening conversation with ${targetName}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Message error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    canMessage, 
    session, 
    targetUserId, 
    targetUserName, 
    router
  ])

  return {
    sendMessage,
    isLoading,
    canMessage,
    error
  }
}
