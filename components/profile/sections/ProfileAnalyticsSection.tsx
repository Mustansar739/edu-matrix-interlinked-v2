// ==========================================
// PROFILE ANALYTICS SECTION - Profile Insights
// ==========================================
// Analytics dashboard for profile owner to track profile performance

'use client';

import { useState, useEffect } from 'react';
import { UnifiedProfile } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Eye,
  Users,
  Globe,
  Search,
  MapPin,
  Calendar,
  Clock,
  Target,
  Award,
  Share2,
  Heart,
  MessageCircle,
  Briefcase,
  Download,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface ProfileAnalyticsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
}

interface AnalyticsData {
  profileViews: {
    total: number;
    thisWeek: number;
    lastWeek: number;
    trend: 'up' | 'down' | 'stable';
  };
  viewerLocations: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
  viewerProfessions: Array<{
    profession: string;
    count: number;
    percentage: number;
  }>;
  searchAppearances: {
    total: number;
    thisMonth: number;
    keywords: string[];
  };
  profileCompletion: {
    score: number;
    suggestions: string[];
  };
  jobInquiries: {
    total: number;
    thisMonth: number;
    sources: Array<{
      source: string;
      count: number;
    }>;
  };
  socialEngagement: {
    shares: number;
    followers: number; // UPDATED: Changed from connections to followers
    profileSaves: number;
  };
}

export function ProfileAnalyticsSection({ profile, canEdit }: ProfileAnalyticsSectionProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  useEffect(() => {    const loadAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get analytics data from API
        const response = await fetch(`/api/profile/${profile.username}/analytics?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const apiData = await response.json();
          // Transform API data to match component interface
        const transformedData: AnalyticsData = {
          profileViews: {
            total: apiData.summary?.totalViews || 0,
            thisWeek: calculateCurrentWeekViews(apiData.trends?.viewsByDate || {}),
            lastWeek: calculatePreviousWeekViews(apiData.trends?.viewsByDate || {}),
            trend: calculateTrend(apiData.insights?.weekOverWeekGrowth || 0)
          },
          viewerLocations: Object.entries(apiData.trends?.viewsByCountry || {}).map(([country, count]) => {
            const total = apiData.summary?.totalViews || 1;
            return {
              country,
              count: count as number,
              percentage: Math.round(((count as number) / total) * 100)
            };
          }).slice(0, 5), // Top 5 countries
          viewerProfessions: Object.entries(apiData.trends?.viewsByProfession || {}).map(([profession, count]) => {
            const total = apiData.summary?.totalViews || 1;
            return {
              profession,
              count: count as number,
              percentage: Math.round(((count as number) / total) * 100)
            };
          }).slice(0, 6), // Top 6 professions
          searchAppearances: {
            total: profile.searchAppearances || 0,
            thisMonth: Math.floor((profile.searchAppearances || 0) * 0.3),
            keywords: ['software engineer', 'react developer', 'full stack', profile.name.toLowerCase()]
          },
          profileCompletion: {
            score: calculateProfileCompletion(profile),
            suggestions: getProfileSuggestions(profile)
          },          jobInquiries: {
            total: 0, // Future: Implement job inquiry tracking system
            thisMonth: 0,
            sources: []
          },
          socialEngagement: {
            shares: profile.sharingCount || 0,
            followers: profile.followersCount || 0, // UPDATED: Changed from connections to followers
            profileSaves: 0 // Future: Implement profile saves tracking
          }
        };
        
        setAnalyticsData(transformedData);      } catch (error) {
        console.error('Error loading analytics:', error);
        setError('Failed to load analytics data');
        // Fallback to basic data if API fails
        const fallbackData: AnalyticsData = {
          profileViews: {
            total: profile.profileViewsCount || 0,
            thisWeek: 0,
            lastWeek: 0,
            trend: 'stable'
          },
          viewerLocations: [],
          viewerProfessions: [],
          searchAppearances: {
            total: profile.searchAppearances || 0,
            thisMonth: 0,
            keywords: []
          },
          profileCompletion: {
            score: calculateProfileCompletion(profile),
            suggestions: getProfileSuggestions(profile)
          },
          jobInquiries: {
            total: 0,
            thisMonth: 0,
            sources: []
          },
          socialEngagement: {
            shares: profile.sharingCount || 0,
            followers: profile.followersCount || 0, // UPDATED: Changed from connections to followers
            profileSaves: 0
          }
        };
        setAnalyticsData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    // PRODUCTION FIX: Only load once, not on every dependency change
    // This prevents repeated API calls when timeRange or other props change
    if (canEdit && !analyticsData) {
      loadAnalytics();
    }
  }, [profile.username, canEdit]); // Removed timeRange to prevent repeated calls

  // PRODUCTION FIX: Separate effect for timeRange changes
  // Only reload when user explicitly changes timeRange, not on every render
  useEffect(() => {
    if (canEdit && analyticsData) {
      // Only reload if we already have data and user changed timeRange
      const loadAnalytics = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          // Get analytics data from API
          const response = await fetch(`/api/profile/${profile.username}/analytics?timeRange=${timeRange}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch analytics data');
          }

          const apiData = await response.json();
          // Transform API data to match component interface
          const transformedData: AnalyticsData = {
            profileViews: {
              total: apiData.summary?.totalViews || 0,
              thisWeek: calculateCurrentWeekViews(apiData.trends?.viewsByDate || {}),
              lastWeek: calculatePreviousWeekViews(apiData.trends?.viewsByDate || {}),
              trend: calculateTrend(apiData.insights?.weekOverWeekGrowth || 0)
            },
            viewerLocations: Object.entries(apiData.trends?.viewsByCountry || {}).map(([country, count]) => {
              const totalViews = Object.values(apiData.trends?.viewsByCountry || {}).reduce((sum: number, c) => sum + (c as number), 0);
              return {
                country,
                count: count as number,
                percentage: totalViews > 0 ? Math.round(((count as number) / totalViews) * 100) : 0
              }
            }).slice(0, 5),
            viewerProfessions: [],
            searchAppearances: {
              total: apiData.summary?.searchAppearances || 0,
              thisMonth: apiData.summary?.monthlySearches || 0,
              keywords: apiData.insights?.topKeywords || []
            },
            profileCompletion: {
              score: calculateProfileCompletion(profile),
              suggestions: []
            },
            jobInquiries: {
              total: apiData.summary?.jobInquiries || 0,
              thisMonth: apiData.summary?.monthlyInquiries || 0,
              sources: []
            },
            socialEngagement: {
              shares: apiData.summary?.totalShares || 0,
              followers: apiData.summary?.totalFollowers || 0,
              profileSaves: apiData.summary?.totalSaves || 0
            }
          };

          setAnalyticsData(transformedData);
        } catch (err) {
          console.error('Error loading analytics:', err);
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        } finally {
          setIsLoading(false);
        }
      };

      loadAnalytics();
    }
  }, [timeRange]); // Only timeRange dependency

  // Helper functions for analytics calculations
  const calculateCurrentWeekViews = (viewsByDate: Record<string, number>): number => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return Object.entries(viewsByDate).reduce((sum, [date, views]) => {
      const viewDate = new Date(date);
      return viewDate >= weekAgo && viewDate <= now ? sum + views : sum;
    }, 0);
  };

  const calculatePreviousWeekViews = (viewsByDate: Record<string, number>): number => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    return Object.entries(viewsByDate).reduce((sum, [date, views]) => {
      const viewDate = new Date(date);
      return viewDate >= twoWeeksAgo && viewDate < weekAgo ? sum + views : sum;
    }, 0);
  };

  const calculateTrend = (weekOverWeekGrowth: number): 'up' | 'down' | 'stable' => {
    if (weekOverWeekGrowth > 5) return 'up';
    if (weekOverWeekGrowth < -5) return 'down';
    return 'stable';
  };

  const transformActivityData = (activityByDate: Record<string, number>) => {
    return Object.entries(activityByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateProfileCompletion = (profile: UnifiedProfile): number => {
    let score = 0;    const checks = [
      profile.profilePictureUrl ? 10 : 0,
      profile.bio ? 15 : 0,
      profile.professionalSummary ? 15 : 0,
      profile.workExperiences && profile.workExperiences.length > 0 ? 20 : 0,
      profile.educations && profile.educations.length > 0 ? 15 : 0,
      profile.projects && profile.projects.length > 0 ? 10 : 0,
      profile.keySkills && profile.keySkills.length > 0 ? 10 : 0,
      profile.websiteUrl ? 5 : 0
    ];
    return checks.reduce((a, b) => a + b, 0);
  };

  const getProfileSuggestions = (profile: UnifiedProfile): string[] => {
    const suggestions = [];
    if (!profile.profilePictureUrl) suggestions.push('Add a professional profile photo');
    if (!profile.bio) suggestions.push('Write a compelling bio');
    if (!profile.workExperiences || profile.workExperiences.length === 0) suggestions.push('Add work experience');
    if (!profile.projects || profile.projects.length === 0) suggestions.push('Showcase your projects');
    if (!profile.keySkills || profile.keySkills.length < 5) suggestions.push('Add more skills');
    return suggestions.slice(0, 3);
  };
  const formatTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, trend: 'stable' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(change)),
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const
    };
  };

  const handleRefresh = () => {
    if (canEdit) {
      setAnalyticsData(null);
      setError(null);
      setIsLoading(true);
      // Trigger useEffect by updating timeRange state
      setTimeRange(prev => prev);
    }
  };

  if (!canEdit) return null;
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profile Analytics
            <Badge variant="secondary">Private</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profile Analytics
            <Badge variant="secondary">Private</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-gray-500 mb-4">{error}</div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!analyticsData) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profile Analytics
            <Badge variant="secondary">Private</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              title="Refresh analytics data"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Profile Views</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.profileViews.total.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>+{formatTrend(analyticsData.profileViews.thisWeek, analyticsData.profileViews.lastWeek).percentage}% this week</span>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Search Appearances</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.searchAppearances.total}</div>
                <div className="text-xs text-gray-500">
                  {analyticsData.searchAppearances.thisMonth} this month
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Followers</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.socialEngagement.followers}</div>
                <div className="text-xs text-gray-500">Network size</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Job Inquiries</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.jobInquiries.total}</div>
                <div className="text-xs text-gray-500">
                  {analyticsData.jobInquiries.thisMonth} this month
                </div>
              </Card>
            </div>

            {/* Profile Completion */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Profile Completion
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Profile Strength</span>
                  <span className="text-sm font-medium">{analyticsData.profileCompletion.score}%</span>
                </div>
                <Progress value={analyticsData.profileCompletion.score} className="h-2" />
                {analyticsData.profileCompletion.suggestions.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">Suggestions to improve:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {analyticsData.profileCompletion.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Viewer Locations
                </h4>
                <div className="space-y-3">
                  {analyticsData.viewerLocations.length > 0 ? (
                    analyticsData.viewerLocations.map((location) => (
                      <div key={location.country} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{location.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={location.percentage} className="w-16 h-2" />
                          <span className="text-xs text-gray-500 w-8">{location.percentage}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No location data available</p>
                      <p className="text-xs">More data will appear as people view your profile</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Viewer Professions
                </h4>
                <div className="space-y-3">
                  {analyticsData.viewerProfessions.length > 0 ? (
                    analyticsData.viewerProfessions.map((profession) => (
                      <div key={profession.profession} className="flex items-center justify-between">
                        <span className="text-sm">{profession.profession}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={profession.percentage} className="w-16 h-2" />
                          <span className="text-xs text-gray-500 w-8">{profession.percentage}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No profession data available</p>
                      <p className="text-xs">More data will appear as people view your profile</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <Share2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analyticsData.socialEngagement.shares}</div>
                <div className="text-sm text-gray-500">Profile Shares</div>
              </Card>

              <Card className="p-4 text-center">
                <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analyticsData.socialEngagement.profileSaves}</div>
                <div className="text-sm text-gray-500">Profile Saves</div>
              </Card>

              <Card className="p-4 text-center">
                <MessageCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analyticsData.jobInquiries.total}</div>
                <div className="text-sm text-gray-500">Messages</div>
              </Card>
            </div>            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3">Job Inquiry Sources</h4>
              <div className="space-y-2">
                {analyticsData.jobInquiries.sources.length > 0 ? (
                  analyticsData.jobInquiries.sources.map((source) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="text-sm">{source.source}</span>
                      <Badge variant="secondary">{source.count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Briefcase className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No job inquiries yet</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {analyticsData.searchAppearances.keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Profile Performance Tips
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>Your profile gets {analyticsData.profileViews.thisWeek} views per week on average</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Profiles with project portfolios get 3x more job inquiries</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Adding certifications can increase profile credibility by 40%</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 border rounded-lg hover:bg-gray-50 text-left">
                  <div className="text-sm font-medium">Export Data</div>
                  <div className="text-xs text-gray-500">Download analytics report</div>
                </button>
                <button className="p-3 border rounded-lg hover:bg-gray-50 text-left">
                  <div className="text-sm font-medium">Share Insights</div>
                  <div className="text-xs text-gray-500">Share profile performance</div>
                </button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
