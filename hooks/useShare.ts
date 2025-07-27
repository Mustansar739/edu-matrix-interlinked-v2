/**
 * =============================================================================
 * SHARE HOOK - useShare
 * =============================================================================
 * 
 * PURPOSE:
 * Custom React hook for sharing profiles across different platforms.
 * Provides complete state management for sharing functionality.
 * 
 * FEATURES:
 * - Multiple sharing platforms (social media, direct link, email)
 * - Share tracking and analytics
 * - Custom share messages
 * - Copy to clipboard functionality
 * - Share statistics
 * - Error handling and user feedback
 * 
 * USAGE:
 * const { shareProfile, copyLink, shareLinks, isLoading } = useShare(userId)
 * 
 * SHARING PLATFORMS:
 * - Direct link (copy to clipboard)
 * - Twitter, LinkedIn, Facebook
 * - WhatsApp, Telegram
 * - Email
 * 
 * API INTEGRATION:
 * - POST /api/share/profile/[userId] - Track share
 * - GET /api/share/profile/[userId]/links - Get shareable links
 * 
 * ANALYTICS:
 * - Share count tracking
 * - Platform breakdown
 * - UTM parameter generation
 * 
 * ERROR HANDLING:
 * - Network errors
 * - Permission errors
 * - Clipboard API failures
 * - User feedback via toast
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface ShareLinks {
  direct: string
  twitter: string
  linkedin: string
  facebook: string
  whatsapp: string
  telegram: string
  email: string
}

interface UseShareProps {
  userId: string
  userName?: string
  userHeadline?: string
}

interface UseShareReturn {
  shareProfile: (platform: string, customMessage?: string) => Promise<void>
  copyLink: () => Promise<void>
  shareLinks: ShareLinks | null
  shareCount: number
  isLoading: boolean
  error: string | null
}

export function useShare({
  userId,
  userName,
  userHeadline
}: UseShareProps): UseShareReturn {
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null)
  const [shareCount, setShareCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch shareable links
  const fetchShareLinks = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/share/profile/${userId}/links`)
      if (response.ok) {
        const data = await response.json()
        setShareLinks(data.shareLinks)
      } else {
        throw new Error('Failed to fetch share links')
      }
    } catch (err) {
      console.error('Error fetching share links:', err)
      setError(err instanceof Error ? err.message : 'Failed to load share options')
    }
  }, [userId])

  // Load share links on mount
  useEffect(() => {
    fetchShareLinks()
  }, [fetchShareLinks])

  // Share profile on specific platform
  const shareProfile = useCallback(async (platform: string, customMessage?: string) => {
    if (!userId) {
      toast.error('Invalid profile for sharing')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Track the share
      const response = await fetch(`/api/share/profile/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          message: customMessage,
          utmSource: platform,
          utmMedium: 'social',
          utmCampaign: 'profile_share'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to share profile')
      }

      const result = await response.json()
      
      // Handle platform-specific sharing
      if (platform === 'link') {
        // Copy to clipboard
        await copyToClipboard(result.shareUrl)
        toast.success('Link copied to clipboard!')
      } else if (shareLinks) {
        // Open platform-specific share URL
        const shareUrl = shareLinks[platform as keyof ShareLinks]
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400')
          toast.success(`Shared on ${platform}!`)
        }
      }

      // Update share count
      setShareCount(prev => prev + 1)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share profile'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Share error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, shareLinks])

  // Copy direct link to clipboard
  const copyLink = useCallback(async () => {
    if (!shareLinks?.direct) {
      toast.error('Share link not available')
      return
    }

    try {
      await copyToClipboard(shareLinks.direct)
      toast.success('Profile link copied to clipboard!')
      
      // Track the copy action as a share
      await shareProfile('link')
    } catch (err) {
      toast.error('Failed to copy link')
      console.error('Copy link error:', err)
    }
  }, [shareLinks, shareProfile])

  return {
    shareProfile,
    copyLink,
    shareLinks,
    shareCount,
    isLoading,
    error
  }
}

// Helper function to copy text to clipboard
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    await navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
    } catch (err) {
      throw new Error('Failed to copy to clipboard')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
