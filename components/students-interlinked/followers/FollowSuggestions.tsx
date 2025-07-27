'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  UserPlus, 
  X, 
  Users, 
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useFollowSuggestions, useFollowUser, type FollowSuggestion } from '@/hooks/students-interlinked/useFollowers'

interface FollowSuggestionsProps {
  userId: string
  className?: string
  showTitle?: boolean
  maxSuggestions?: number
}

export default function FollowSuggestions({ 
  userId, 
  className, 
  showTitle = true,
  maxSuggestions = 5
}: FollowSuggestionsProps) {
  const { toast } = useToast()
  const { data: suggestions, isLoading } = useFollowSuggestions(userId, maxSuggestions)
  const { mutate: followUser, isPending } = useFollowUser()

  const handleFollow = (suggestedUserId: string, userName: string) => {
    followUser(suggestedUserId)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Suggested for you
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!suggestions?.suggestions?.length) {
    return null
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Suggested for you
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {suggestions.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={suggestion.profilePictureUrl} />
                    <AvatarFallback>
                      {suggestion.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {suggestion.name}
                      </span>
                      {suggestion.isVerified && (
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{suggestion.username}
                    </p>
                    {suggestion.headline && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {suggestion.headline}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleFollow(suggestion.id, suggestion.name)}
                  disabled={isPending}
                  className="text-xs px-3"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {suggestions.suggestions.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              <Users className="h-3 w-3 mr-1" />
              See all suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
