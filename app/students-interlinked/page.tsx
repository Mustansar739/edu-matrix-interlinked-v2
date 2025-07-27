'use client'

import { Suspense, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { StoriesSection } from '@/components/students-interlinked/stories'
import StudentsInterlinkedSidebar from '@/components/students-interlinked/core/StudentsInterlinkedSidebar'
import StudentsInterlinkedRightPanel from '@/components/students-interlinked/core/StudentsInterlinkedRightPanel'
import GroupsComponent from '@/components/students-interlinked/groups/GroupsComponent'
import FollowersList from '@/components/students-interlinked/followers/FollowersList'
import FollowSuggestions from '@/components/students-interlinked/followers/FollowSuggestions'
import { useNotifications } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, TrendingUp, BookOpen, Coffee, Search, Users, UsersIcon, UserPlus } from 'lucide-react'

// Dynamic imports for components using React Query to avoid SSR issues
const PostCreator = dynamic(() => import('@/components/students-interlinked/feed/PostCreator'), {
  ssr: false,
  loading: () => (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/6"></div>
        </div>
      </CardContent>
    </Card>
  )
})

const NewsFeed = dynamic(() => import('@/components/students-interlinked/feed/NewsFeed'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="w-full">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

// Reusable loading components
const CardLoading = () => (
  <Card>
    <CardContent className="p-4">
      <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </CardContent>
  </Card>
)

const PostLoading = () => (
  <Card>
    <CardContent className="p-4">
      <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </CardContent>
  </Card>
)

/**
 * Students Interlinked Main Page
 * Facebook-like educational social platform
 * Features: Posts, Stories, Comments, Real-time updates, Educational context
 */
export default function StudentsInterlinkedPage() {
  const { data: session, status } = useSession()
  const notifications = useNotifications()
  
  // State for mobile navbar tabs
  const [activeMobileTab, setActiveMobileTab] = useState<'main' | 'profile' | 'groups'>('main')
  const [searchQuery, setSearchQuery] = useState('')

  // Optimized tab switching with useCallback
  const handleTabSwitch = useCallback((tab: 'main' | 'profile' | 'groups') => {
    setActiveMobileTab(tab)
  }, [])

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // TODO: Implement actual search functionality
  }, [])

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin?callbackUrl=/students-interlinked')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Navigation Tabs */}
            <div className="flex space-x-1" role="tablist" aria-label="Mobile navigation">
              <Button
                variant={activeMobileTab === 'main' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabSwitch('main')}
                className="flex items-center space-x-2"
                aria-selected={activeMobileTab === 'main'}
                role="tab"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden xs:inline">Feed</span>
              </Button>
              <Button
                variant={activeMobileTab === 'profile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabSwitch('profile')}
                className="flex items-center space-x-2"
                aria-selected={activeMobileTab === 'profile'}
                role="tab"
              >
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Profile</span>
              </Button>
              <Button
                variant={activeMobileTab === 'groups' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabSwitch('groups')}
                className="flex items-center space-x-2"
                aria-selected={activeMobileTab === 'groups'}
                role="tab"
              >
                <UsersIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Groups</span>
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="flex items-center space-x-2 ml-4 flex-1 max-w-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 h-8 text-sm"
                  aria-label="Search students, groups, posts"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Desktop Layout - Unchanged */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6">          
          <div className="lg:col-span-3">
            <StudentsInterlinkedSidebar />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-6">
            <div className="space-y-6">
              {/* Stories Section */}
              <Suspense fallback={<CardLoading />}>
                <StoriesSection userId={session?.user?.id || ''} />
              </Suspense>

              {/* Post Creator */}
              <Suspense fallback={<PostLoading />}>
                <PostCreator userId={session?.user?.id || ''} />
              </Suspense>

              {/* Enhanced Feed with Real-time Updates */}
              <Suspense fallback={
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              }>
                <NewsFeed userId={session?.user?.id || ''} />
              </Suspense>
            </div>
          </div>

          {/* Right Panel - Trending & Activity */}
          <div className="lg:col-span-3">
            <StudentsInterlinkedRightPanel userId={session?.user?.id || ''} />
          </div>
        </div>

        {/* Mobile Layout - Tab-based Content */}
        <div className="lg:hidden">
          {/* Main Feed Tab - Stories + Post Creator + News Feed only */}
          {activeMobileTab === 'main' && (
            <div className="space-y-6">
              {/* Stories Section */}
              <Suspense fallback={<CardLoading />}>
                <StoriesSection userId={session?.user?.id || ''} />
              </Suspense>

              {/* Post Creator */}
              <Suspense fallback={<PostLoading />}>
                <PostCreator userId={session?.user?.id || ''} />
              </Suspense>

              {/* Enhanced Feed with Real-time Updates */}
              <Suspense fallback={
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              }>
                <NewsFeed userId={session?.user?.id || ''} />
              </Suspense>
            </div>
          )}

          {/* Profile Tab - Shows Social/Discover with Followers/Following */}
          {activeMobileTab === 'profile' && (
            <div className="space-y-6">
              <Suspense fallback={<CardLoading />}>
                <Card>
                  <CardContent className="p-0">
                    <Tabs defaultValue="followers" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 rounded-none">
                        <TabsTrigger value="followers" className="text-sm">
                          <Users className="w-4 h-4 mr-2" />
                          Social
                        </TabsTrigger>
                        <TabsTrigger value="suggestions" className="text-sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Discover
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="followers" className="mt-0 border-t">
                        <div className="p-4">
                          <FollowersList userId={session?.user?.id || ''} showTabs={true} className="border-none shadow-none" />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="suggestions" className="mt-0 border-t">
                        <div className="p-4">
                          <FollowSuggestions userId={session?.user?.id || ''} className="border-none shadow-none" />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </Suspense>
            </div>
          )}

          {/* Groups Tab - Shows actual groups component */}
          {activeMobileTab === 'groups' && (
            <div className="space-y-6">
              <Suspense fallback={<CardLoading />}>
                <GroupsComponent />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
