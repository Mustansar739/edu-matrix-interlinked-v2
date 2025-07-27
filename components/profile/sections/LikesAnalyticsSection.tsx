// ==========================================
// LIKES ANALYTICS SECTION - User Likes Statistics
// ==========================================
// Shows detailed like analytics for profile owners

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UnifiedProfile, LikesAnalyticsData, ContentType } from '@/types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Users,
  User,
  Calendar,
  Award,
  MessageSquare,
  FileText,
  Briefcase,
  GraduationCap,
  Star,
  Eye,
  BarChart3,
  Activity,
  Target,
  Zap
} from 'lucide-react';

interface LikesAnalyticsSectionProps {
  profile: UnifiedProfile;
  canEdit: boolean;
}

export function LikesAnalyticsSection({ profile, canEdit }: LikesAnalyticsSectionProps) {
  const [analyticsData, setAnalyticsData] = useState<LikesAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (canEdit) {
      fetchAnalytics();
    }
  }, [canEdit, profile.username, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile/${profile.username}/likes`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch likes analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Content type icons and labels
  const contentTypeConfig: Record<ContentType, { icon: React.ReactNode; label: string; color: string }> = {
    post: { icon: <FileText className="h-4 w-4" />, label: 'Posts', color: 'bg-blue-500' },
    story: { icon: <Zap className="h-4 w-4" />, label: 'Stories', color: 'bg-purple-500' },
    comment: { icon: <MessageSquare className="h-4 w-4" />, label: 'Comments', color: 'bg-green-500' },
    project: { icon: <Target className="h-4 w-4" />, label: 'Projects', color: 'bg-orange-500' },
    achievement: { icon: <Award className="h-4 w-4" />, label: 'Achievements', color: 'bg-yellow-500' },
    work_experience: { icon: <Briefcase className="h-4 w-4" />, label: 'Work Experience', color: 'bg-indigo-500' },
    education: { icon: <GraduationCap className="h-4 w-4" />, label: 'Education', color: 'bg-pink-500' },
    certification: { icon: <Star className="h-4 w-4" />, label: 'Certifications', color: 'bg-cyan-500' },
    skill_endorsement: { icon: <Users className="h-4 w-4" />, label: 'Skill Endorsements', color: 'bg-teal-500' },
    profile_view: { icon: <Eye className="h-4 w-4" />, label: 'Profile Views', color: 'bg-gray-500' },
    connection: { icon: <Users className="h-4 w-4" />, label: 'Connections', color: 'bg-red-500' },
    profile: { icon: <User className="h-4 w-4" />, label: 'Profile', color: 'bg-violet-500' }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Don't show for non-owners
  if (!canEdit) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
          Likes Analytics
          <Badge variant="secondary" className="ml-auto">
            {formatNumber(profile.totalLikesReceived || 0)} total likes
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ) : analyticsData ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Growth Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Likes</p>
                        <p className="text-2xl font-bold">{formatNumber(analyticsData.totalLikes)}</p>
                      </div>
                      <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold">{formatNumber(analyticsData.totalThisMonth)}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Growth</p>
                        <p className={`text-2xl font-bold ${
                          analyticsData.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analyticsData.growthPercentage >= 0 ? '+' : ''}
                          {analyticsData.growthPercentage.toFixed(1)}%
                        </p>
                      </div>
                      {analyticsData.growthPercentage >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Content */}
              {analyticsData.topContent.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Most Liked Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.topContent.map((content, index) => {
                        const config = contentTypeConfig[content.contentType];
                        return (
                          <div key={`${content.contentType}-${content.contentId}`} 
                               className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${config.color} text-white`}>
                                {config.icon}
                              </div>
                              <div>
                                <p className="font-medium">{config.label}</p>
                                <p className="text-sm text-gray-600">
                                  {content.title || `${content.contentType} #${content.contentId.slice(-6)}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {formatNumber(content.likes)} likes
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-6">
              {/* Likes by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Likes by Content Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analyticsData.likesByType)
                      .sort(([,a], [,b]) => b - a)
                      .map(([type, count]) => {
                        const config = contentTypeConfig[type as ContentType];
                        const percentage = (count / analyticsData.totalLikes) * 100;
                        
                        return (
                          <div key={type} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${config.color} text-white`}>
                                  {config.icon}
                                </div>
                                <span className="font-medium">{config.label}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{formatNumber(count)}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Recent Likers */}
              {analyticsData.recentLikers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Likes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.recentLikers.map((liker, index) => {
                        const config = contentTypeConfig[liker.contentType];
                        return (
                          <motion.div
                            key={`${liker.id}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={liker.profilePictureUrl} alt={liker.name} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(liker.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{liker.name}</p>
                                <p className="text-xs text-gray-600">
                                  Liked your {config.label.toLowerCase()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`p-1 rounded ${config.color} text-white mb-1`}>
                                {config.icon}
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(liker.likedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Trend */}
              {analyticsData.monthlyBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.monthlyBreakdown.slice(-6).map((month, index) => (
                        <div key={month.month} className="flex items-center justify-between p-2">
                          <span className="text-sm font-medium">{month.month}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatNumber(month.total)} likes</span>
                            <BarChart3 className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No likes data available yet.</p>
            <p className="text-sm text-gray-500">
              Start creating content to see your likes analytics!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LikesAnalyticsSection;
