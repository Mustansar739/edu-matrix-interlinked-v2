/**
 * =============================================================================
 * SHARE PROFILE MODAL - Production-Ready Social Sharing Interface
 * =============================================================================
 * 
 * PURPOSE:
 * Modern, user-friendly modal for sharing user profiles across multiple platforms.
 * Provides comprehensive sharing options similar to major social platforms.
 * 
 * FEATURES:
 * - Multi-platform sharing (Twitter, LinkedIn, Facebook, WhatsApp, Telegram, Email)
 * - Copy to clipboard functionality
 * - Real-time share tracking and analytics
 * - Custom share messages and UTM parameters
 * - Responsive design with modern UI
 * - Accessibility-first approach
 * 
 * PLATFORMS SUPPORTED:
 * - Direct Link (copy to clipboard)
 * - Twitter
 * - LinkedIn  
 * - Facebook
 * - WhatsApp
 * - Telegram
 * - Email
 * 
 * USAGE:
 * <ShareProfileModal 
 *   isOpen={isShareModalOpen}
 *   onClose={() => setIsShareModalOpen(false)}
 *   userId={userId}
 *   userName={userName}
 *   userHeadline={userHeadline}
 * />
 * 
 * API INTEGRATION:
 * - GET /api/share/profile/[userId]/links - Get shareable links
 * - POST /api/share/profile/[userId] - Track share actions
 * 
 * ANALYTICS:
 * - Share count tracking by platform
 * - UTM parameter generation
 * - User engagement metrics
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Copy, 
  Twitter, 
  Linkedin, 
  Facebook, 
  MessageCircle, 
  Send, 
  Mail,
  ExternalLink,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface ShareProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName?: string
  userHeadline?: string
}

interface ShareLinks {
  direct: string
  twitter: string
  linkedin: string
  facebook: string
  whatsapp: string
  telegram: string
  email: string
}

export default function ShareProfileModal({
  isOpen,
  onClose,
  userId,
  userName,
  userHeadline
}: ShareProfileModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch share links when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchShareLinks()
    }
  }, [isOpen, userId])

  const fetchShareLinks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/share/profile/${userId}/links`)
      if (response.ok) {
        const data = await response.json()
        setShareLinks(data.shareLinks)
      } else {
        throw new Error('Failed to fetch share links')
      }
    } catch (error) {
      console.error('Error fetching share links:', error)
      toast.error('Failed to load sharing options')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async (platform: string) => {
    if (!shareLinks) return

    try {
      // Track the share
      await fetch(`/api/share/profile/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          utmSource: platform,
          utmMedium: 'social',
          utmCampaign: 'profile_share'
        })
      })

      if (platform === 'link') {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareLinks.direct)
        setCopiedLink(true)
        toast.success('Profile link copied to clipboard!')
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        // Open platform-specific share URL
        const shareUrl = shareLinks[platform as keyof ShareLinks]
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
          toast.success(`Opening ${platform} share...`)
          onClose() // Close modal after sharing
        }
      }
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share profile')
    }
  }

  const shareOptions = [
    {
      id: 'link',
      name: 'Copy Link',
      icon: copiedLink ? CheckCircle : Copy,
      color: 'text-gray-600 hover:text-gray-800',
      bgColor: 'hover:bg-gray-100',
      description: 'Copy profile link to clipboard'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-500 hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
      description: 'Share on Twitter'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'text-blue-700 hover:text-blue-800',
      bgColor: 'hover:bg-blue-50',
      description: 'Share on LinkedIn'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'hover:bg-blue-50',
      description: 'Share on Facebook'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600 hover:text-green-700',
      bgColor: 'hover:bg-green-50',
      description: 'Share via WhatsApp'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      color: 'text-blue-500 hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
      description: 'Share via Telegram'
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'text-gray-600 hover:text-gray-800',
      bgColor: 'hover:bg-gray-100',
      description: 'Share via email'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <span>Share Profile</span>
          </DialogTitle>
          <DialogDescription>
            Share {userName || 'this user'}&apos;s profile across different platforms
            {userHeadline && (
              <span className="block text-sm text-gray-500 mt-1">
                {userHeadline}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    className={`h-auto p-4 flex flex-col items-center space-y-2 ${option.bgColor} border-gray-200 transition-all duration-200`}
                    onClick={() => handleShare(option.id)}
                    disabled={!shareLinks}
                  >
                    <IconComponent className={`w-6 h-6 ${option.color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {option.name}
                    </span>
                  </Button>
                )
              })}
            </div>
          )}

          {shareLinks?.direct && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Profile URL:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-white p-2 rounded border text-gray-800 overflow-hidden text-ellipsis">
                  {shareLinks.direct}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare('link')}
                  className="flex-shrink-0"
                >
                  {copiedLink ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
