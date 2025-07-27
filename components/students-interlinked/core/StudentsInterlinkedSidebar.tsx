/**
 * StudentsInterlinkedSidebar Component
 * 
 * Purpose: Left sidebar for the Students Interlinked social platform page
 * Features: Profile summary card, groups component, settings and navigation
 * 
 * Components:
 * - ProfileSummaryCard: Current user's profile summary (uses main profile system)
 * - GroupsComponent: Facebook-like groups functionality
 * - Settings: Quick access to notifications and settings
 * 
 * Integration: Part of the Students Interlinked social platform
 * Data Flow: All components are self-contained and fetch their own data
 * Layout: Responsive sidebar that collapses on mobile devices
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Users, 
  BookOpen, 
  Calendar,
  Bell,
  Settings,
  UserPlus,
  Clock
} from 'lucide-react'
import ProfileSummaryCard from '../../profile/ProfileSummaryCard'
import GroupsComponent from '../groups/GroupsComponent'

interface SidebarProps {
  className?: string
}

export default function StudentsInterlinkedSidebar({ className }: SidebarProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Card */}
      <ProfileSummaryCard />

      {/* Groups */}
      <GroupsComponent />

      
    </div>
  )
}
