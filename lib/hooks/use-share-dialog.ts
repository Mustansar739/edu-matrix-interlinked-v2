'use client';

import { useState, useCallback } from 'react';

export type ServiceType = 'students-interlinked' | 'jobs' | 'freelancing' | 'edu-news';

export type SharePlatform = 
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'copy-link'
  | 'email';

interface ShareDialogState {
  isOpen: boolean;
  selectedPost: any | null;
  sharing: boolean;
  shareUrl: string | null;
  error: string | null;
}

interface ShareDialogReturn {
  isOpen: boolean;
  selectedPost: any | null;
  sharing: boolean;
  shareUrl: string | null;
  error: string | null;
  openDialog: (post: any) => void;
  closeDialog: () => void;
  shareToFacebook: () => Promise<void>;
  shareToTwitter: () => Promise<void>;
  shareToLinkedIn: () => Promise<void>;
  shareToWhatsApp: () => Promise<void>;
  shareToTelegram: () => Promise<void>;
  copyLink: () => Promise<void>;
  shareViaEmail: () => Promise<void>;
  trackShare: (platform: SharePlatform) => Promise<void>;
}

/**
 * Hook for managing share dialog functionality
 * Works across all services: students-interlinked, jobs, freelancing, edu-news
 */
export function useShareDialog(serviceType: ServiceType = 'students-interlinked'): ShareDialogReturn {
  const [state, setState] = useState<ShareDialogState>({
    isOpen: false,
    selectedPost: null,
    sharing: false,
    shareUrl: null,
    error: null,
  });

  const setSharing = useCallback((sharing: boolean) => {
    setState(prev => ({ ...prev, sharing }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const generateShareUrl = useCallback((post: any): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/${serviceType}/posts/${post.id}`;
  }, [serviceType]);

  const openDialog = useCallback((post: any) => {
    const shareUrl = generateShareUrl(post);
    setState({
      isOpen: true,
      selectedPost: post,
      sharing: false,
      shareUrl,
      error: null,
    });
  }, [generateShareUrl]);

  const closeDialog = useCallback(() => {
    setState({
      isOpen: false,
      selectedPost: null,
      sharing: false,
      shareUrl: null,
      error: null,
    });
  }, []);

  const trackShare = useCallback(async (platform: SharePlatform) => {
    if (!state.selectedPost) return;

    try {
      await fetch('/api/analytics/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: state.selectedPost.id,
          serviceType,
          platform,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log(`✅ Share tracked: ${platform}`);
    } catch (err) {
      console.error('❌ Failed to track share:', err);
      // Don't throw error for analytics - it's not critical
    }
  }, [state.selectedPost, serviceType]);

  const shareToFacebook = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(state.shareUrl)}`;
      
      // Open Facebook share dialog
      window.open(
        facebookUrl,
        'facebook-share',
        'width=600,height=400,scrollbars=yes,resizable=yes'
      );

      // Track the share
      await trackShare('facebook');
      
      console.log('✅ Shared to Facebook');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share to Facebook';
      setError(errorMessage);
      console.error('❌ Failed to share to Facebook:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, trackShare, setSharing, setError]);

  const shareToTwitter = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const text = state.selectedPost.title || state.selectedPost.content?.substring(0, 100) || '';
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(state.shareUrl)}&text=${encodeURIComponent(text)}`;
      
      window.open(
        twitterUrl,
        'twitter-share',
        'width=600,height=400,scrollbars=yes,resizable=yes'
      );

      await trackShare('twitter');
      console.log('✅ Shared to Twitter');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share to Twitter';
      setError(errorMessage);
      console.error('❌ Failed to share to Twitter:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, trackShare, setSharing, setError]);

  const shareToLinkedIn = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(state.shareUrl)}`;
      
      window.open(
        linkedinUrl,
        'linkedin-share',
        'width=600,height=400,scrollbars=yes,resizable=yes'
      );

      await trackShare('linkedin');
      console.log('✅ Shared to LinkedIn');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share to LinkedIn';
      setError(errorMessage);
      console.error('❌ Failed to share to LinkedIn:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, trackShare, setSharing, setError]);

  const shareToWhatsApp = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const text = `Check this out: ${state.shareUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      
      window.open(whatsappUrl, '_blank');

      await trackShare('whatsapp');
      console.log('✅ Shared to WhatsApp');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share to WhatsApp';
      setError(errorMessage);
      console.error('❌ Failed to share to WhatsApp:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, trackShare, setSharing, setError]);

  const shareToTelegram = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const text = `Check this out: ${state.shareUrl}`;
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(state.shareUrl)}&text=${encodeURIComponent(text)}`;
      
      window.open(telegramUrl, '_blank');

      await trackShare('telegram');
      console.log('✅ Shared to Telegram');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share to Telegram';
      setError(errorMessage);
      console.error('❌ Failed to share to Telegram:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, trackShare, setSharing, setError]);

  const copyLink = useCallback(async () => {
    if (!state.shareUrl) return;

    setSharing(true);
    setError(null);

    try {
      await navigator.clipboard.writeText(state.shareUrl);
      
      await trackShare('copy-link');
      console.log('✅ Link copied to clipboard');
      
      // You might want to show a toast notification here
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy link';
      setError(errorMessage);
      console.error('❌ Failed to copy link:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, trackShare, setSharing, setError]);

  const shareViaEmail = useCallback(async () => {
    if (!state.shareUrl || !state.selectedPost) return;

    setSharing(true);
    setError(null);

    try {
      const subject = `Check out this ${serviceType.replace('-', ' ')} post`;
      const body = `I thought you might be interested in this: ${state.shareUrl}`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      window.location.href = mailtoUrl;

      await trackShare('email');
      console.log('✅ Email share initiated');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share via email';
      setError(errorMessage);
      console.error('❌ Failed to share via email:', err);
    } finally {
      setSharing(false);
    }
  }, [state.shareUrl, state.selectedPost, serviceType, trackShare, setSharing, setError]);

  return {
    isOpen: state.isOpen,
    selectedPost: state.selectedPost,
    sharing: state.sharing,
    shareUrl: state.shareUrl,
    error: state.error,
    openDialog,
    closeDialog,
    shareToFacebook,
    shareToTwitter,
    shareToLinkedIn,
    shareToWhatsApp,
    shareToTelegram,
    copyLink,
    shareViaEmail,
    trackShare,
  };
}
