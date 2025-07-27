'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus } from 'lucide-react'
import FollowSuggestions from '../followers/FollowSuggestions'
import FollowersList from '../followers/FollowersList'

interface RightPanelProps {
  userId: string
  className?: string
}

export default function StudentsInterlinkedRightPanel({ userId, className }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('followers')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Followers & Following System */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none">
              <TabsTrigger value="followers" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Social
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">
                <UserPlus className="w-3 h-3 mr-1" />
                Discover
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="followers" className="mt-0 border-t">
              <div className="p-4">
                <FollowersList userId={userId} showTabs={true} className="border-none shadow-none" />
              </div>
            </TabsContent>
            
            <TabsContent value="suggestions" className="mt-0 border-t">
              <div className="p-4">
                <FollowSuggestions userId={userId} className="border-none shadow-none" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Activity Feed Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activity feed will be implemented based on followers and following activity.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
