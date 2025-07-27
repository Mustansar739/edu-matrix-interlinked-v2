'use client';

import React from 'react';
import { Trophy, Star, Zap, Target, Medal, Crown, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Achievement } from '../core/types';

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked?: boolean;
  showProgress?: boolean;
  className?: string;
}

export default function AchievementCard({
  achievement,
  isUnlocked = false,
  showProgress = true,
  className
}: AchievementCardProps) {
  const {
    title,
    description,
    icon,
    category,
    points,
    rarity,
    unlockedAt,
    progress
  } = achievement;

  const getCategoryIcon = () => {
    switch (category) {
      case 'social':
        return <Star className="h-5 w-5" />;
      case 'academic':
        return <Trophy className="h-5 w-5" />;
      case 'engagement':
        return <Zap className="h-5 w-5" />;
      case 'milestone':
        return <Target className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  const getRarityColor = () => {
    switch (rarity) {
      case 'common':
        return 'text-gray-600 border-gray-200';
      case 'rare':
        return 'text-blue-600 border-blue-200';
      case 'epic':
        return 'text-purple-600 border-purple-200';
      case 'legendary':
        return 'text-yellow-600 border-yellow-200';
      default:
        return 'text-gray-600 border-gray-200';
    }
  };

  const getRarityBadgeColor = () => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-700';
      case 'rare':
        return 'bg-blue-100 text-blue-700';
      case 'epic':
        return 'bg-purple-100 text-purple-700';
      case 'legendary':
        return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const progressPercentage = progress ? (progress.current / progress.target) * 100 : 0;
  const isCompleted = isUnlocked || (progress && progress.current >= progress.target);

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isCompleted ? getRarityColor() : "opacity-60 grayscale",
        isCompleted && rarity === 'legendary' && "bg-gradient-to-br from-yellow-50 to-orange-50",
        className
      )}
    >
      {/* Rarity glow effect for legendary items */}
      {isCompleted && rarity === 'legendary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-orange-200/20 animate-pulse" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isCompleted ? "bg-primary/10" : "bg-muted"
            )}>
              {getCategoryIcon()}
            </div>
            
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            </div>
          </div>

          {isCompleted && rarity === 'legendary' && (
            <Crown className="h-6 w-6 text-yellow-600" />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress bar for uncompleted achievements */}
        {!isCompleted && progress && showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{progress.current}/{progress.target}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Achievement metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs font-medium", getRarityBadgeColor())}>
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </Badge>
            
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Medal className="h-4 w-4 text-yellow-600" />
            <span className="font-medium">{points} pts</span>
          </div>
        </div>

        {/* Unlock date */}
        {isCompleted && unlockedAt && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Unlocked on {formatDate(unlockedAt)}</span>
            </div>
          </div>
        )}

        {/* Achievement icon overlay */}
        <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
          <div className="text-6xl">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
