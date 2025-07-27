'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserCheck, 
  UserX,
  MoreHorizontal,
  MessageCircle,
  UserPlus
} from 'lucide-react'
import { useFollowers, useFollowing, useUnfollowUser } from '@/hooks/students-interlinked/useFollowers'

interface FollowersListProps {
  userId: string
  className?: string
  showTabs?: boolean
}

export default function FollowersList({ userId, className, showTabs = true }: FollowersListProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers')
  const { data: followers, isLoading: followersLoading } = useFollowers(userId)
  const { data: following, isLoading: followingLoading } = useFollowing(userId)
  const { mutate: unfollowUser } = useUnfollowUser()

  const handleUnfollow = (unfollowUserId: string) => {
    unfollowUser(unfollowUserId)
  }

  const renderUsersList = (users: any[], isFollowing = false) => {
    if (!users?.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {isFollowing ? 'Not following anyone yet' : 'No followers yet'}
          </p>
        </div>
      )
    }

    return (
      <ScrollArea className="h-64">
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profilePictureUrl} />
                  <AvatarFallback>
                    {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {user.name}
                    </span>
                    {user.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                  {user.headline && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user.headline}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isFollowing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnfollow(user.id)}
                    className="text-xs px-3"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Following
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-xs px-2">
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  }

  if (!showTabs) {
    // Show only followers when tabs are disabled
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Followers ({followers?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderUsersList(followers?.users || [])
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}>
          <div className="border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers" className="text-sm">
                <Users className="h-4 w-4 mr-2" />
                Followers ({followers?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="following" className="text-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Following ({following?.total || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="followers" className="mt-0">
              {followersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderUsersList(followers?.users || [])
              )}
            </TabsContent>

            <TabsContent value="following" className="mt-0">
              {followingLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderUsersList(following?.users || [], true)
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
