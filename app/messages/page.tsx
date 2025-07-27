'use client';

// ==========================================
// MAIN MESSAGES PAGE - FACEBOOK STYLE
// ==========================================
// Complete Facebook-style messaging interface with all advanced features
// Now includes URL parameter handling for direct conversation navigation

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { redirect } from 'next/navigation';
import { FacebookStyleMessagingInterface } from '@/components/messaging/FacebookStyleMessagingInterface';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  // Get conversation ID from URL parameter
  const conversationId = searchParams?.get('conversation') || null;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      redirect('/auth/signin');
    }
  }, [session, status]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading Messages</h3>
            <p className="text-muted-foreground">Setting up your conversations...</p>
          </div>
          <Progress value={33} className="w-64 mx-auto" />
        </div>
      </div>
    );
  }
  // Show authenticated messaging interface
  if (session?.user) {
    return (
      <div className="h-screen bg-background">
        <FacebookStyleMessagingInterface initialConversationId={conversationId} />
      </div>
    );
  }

  return null;
}
