// ==========================================
// PROFILE ANALYTICS SERVICE
// ==========================================
// Handles profile view tracking and analytics

import { prisma } from '@/lib/prisma';
import { ViewType } from '@/types/profile';

interface TrackViewParams {
  viewerId: string;
  profileId: string;
  viewType: ViewType;
  section?: string;
  ipAddress?: string;
  userAgent?: string;
  // Note: country and source would need to be added to ProfileView schema to be tracked
}

// ==========================================
// TRACK PROFILE VIEW
// ==========================================

async function trackProfileView(params: TrackViewParams) {
  const { 
    viewerId, 
    profileId, 
    viewType, 
    section,
    ipAddress,
    userAgent
  } = params;

  try {
    // Don't track self-views
    if (viewerId === profileId) {
      return;
    }

    // Check if this view was already tracked recently (within 1 hour)
    const recentView = await prisma.profileView.findFirst({
      where: {
        viewerId,
        profileId,
        viewedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      }
    });

    if (recentView) {
      // Update existing view with new information
      await prisma.profileView.update({
        where: { id: recentView.id },        data: {
          viewedAt: new Date(),
          viewType,
          ipAddress,
          userAgent
        }
      });
    } else {
      // Create new view record
      await prisma.profileView.create({        data: {
          viewerId,
          profileId,
          viewedAt: new Date(),
          viewType,
          ipAddress,
          userAgent
        }
      });

      // Update profile view count
      await prisma.user.update({
        where: { id: profileId },
        data: {
          resumeViews: { increment: 1 },
          lastResumeView: new Date()
        }
      });
    }    // Track section view if specified
    if (section) {
      // Log section view for future analytics implementation
      // Could be stored in a separate section_views table
    }

  } catch (error) {
    console.error('Error tracking profile view:', error);
    // Don't throw error - analytics failure shouldn't break the app
  }
}

// ==========================================
// GET PROFILE ANALYTICS
// ==========================================

async function getProfileAnalytics(profileId: string, days: number = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get view data
    const views = await prisma.profileView.findMany({
      where: {
        profileId,
        viewedAt: { gte: startDate }
      },
      include: {        viewer: {
          select: {
            id: true,
            name: true,
            avatar: true, // This should match the actual User schema field name
            profession: true,
            city: true,
            country: true
          }
        }
      },
      orderBy: { viewedAt: 'desc' }
    });    // Calculate analytics
    const totalViews = views.length;
    const uniqueViewers = new Set(views.map(v => v.viewerId)).size;
    const countries = [...new Set(views.map(v => v.viewer.country).filter(Boolean))];
    
    // Group by date
    const viewsByDate = views.reduce((acc, view) => {
      const date = view.viewedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates with 0 views for better charting
    const fillMissingDates = (startDate: Date, endDate: Date, data: Record<string, number>) => {
      const filled: Record<string, number> = {};
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        filled[dateStr] = data[dateStr] || 0;
        current.setDate(current.getDate() + 1);
      }
      return filled;
    };

    const filledViewsByDate = fillMissingDates(startDate, new Date(), viewsByDate);

    // Group by country (from viewer's country)
    const viewsByCountry = views.reduce((acc, view) => {
      if (view.viewer.country) {
        acc[view.viewer.country] = (acc[view.viewer.country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Group by viewer profession for better insights
    const viewsByProfession = views.reduce((acc, view) => {
      const profession = view.viewer.profession || 'Unknown';
      acc[profession] = (acc[profession] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate source tracking from user agent (basic implementation)
    const viewsBySource = views.reduce((acc, view) => {
      let source = 'Direct';
      if (view.userAgent) {
        if (view.userAgent.includes('Mobile')) source = 'Mobile';
        else if (view.userAgent.includes('iPad') || view.userAgent.includes('Tablet')) source = 'Tablet';
        else source = 'Desktop';
      }
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);    // Recent viewers (last 10)
    const recentViewers = views
      .slice(0, 10)
      .map(view => ({
        viewer: view.viewer,
        viewedAt: view.viewedAt,
        viewType: view.viewType,
        country: view.viewer.country // Get country from viewer's profile
      }));return {
      summary: {
        totalViews,
        uniqueViewers,
        globalReach: countries.length,
        period: days
      },
      trends: {
        viewsByDate: filledViewsByDate,
        viewsByCountry,
        viewsBySource,
        viewsByProfession
      },
      recentActivity: recentViewers,
      insights: {
        mostActiveCountry: Object.entries(viewsByCountry)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null,
        primarySource: Object.entries(viewsBySource)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null,
        topProfession: Object.entries(viewsByProfession)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null,
        averageViewsPerDay: Math.round((totalViews / days) * 100) / 100,
        weekOverWeekGrowth: calculateWeekOverWeekGrowth(filledViewsByDate, days),
        peakViewingDay: getPeakViewingDay(filledViewsByDate)
      }
    };

  } catch (error) {
    console.error('Error getting profile analytics:', error);
    throw new Error('Failed to fetch profile analytics');
  }
}

// ==========================================
// HELPER FUNCTIONS FOR ENHANCED ANALYTICS
// ==========================================

function calculateWeekOverWeekGrowth(viewsByDate: Record<string, number>, days: number): number {
  if (days < 14) return 0; // Need at least 2 weeks of data
  
  const dates = Object.keys(viewsByDate).sort();
  const midPoint = Math.floor(dates.length / 2);
  
  const firstHalfViews = dates.slice(0, midPoint).reduce((sum, date) => sum + viewsByDate[date], 0);
  const secondHalfViews = dates.slice(midPoint).reduce((sum, date) => sum + viewsByDate[date], 0);
  
  if (firstHalfViews === 0) return secondHalfViews > 0 ? 100 : 0;
  return Math.round(((secondHalfViews - firstHalfViews) / firstHalfViews) * 100);
}

function getPeakViewingDay(viewsByDate: Record<string, number>): string | null {
  const entries = Object.entries(viewsByDate);
  if (entries.length === 0) return null;
  
  const peak = entries.reduce((max, [date, views]) => 
    views > max.views ? { date, views } : max, 
    { date: '', views: 0 }
  );
  
  return peak.views > 0 ? peak.date : null;
}

// ==========================================
// TRACK PROFILE SHARING
// ==========================================

async function trackProfileShare(
  profileId: string,
  platform: string,
  userId?: string
) {
  try {
    // Future implementation: track sharing events
    // For now, this provides the interface for future development
    // Could store in a separate sharing_events table

    // Could store in a separate sharing_events table
    // await prisma.sharingEvent.create({
    //   data: {
    //     profileId,
    //     platform,
    //     userId,
    //     sharedAt: new Date()
    //   }
    // });

  } catch (error) {
    console.error('Error tracking profile share:', error);
  }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

export {
  trackProfileView,
  getProfileAnalytics,
  trackProfileShare
};
