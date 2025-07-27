'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Globe, Lock, EyeOff, Users, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import GroupCard from './GroupCard'

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

interface JoinGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupJoined: (groupId: string) => void
  userId: string
}

const GROUP_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'STUDY_GROUPS', label: 'Study Groups' },
  { value: 'ACADEMIC_SUBJECTS', label: 'Academic Subjects' },
  { value: 'INSTITUTIONS', label: 'Institutions' },
  { value: 'CAREER_DEVELOPMENT', label: 'Career Development' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'ARTS_CULTURE', label: 'Arts & Culture' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'HOBBIES', label: 'Hobbies' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'OTHER', label: 'Other' }
]

export default function JoinGroupDialog({
  open,
  onOpenChange,
  onGroupJoined,
  userId
}: JoinGroupDialogProps) {
  const { toast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [joiningGroups, setJoiningGroups] = useState<Set<string>>(new Set())

  const searchGroups = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '20',
        privacy: 'PUBLIC' // Only show public groups for discovery
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/students-interlinked/groups?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        // Filter out groups user has already joined
        const availableGroups = data.groups?.filter((group: Group) => !group.isJoined) || []
        setGroups(availableGroups)
      } else {
        toast({
          title: 'Failed to search groups',
          description: 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroups(prev => new Set(prev).add(groupId))
    
    try {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/join`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.status === 'joined') {
          toast({
            title: 'Successfully joined group!',
            description: result.message,
          })
          onGroupJoined(groupId)
          // Remove the group from the list since user joined
          setGroups(prev => prev.filter(group => group.id !== groupId))
        } else if (result.status === 'request_sent') {
          toast({
            title: 'Join request sent',
            description: result.message,
          })
          // Keep the group in the list but update its status
          setGroups(prev => prev.map(group => 
            group.id === groupId 
              ? { ...group, joinRequestPending: true }
              : group
          ))
        }
      } else {
        const errorData = await response.json()
        toast({
          title: 'Failed to join group',
          description: errorData.error || 'An unexpected error occurred',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      })
    } finally {
      setJoiningGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  // Search groups when dialog opens or filters change
  useEffect(() => {
    if (open) {
      searchGroups()
    }
  }, [open, selectedCategory])

  // Debounced search when query changes
  useEffect(() => {
    if (!open) return

    const timeoutId = setTimeout(() => {
      searchGroups()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Discover & Join Groups</DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Groups</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, description, or tags..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-48">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No groups found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse different categories
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onJoin={() => handleJoinGroup(group.id)}
                    showJoinButton
                    loading={joiningGroups.has(group.id)}
                    detailed
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {groups.length > 0 && `Found ${groups.length} groups`}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
