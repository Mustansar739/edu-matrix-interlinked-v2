/**
 * =============================================================================
 * PROFILE SHARE API - Social Sharing System
 * =============================================================================
 * 
 * PURPOSE:
 * Complete sharing system for user profiles across different platforms and methods.
 * Handles share tracking, analytics, and multiple sharing channels.
 * 
 * ENDPOINTS:
 * POST /api/share/profile/[userId] - Share a profile
 * GET /api/share/profile/[userId]/stats - Get sharing statistics
 * GET /api/share/profile/[userId]/links - Get shareable links
 * 
 * SHARING METHODS:
 * - Direct link copying
 * - Social media platforms (Twitter, LinkedIn, Facebook)
 * - Email sharing
 * - QR code generation
 * - Embedded widgets
 * 
 * FEATURES:
 * - Multiple sharing channels
 * - Share tracking and analytics
 * - Custom share messages
 * - UTM parameter generation
 * - Privacy controls
 * - Rate limiting
 * 
 * ANALYTICS:
 * - Share count tracking
 * - Platform breakdown
 * - Referral source tracking
 * - Conversion metrics
 * 
 * SECURITY:
 * - Rate limiting per user
 * - Spam prevention
 * - Privacy controls
 * - Content validation
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for share operations
const shareSchema = z.object({
  platform: z.enum(['link', 'twitter', 'linkedin', 'facebook', 'email', 'whatsapp', 'telegram']),
  message: z.string().max(500).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * SHARE PROFILE
 * POST /api/share/profile/[userId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params
    const session = await auth()
    const body = await request.json()
    
    // Validate input
    const { platform, message, utmSource, utmMedium, utmCampaign, metadata } = shareSchema.parse(body)

    // Authentication is optional for sharing (public profiles can be shared by anyone)
    const sharerId = session?.user?.id || null

    // Check if target user/profile exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { 
        id: true,
        username: true,
        name: true,
        profilePictureUrl: true,
        headline: true,
        bio: true,
        profileVisibility: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check profile visibility (respect privacy settings)
    if (targetUser.profileVisibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'This profile is private and cannot be shared' },
        { status: 403 }
      )
    }

    // Generate shareable URL with UTM parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const profileUrl = `${baseUrl}/profile/${targetUser.username}`
    
    const utmParams = new URLSearchParams()
    if (utmSource) utmParams.append('utm_source', utmSource)
    if (utmMedium) utmParams.append('utm_medium', utmMedium)
    if (utmCampaign) utmParams.append('utm_campaign', utmCampaign)
    utmParams.append('utm_content', 'profile_share')
    
    const shareableUrl = `${profileUrl}?${utmParams.toString()}`

    // Generate platform-specific share data for response
    const platformShareData = generatePlatformShareData(platform, targetUser, shareableUrl, message)

    // Track the share
    const shareRecord = {
      profileId: targetUserId,
      sharerId: sharerId,
      platform: platform,
      shareUrl: shareableUrl,
      message: message || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      metadata: metadata || {},
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null
    }

    // Create profile share record and increment sharing count
    await prisma.$transaction(async (tx) => {
      // Create the share record
      await tx.profileShare.create({
        data: shareRecord
      })

      // Increment the sharing count for the profile owner
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          sharingCount: {
            increment: 1
          }
        }
      })
    })

    // Create profile share notification (only for authenticated users)
    if (sharerId && sharerId !== targetUserId) {
      try {
        // Import notification service dynamically
        const { default: NotificationService } = await import('@/lib/services/notification-system/notifications')
        const notificationService = NotificationService.getInstance()
        
        // Get current user details for notification
        const currentUser = await prisma.user.findUnique({
          where: { id: sharerId },
          select: { name: true, username: true }
        })
        
        await notificationService.createNotification({
          userId: targetUserId,
          title: 'Profile Shared',
          message: `${currentUser?.name || currentUser?.username || 'Someone'} shared your profile on ${platform}`,
          type: 'PROFILE_SHARED' as any,
          category: 'SOCIAL' as any,
          priority: 'NORMAL' as any,
          channels: ['IN_APP'] as any[],
          entityType: 'PROFILE',
          entityId: targetUserId,
          data: {
            sharerId: sharerId,
            sharerName: currentUser?.name || currentUser?.username,
            platform,
            shareUrl: shareableUrl,
            action: 'share',
            timestamp: new Date().toISOString()
          }
        })
        
        console.log(`✅ Profile share notification sent to user ${targetUserId}`)
      } catch (notificationError) {
        // Log error but don't fail the share operation
        console.error('❌ Failed to send share notification:', notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      platform,
      shareUrl: shareableUrl,
      shareData: platformShareData,
      message: 'Profile shared successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid share data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Share API error:', error)
    return NextResponse.json(
      { error: 'Failed to share profile' },
      { status: 500 }
    )
  }
}

/**
 * GET SHAREABLE LINKS
 * GET /api/share/profile/[userId]/links
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { 
        id: true,
        username: true,
        name: true,
        profilePictureUrl: true,
        headline: true,
        profileVisibility: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check privacy settings
    if (targetUser.profileVisibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'This profile is private' },
        { status: 403 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const profileUrl = `${baseUrl}/profile/${targetUser.username}`

    // Generate platform-specific share links
    const shareLinks = {
      direct: profileUrl,
      twitter: generateTwitterShareUrl(profileUrl, targetUser),
      linkedin: generateLinkedInShareUrl(profileUrl, targetUser),
      facebook: generateFacebookShareUrl(profileUrl),
      whatsapp: generateWhatsAppShareUrl(profileUrl, targetUser),
      telegram: generateTelegramShareUrl(profileUrl, targetUser),
      email: generateEmailShareUrl(targetUser, profileUrl)
    }

    return NextResponse.json({
      success: true,
      profileUrl,
      shareLinks,
      profileData: {
        name: targetUser.name,
        username: targetUser.username,
        headline: targetUser.headline,
        avatar: targetUser.profilePictureUrl
      }
    })

  } catch (error) {
    console.error('Share links API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate share links' },
      { status: 500 }
    )
  }
}

// Helper functions for generating platform-specific share data
function generatePlatformShareData(platform: string, user: any, url: string, customMessage?: string) {
  const defaultMessage = `Check out ${user.name || user.username}'s profile${user.headline ? ` - ${user.headline}` : ''}`
  const message = customMessage || defaultMessage

  switch (platform) {
    case 'twitter':
      return {
        text: message,
        url: url,
        hashtags: ['profile', 'professional', 'network']
      }
    case 'linkedin':
      return {
        url: url,
        title: `${user.name || user.username}'s Profile`,
        summary: message
      }
    case 'facebook':
      return {
        u: url,
        quote: message
      }
    case 'whatsapp':
      return {
        text: `${message} ${url}`
      }
    case 'telegram':
      return {
        url: url,
        text: message
      }
    case 'email':
      return {
        subject: `Check out ${user.name || user.username}'s profile`,
        body: `${message}\n\n${url}`
      }
    default:
      return {
        url: url,
        text: message
      }
  }
}

function generateTwitterShareUrl(url: string, user: any) {
  const text = `Check out ${user.name || user.username}'s profile${user.headline ? ` - ${user.headline}` : ''}`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
}

function generateLinkedInShareUrl(url: string, user: any) {
  const title = `${user.name || user.username}'s Profile`
  const summary = `Professional profile of ${user.name || user.username}${user.headline ? ` - ${user.headline}` : ''}`
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`
}

function generateFacebookShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

function generateWhatsAppShareUrl(url: string, user: any) {
  const text = `Check out ${user.name || user.username}'s profile: ${url}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

function generateTelegramShareUrl(url: string, user: any) {
  const text = `Check out ${user.name || user.username}'s profile`
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
}

function generateEmailShareUrl(user: any, url: string) {
  const subject = `Check out ${user.name || user.username}'s profile`
  const body = `I thought you might be interested in ${user.name || user.username}'s profile:\n\n${url}`
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
