import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateProfileMetadata } from '@/lib/seo/profile-metadata';
import { trackProfileShare } from '@/lib/analytics/profile-analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    
    // Get the profile user
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        headline: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        location: true,
        profileVisibility: true,
      }
    });

    if (!profileUser || profileUser.profileVisibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'Profile not found or private' },
        { status: 404 }
      );
    }    // Generate simple metadata for sharing
    const shareData = {
      title: profileUser.headline || `${profileUser.firstName} ${profileUser.lastName}`,
      description: profileUser.bio || 'Check out this profile',
      image: profileUser.profilePictureUrl,
    };

    // Track sharing if platform is specified
    if (platform) {
      const session = await auth();
      await trackProfileShare(
        profileUser.id,
        platform,
        session?.user?.id
      );
    }    return NextResponse.json({
      shareData,
      shareUrl: `${process.env.NEXTAUTH_URL}/u/${username}`,
      profileData: {
        username: profileUser.username,
        fullName: `${profileUser.firstName} ${profileUser.lastName}`,
        headline: profileUser.headline,
        bio: profileUser.bio,
        profilePicture: profileUser.profilePictureUrl,
        coverPhoto: profileUser.coverPhotoUrl,
        location: profileUser.location,
      }
    });

  } catch (error) {
    console.error('Profile sharing fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const body = await request.json();
    const { platform, message } = body;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    // Get the profile user
    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, profileVisibility: true }
    });

    if (!profileUser || profileUser.profileVisibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'Profile not found or private' },
        { status: 404 }
      );
    }    // Track the sharing event
    const session = await auth();
    await trackProfileShare(
      profileUser.id,
      platform,
      session?.user?.id
    );

    // Generate platform-specific sharing URLs
    const baseUrl = `${process.env.NEXTAUTH_URL}/u/${username}`;
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(baseUrl)}&text=${encodeURIComponent(message || 'Check out this profile')}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(baseUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message || 'Check out this profile'} ${baseUrl}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(baseUrl)}&text=${encodeURIComponent(message || 'Check out this profile')}`,
      copy: baseUrl,
    };

    return NextResponse.json({
      message: 'Sharing tracked successfully',
      shareUrl: shareUrls[platform] || baseUrl,
      platform
    });

  } catch (error) {
    console.error('Profile sharing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
