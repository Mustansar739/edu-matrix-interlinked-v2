import { prisma } from '@/lib/prisma';

export async function generateResumeSlug(userName: string, username?: string, userId?: string): Promise<string> {
  // Create base slug from name
  let baseSlug = userName
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();

  // If username exists, try using it as part of the slug
  if (username) {
    const usernameSlug = `${baseSlug}-${username}`;
    const existing = await prisma.user.findFirst({
      where: {
        resumeSlug: usernameSlug,
        ...(userId && { id: { not: userId } })
      }
    });
    if (!existing) {
      return usernameSlug;
    }
  }

  // Try the base slug first
  let finalSlug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await prisma.user.findFirst({
      where: {
        resumeSlug: finalSlug,
        ...(userId && { id: { not: userId } })
      }
    });

    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    // Prevent infinite loops
    if (counter > 1000) {
      finalSlug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return finalSlug;
}

export async function autoGenerateResumeSlugForUser(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        resumeSlug: true,
        isResumePublic: true,
      }
    });

    if (!user || user.resumeSlug) {
      return user?.resumeSlug || null;
    }

    const slug = await generateResumeSlug(user.name, user.username, userId);

    // Auto-set resume as public and assign the slug
    await prisma.user.update({
      where: { id: userId },
      data: {
        resumeSlug: slug,
        isResumePublic: true,
        updatedAt: new Date(),
      }
    });

    return slug;
  } catch (error) {
    console.error('Error auto-generating resume slug:', error);
    return null;
  }
}

export function isValidResumeSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 100;
}

export function createSocialShareUrls(resumeUrl: string, userName: string) {
  const encodedUrl = encodeURIComponent(resumeUrl);
  const encodedText = encodeURIComponent(`Check out ${userName}'s professional resume`);
  
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(`${userName}'s Resume`)}&body=${encodedText}%20${encodedUrl}`,
  };
}
