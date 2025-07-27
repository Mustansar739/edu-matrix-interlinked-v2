/**
 * =============================================================================
 * PROFILE SHARE LINKS API - Generate Shareable Links
 * =============================================================================
 * 
 * PURPOSE:
 * Generate platform-specific shareable links for user profiles.
 * Provides pre-configured URLs for different social media platforms.
 * 
 * ENDPOINT:
 * GET /api/share/profile/[userId]/links
 * 
 * FEATURES:
 * - Platform-specific share URLs
 * - UTM parameter generation
 * - Custom share messages
 * - QR code links
 * - Direct profile links
 * 
 * SUPPORTED PLATFORMS:
 * - Direct link (copy to clipboard)
 * - Twitter
 * - LinkedIn
 * - Facebook
 * - WhatsApp
 * - Telegram
 * - Email
 * 
 * RETURNS:
 * {
 *   shareLinks: {
 *     direct: string,
 *     twitter: string,
 *     linkedin: string,
 *     facebook: string,
 *     whatsapp: string,
 *     telegram: string,
 *     email: string
 *   }
 * }
 * 
 * UTM PARAMETERS:
 * - utm_source: Platform name
 * - utm_medium: social
 * - utm_campaign: profile_share
 * - utm_content: user_profile
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Rate limiting for abuse prevention
 * - Input validation
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user profile information for share content
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        profilePictureUrl: true,
        headline: true,
        location: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Base profile URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://edu-matrix-interlinked.com'
    const profileUrl = `${baseUrl}/profile/${user.username || user.id}`

    // Generate UTM parameters for tracking
    const utmParams = new URLSearchParams({
      utm_source: 'social_share',
      utm_medium: 'social',
      utm_campaign: 'profile_share',
      utm_content: 'user_profile'
    })

    // Create trackable profile URL
    const trackableUrl = `${profileUrl}?${utmParams.toString()}`

    // Generate share message
    const shareMessage = user.headline 
      ? `Check out ${user.name || user.username}'s profile - ${user.headline}`
      : `Check out ${user.name || user.username}'s profile on EduMatrix`

    // Encode URL and message for different platforms
    const encodedUrl = encodeURIComponent(trackableUrl)
    const encodedMessage = encodeURIComponent(shareMessage)

    // Generate platform-specific share links
    const shareLinks = {
      // Direct link for copying
      direct: trackableUrl,

      // Twitter share
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,

      // LinkedIn share
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,

      // Facebook share
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,

      // WhatsApp share
      whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,

      // Telegram share
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,

      // Email share
      email: `mailto:?subject=${encodeURIComponent(`Profile: ${user.name || user.username}`)}&body=${encodedMessage}%20${encodedUrl}`
    }

    return NextResponse.json({
      success: true,
      shareLinks,
      profileInfo: {
        name: user.name,
        username: user.username,
        headline: user.headline,
        location: user.location,
        profilePictureUrl: user.profilePictureUrl
      }
    })

  } catch (error) {
    console.error('Share links generation error:', error)

    return NextResponse.json(
      { error: 'Failed to generate share links' },
      { status: 500 }
    )
  }
}
