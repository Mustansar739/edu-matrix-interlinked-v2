'use client'

import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Plus, 
  Search,
  Settings,
  Globe,
  Lock,
  EyeOff,
  Star,
  Loader2
} from 'lucide-react'
import CreateGroupDialog from './CreateGroupDialog'
import JoinGroupDialog from './JoinGroupDialog'
import GroupCard from './GroupCard'
import { useGroups, useJoinLeaveGroup } from '@/hooks/students-interlinked/useGroups'

interface Group {
  id: string
  name: string
  description: string
  about?: string
  coverPhotoUrl?: string
  profilePhotoUrl?: string
  groupType: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  visibility: 'VISIBLE' | 'HIDDEN'
  category: string
  subcategory?: string
  tags: string[]
  memberCount: number
  postCount: number
  activeMembers: number
  isJoined: boolean
  userRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt?: string
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    posts: number
  }
}

interface GroupsComponentProps {
  className?: string
}

export default function GroupsComponent({ className }: GroupsComponentProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('my-groups')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)

  const userId = session?.user?.id

  // Use the new hooks for data fetching - ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const { 
    data: myGroupsData, 
    isLoading: myGroupsLoading, 
    error: myGroupsError 
  } = useGroups({ userGroups: true, limit: 10 })

  const { 
    data: suggestedGroupsData, 
    isLoading: suggestedLoading 
  } = useGroups({ limit: 10, privacy: 'PUBLIC' })

  const { 
    data: featuredGroupsData, 
    isLoading: featuredLoading 
  } = useGroups({ featured: true, limit: 5 })

  const joinLeaveMutation = useJoinLeaveGroup()

  // Don't render if no user session - MOVED AFTER ALL HOOKS
  if (!userId) {
    return null
  }

  // Extract groups from API responses
  const myGroups = myGroupsData?.groups || []
  const suggestedGroups = suggestedGroupsData?.groups?.filter((group: any) => !group.isJoined) || []
  const featuredGroups = featuredGroupsData?.groups || []

  const loading = myGroupsLoading || suggestedLoading || featuredLoading

  const handleGroupCreated = () => {
    setCreateDialogOpen(false)
  }

  const handleGroupJoined = async (groupId: string) => {
    try {
      await joinLeaveMutation.mutateAsync({ groupId, action: 'join' })
      setJoinDialogOpen(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'PUBLIC': return <Globe className="h-3 w-3" />
      case 'PRIVATE': return <Lock className="h-3 w-3" />
      case 'SECRET': return <EyeOff className="h-3 w-3" />
      default: return <Globe className="h-3 w-3" />
    }
  }

  const getPrivacyColor = (privacy: string) => {
    switch (privacy) {
      case 'PUBLIC': return 'text-green-600'
      case 'PRIVATE': return 'text-yellow-600'
      case 'SECRET': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Groups</span>
            </div>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJoinDialogOpen(true)}
                className="h-7 w-7 p-0"
              >
                <Search className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-none">
              <TabsTrigger value="my-groups" className="text-xs">
                My Groups
              </TabsTrigger>
              <TabsTrigger value="suggested" className="text-xs">
                Discover
              </TabsTrigger>
              <TabsTrigger value="featured" className="text-xs">
                Featured
              </TabsTrigger>
            </TabsList>
            
            {/* My Groups Tab */}
            <TabsContent value="my-groups" className="mt-0 border-t">
              <div className="p-4">
                {myGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      You haven&apos;t joined any groups yet
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setCreateDialogOpen(true)}
                      className="mb-2 w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setJoinDialogOpen(true)}
                      className="w-full"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Find Groups
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {myGroups.map((group: Group) => (
                        <div key={group.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={group.profilePhotoUrl || ''} />
                                <AvatarFallback className="text-xs">
                                  {group.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{group.name}</p>
                                <div className="flex items-center space-x-2">
                                  <div className={`flex items-center space-x-1 ${getPrivacyColor(group.privacy)}`}>
                                    {getPrivacyIcon(group.privacy)}
                                    <span className="text-xs">{group.privacy.toLowerCase()}</span>
                                  </div>
                                  {group.userRole && (
                                    <Badge variant="outline" className="text-xs px-1 h-4">
                                      {group.userRole.toLowerCase()}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {group.memberCount} members • {group.postCount} posts
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-10">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-6 text-xs"
                              onClick={() => router.push(`/students-interlinked/groups/${group.id}`)}
                            >
                              View
                            </Button>
                            {group.userRole === 'ADMIN' && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs">
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Separator />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            {/* Suggested Groups Tab */}
            <TabsContent value="suggested" className="mt-0 border-t">
              <div className="p-4">
                {suggestedGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No groups to discover right now
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setJoinDialogOpen(true)}
                      className="w-full"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Groups
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {suggestedGroups.map((group: Group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          onJoin={() => handleGroupJoined(group.id)}
                          showJoinButton
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            {/* Featured Groups Tab */}
            <TabsContent value="featured" className="mt-0 border-t">
              <div className="p-4">
                {featuredGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No featured groups available
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {featuredGroups.map((group: Group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          onJoin={() => handleGroupJoined(group.id)}
                          showJoinButton={!group.isJoined}
                          featured
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={handleGroupCreated}
        userId={userId}
      />

      <JoinGroupDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onGroupJoined={handleGroupJoined}
        userId={userId}
      />
    </>
  )
}
