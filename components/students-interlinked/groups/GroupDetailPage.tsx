/**
 * @fileoverview Group Detail Page Component
 * @module GroupDetailPage
 * @category Component
 * 
 * @description
 * Production-ready Facebook-style group detail page component
 * - Comprehensive error handling and null safety
 * - Responsive design with cover photo and profile sections
 * - Real-time member management and post creation
 * - Proper TypeScript interfaces and validation
 * - Performance optimized with React Query integration
 * 
 * @requires React 18+ with hooks
 * @requires NextAuth.js session management
 * @requires Prisma ORM integration
 * @requires shadcn/ui components
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Users, 
  Settings, 
  MessageSquare, 
  Globe, 
  Lock, 
  EyeOff, 
  UserPlus, 
  UserMinus,
  Edit3,
  ArrowLeft,
  MoreHorizontal,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Share2,
  Flag,
  Upload,
  Camera,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/lib/socket/socket-context-clean'
import PostCreator from '@/components/students-interlinked/feed/PostCreator'
import PostCard from '@/components/students-interlinked/feed/PostCard'
import { useStudentsInterlinkedPosts } from '@/hooks/students-interlinked/useStudentsInterlinkedAPI'
import InvitePeopleDialog from './InvitePeopleDialog'

/**
 * Group interface with complete type safety
 */
interface Group {
  id: string
  name: string
  description: string
  about?: string
  website?: string
  location?: string
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
  allowMemberInvites: boolean
  isJoined: boolean
  userRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt?: string
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    posts: number
  }
  admins?: GroupMember[]
  moderators?: GroupMember[]
}

/**
 * Group member interface with complete user information
 */
interface GroupMember {
  id: string
  userId: string
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt: string
  isActive: boolean
  notifications: boolean
  postPermissions: boolean
  invitedBy?: string
  isMuted: boolean
  isBanned: boolean
  bannedUntil?: string
  user: {
    id: string
    name: string
    email: string
    profilePictureUrl?: string | null
    avatar?: string | null
    major?: string | null
    academicYear?: string | null
    institutionId?: string | null
  }
}

/**
 * Group post interface for feed display
 */
interface GroupPost {
  id: string
  content: string
  imageUrl?: string
  videoUrl?: string
  documentUrl?: string
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'POLL' | 'EVENT'
  visibility: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY' | 'GROUP_ONLY'
  isPinned: boolean
  createdAt: string
  updatedAt: string
  groupId: string
  authorId: string
  author: {
    id: string
    name: string
    email: string
    image?: string
    profilePicture?: string
  }
  _count: {
    likes: number
    comments: number
    shares: number
  }
  userLiked: boolean
  userShared: boolean
}

/**
 * Component props interface
 */
interface GroupDetailPageProps {
  groupId: string
  userId: string
}

/**
 * Utility function to safely get user display name
 */
const getUserDisplayName = (user: GroupMember['user'] | null | undefined): string => {
  if (!user) return 'Unknown User'
  return user.name || user.email?.split('@')[0] || 'Unknown User'
}

/**
 * Utility function to safely get user avatar
 */
const getUserAvatar = (user: GroupMember['user'] | null | undefined): string => {
  if (!user) return ''
  // Use the correct field names from our database schema
  return user.profilePictureUrl || user.avatar || ''
}

/**
 * Main GroupDetailPage Component
 */

export default function GroupDetailPage({ groupId, userId }: GroupDetailPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const { socket, isConnected, userId: socketUserId } = useSocket()
  const [activeTab, setActiveTab] = useState('posts')
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // Admin photo upload states
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false)
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false)
  const [showPhotoUploadDialog, setShowPhotoUploadDialog] = useState<'cover' | 'profile' | null>(null)
  
  // File input refs for admin photo uploads
  const coverPhotoInputRef = useRef<HTMLInputElement>(null)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  const { 
    data: postsData, 
    isLoading: postsLoading,
    refetch: refetchPosts 
  } = useStudentsInterlinkedPosts({
    page: 1,
    limit: 20,
    authorId: undefined,
    userId: session?.user?.id,
    groupId: groupId, // Pass groupId to filter posts for this specific group
    enabled: !!group && activeTab === 'posts'
  })

  const posts = postsData?.posts || []

  // Fetch group details
  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data) // Fix: API returns group directly, not wrapped in { group: ... }
      } else {
        setError('Group not found')
      }
    } catch (error) {
      setError('Failed to load group')
    }
  }

  /**
   * Fetch group members with comprehensive error handling
   */
  const fetchGroupMembers = async (): Promise<void> => {
    if (!groupId) {
      console.warn('Cannot fetch members: groupId is undefined')
      return
    }

    setMembersLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/members`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Validate response structure
      if (!data || !Array.isArray(data.members)) {
        console.error('Invalid members response structure:', data)
        setMembers([])
        return
      }

      // Filter and validate each member
      const validMembers = data.members.filter((member: any) => {
        if (!member || typeof member !== 'object') {
          console.warn('Invalid member object:', member)
          return false
        }

        if (!member.user || typeof member.user !== 'object') {
          console.warn('Member missing user data:', member)
          return false
        }

        if (!member.user.name && !member.user.email) {
          console.warn('Member user missing both name and email:', member)
          return false
        }

        return true
      }) as GroupMember[]

      setMembers(validMembers)

      // Log member count for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${validMembers.length} valid members out of ${data.members.length} total`)
      }

    } catch (error) {
      console.error('Error fetching group members:', error)
      
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load group members'
      setError(errorMessage)
      
      // Show toast notification
      toast({
        title: "Failed to load members",
        description: "Please try refreshing the page",
        variant: "destructive",
      })
      
      // Set empty array as fallback
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    const loadGroup = async () => {
      setLoading(true)
      await fetchGroup()
      setLoading(false)
    }

    loadGroup()
  }, [groupId])

  useEffect(() => {
    if (group && activeTab === 'members') {
      fetchGroupMembers()
    }
    // Posts are handled automatically by React Query hook
  }, [group, activeTab])

  // 🚀 REAL-TIME SOCKET.IO INTEGRATION: Listen for group post updates
  useEffect(() => {
    if (!socket || !isConnected || !groupId) return

    console.log('📡 Setting up Socket.IO listeners for group posts:', { groupId, isConnected })

    // Join group room for real-time updates
    socket.emit('group:join', { groupId })

    // Listen for new posts in this group
    const handleNewPost = (postData: any) => {
      console.log('📝 New post received via Socket.IO:', postData)
      
      // Only show notification if it's not the current user's post
      if (postData.authorId !== socketUserId) {
        toast({
          title: "New Group Post! 📝",
          description: `${postData.authorName} posted: ${postData.contentPreview}`,
        })
      }

      // Refetch posts to show new content
      refetchPosts()
    }

    // Listen for post updates (likes, comments)
    const handlePostUpdate = (updateData: any) => {
      console.log('🔄 Post update received via Socket.IO:', updateData)
      
      // Refetch posts to show updates
      refetchPosts()
    }

    // Listen for general notifications
    const handleNotification = (notification: any) => {
      console.log('🔔 Group notification received:', notification)
      
      // Show notification if it's relevant to this group
      if (notification.groupId === groupId && notification.type === 'GROUP_POST') {
        toast({
          title: notification.title,
          description: notification.message,
        })
      }
    }

    // Register event listeners
    socket.on('group:post_created', handleNewPost)
    socket.on('group:post_updated', handlePostUpdate)
    socket.on('notification:new', handleNotification)

    // Cleanup listeners on unmount or dependency change
    return () => {
      console.log('🧹 Cleaning up Socket.IO group listeners')
      socket.off('group:post_created', handleNewPost)
      socket.off('group:post_updated', handlePostUpdate)
      socket.off('notification:new', handleNotification)
      socket.emit('group:leave', { groupId })
    }
  }, [socket, isConnected, groupId, socketUserId, toast, refetchPosts])

  // Handle join/leave group
  const handleJoinLeave = async () => {
    if (!group) return

    setJoinLoading(true)
    try {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/join`, {
        method: group.isJoined ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setGroup(prev => prev ? {
          ...prev,
          isJoined: !prev.isJoined,
          memberCount: prev.isJoined ? prev.memberCount - 1 : prev.memberCount + 1
        } : null)
        
        toast({
          title: group.isJoined ? "Left group" : "Joined group",
          description: group.isJoined 
            ? `You have left ${group.name}` 
            : `Welcome to ${group.name}!`,
        })
      } else {
        throw new Error('Failed to join/leave group')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group membership",
        variant: "destructive",
      })
    } finally {
      setJoinLoading(false)
    }
  }

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'PUBLIC': return <Globe className="h-4 w-4" />
      case 'PRIVATE': return <Lock className="h-4 w-4" />
      case 'SECRET': return <EyeOff className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
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

  const canPost = group?.isJoined || group?.privacy === 'PUBLIC'
  const canViewMembers = group?.isJoined || group?.privacy === 'PUBLIC'
  const isAdmin = group?.userRole === 'ADMIN'
  const isModerator = group?.userRole === 'MODERATOR' || isAdmin

  /**
   * Production-ready admin photo upload functionality for groups
   * Allows admins to update cover and profile photos using ImageKit
   */
  const handleAdminPhotoUpload = useCallback(async (file: File, type: 'cover' | 'profile') => {
    if (!group || !isAdmin) {
      toast({
        title: "Access denied",
        description: "Only group admins can update photos.",
        variant: "destructive",
      })
      return false
    }

    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, or WebP image.",
          variant: "destructive",
        })
        return false
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        })
        return false
      }

      // Set loading state
      if (type === 'cover') {
        setUploadingCoverPhoto(true)
      } else {
        setUploadingProfilePhoto(true)
      }

      console.log(`🚀 Admin uploading ${type} photo for group:`, {
        groupId: group.id,
        groupName: group.name,
        fileSize: file.size,
        fileType: file.type
      })

      // Upload to ImageKit
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type === 'cover' ? 'cover-photo' : 'profile-photo')

      const uploadResponse = await fetch('/api/upload/imagekit', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadResult = await uploadResponse.json()

      // Update group via API (we'll create this endpoint next)
      const updateResponse = await fetch(`/api/students-interlinked/groups/${groupId}/photos`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type === 'cover' ? 'coverPhotoUrl' : 'profilePhotoUrl']: uploadResult.fileUrl
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Failed to update group photo')
      }

      const updatedGroup = await updateResponse.json()

      // Update local state
      setGroup(updatedGroup)

      toast({
        title: `${type === 'cover' ? 'Cover' : 'Profile'} photo updated! ✅`,
        description: `Group ${type} photo has been updated successfully. Final size: ${uploadResult.finalSizeKB}KB`,
      })

      console.log(`✅ Admin photo upload successful:`, {
        type,
        url: uploadResult.fileUrl,
        size: uploadResult.finalSizeKB + 'KB'
      })

      return true

    } catch (error) {
      console.error(`❌ Admin photo upload error:`, error)
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      // Clear loading state
      if (type === 'cover') {
        setUploadingCoverPhoto(false)
      } else {
        setUploadingProfilePhoto(false)
      }
    }
  }, [group, isAdmin, groupId, toast])

  /**
   * Handle admin photo file selection
   */
  const handleAdminPhotoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'profile') => {
    const file = event.target.files?.[0]
    if (file) {
      handleAdminPhotoUpload(file, type)
    }
    // Reset input value
    event.target.value = ''
  }, [handleAdminPhotoUpload])

  // Production-ready loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Loading skeleton that matches the final layout */}
        <div className="bg-white dark:bg-gray-800">
          {/* Cover photo skeleton */}
          <div className="h-80 w-full bg-gray-200 dark:bg-gray-700 animate-pulse relative">
            <div className="absolute top-4 left-4">
              <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
            </div>
          </div>
          
          {/* Profile section skeleton */}
          <div className="relative px-6 pb-6">
            <div className="flex items-end justify-between -mt-20 relative z-10">
              <div className="flex items-end space-x-4">
                <div className="h-40 w-40 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse border-4 border-white dark:border-gray-800" />
                <div className="pb-4 space-y-2">
                  <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex space-x-3 pb-4">
                <div className="h-10 w-24 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-10 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="h-64 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-48 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="h-32 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-64 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-64 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Production-ready error state
  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <div className="mb-4">
              {error?.includes('not found') ? (
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto" />
              ) : (
                <Flag className="h-16 w-16 text-red-400 mx-auto" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {error?.includes('not found') ? 'Group Not Found' : 'Something Went Wrong'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'We encountered an error while loading this group. Please try again.'}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  fetchGroup().finally(() => setLoading(false))
                }}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Facebook-style Cover Photo Section */}
      <div className="bg-white dark:bg-gray-800">
        {/* Cover Photo */}
        <div className="relative">
          <div 
            className="h-80 w-full bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden"
            style={{
              backgroundImage: group.coverPhotoUrl ? `url(${group.coverPhotoUrl})` : '',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {!group.coverPhotoUrl && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-80" />
            )}
            
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Cover Photo Upload Button (Admin only) - Production Ready */}
            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => coverPhotoInputRef.current?.click()}
                  disabled={uploadingCoverPhoto}
                  className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                >
                  {uploadingCoverPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {group.coverPhotoUrl ? 'Change Cover' : 'Add Cover'}
                    </>
                  )}
                </Button>
                <input
                  ref={coverPhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleAdminPhotoSelect(e, 'cover')}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Profile Section */}
          <div className="relative px-6 pb-6">
            {/* Group Profile Photo */}
            <div className="flex items-end justify-between -mt-20 relative z-10">
              <div className="flex items-end space-x-4">
                <div className="relative">
                  <Avatar className="h-40 w-40 border-4 border-white dark:border-gray-800 shadow-lg">
                    <AvatarImage src={group.profilePhotoUrl || ''} />
                    <AvatarFallback className="text-4xl font-bold bg-blue-600 text-white">
                      {group.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Profile Photo Upload Button (Admin only) - Production Ready */}
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        disabled={uploadingProfilePhoto}
                        className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-white shadow-md hover:bg-gray-50"
                        title={group.profilePhotoUrl ? 'Change profile picture' : 'Add profile picture'}
                      >
                        {uploadingProfilePhoto ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </Button>
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleAdminPhotoSelect(e, 'profile')}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                
                <div className="pb-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {group.name}
                  </h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <div className={`flex items-center space-x-1 ${getPrivacyColor(group.privacy)}`}>
                      {getPrivacyIcon(group.privacy)}
                      <span className="text-sm font-medium">{group.privacy.toLowerCase()} group</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.memberCount} members
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pb-4">
                {!group.isJoined && group.privacy !== 'SECRET' && (
                  <Button
                    onClick={handleJoinLeave}
                    disabled={joinLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Group
                  </Button>
                )}
                
                {group.isJoined && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleJoinLeave}
                      disabled={joinLoading}
                      className="px-6"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Joined
                    </Button>
                    
                    <Button variant="outline" className="px-6">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    
                    {isAdmin && (
                      <Button variant="outline" className="px-6">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    )}
                  </>
                )}
                
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Group Description */}
            <div className="mt-4">
              <p className="text-gray-700 dark:text-gray-300 text-base">
                {group.description}
              </p>
            </div>

            {/* Group Stats */}
            <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{group.memberCount} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{group.postCount} posts</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
              </div>
              {group.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{group.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Facebook-style Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-none h-auto p-0">
              <TabsTrigger 
                value="posts" 
                className="px-4 py-3 text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium"
              >
                Discussion
              </TabsTrigger>
              <TabsTrigger 
                value="members" 
                disabled={!canViewMembers}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium"
              >
                Members
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="px-4 py-3 text-gray-600 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium"
              >
                About
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Posts/Discussion Tab */}
          <TabsContent value="posts" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar - Group Info (Facebook style) */}
              <div className="lg:col-span-4">
                <div className="space-y-4">
                  {/* About Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">About this group</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.about && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {group.about}
                        </p>
                      )}
                      
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <div className={`flex items-center space-x-1 ${getPrivacyColor(group.privacy)}`}>
                            {getPrivacyIcon(group.privacy)}
                            <span className="font-medium">{group.privacy.toLowerCase()} group</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>{group.memberCount} members</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <MessageSquare className="h-4 w-4" />
                          <span>{group.postCount} posts per day</span>
                        </div>

                        {group.location && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span>{group.location}</span>
                          </div>
                        )}

                        {group.website && (
                          <div className="flex items-center space-x-2 text-sm">
                            <LinkIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <a 
                              href={group.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Visit website
                            </a>
                          </div>
                        )}
                      </div>

                      {group.tags && group.tags.length > 0 && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="font-medium mb-2 text-sm">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {group.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Members Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Members</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTab('members')}
                          disabled={!canViewMembers}
                        >
                          See all
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Show recent members preview or loading state */}
                      {membersLoading ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="text-center">
                              <div className="h-12 w-12 mx-auto mb-1 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : members.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {members.slice(0, 6).map((member) => {
                            if (!member || !member.user) return null
                            
                            const userDisplayName = getUserDisplayName(member.user)
                            const userAvatar = getUserAvatar(member.user)
                            const userInitials = userDisplayName.charAt(0).toUpperCase()

                            return (
                              <div key={member.id} className="text-center">
                                <Avatar className="h-12 w-12 mx-auto mb-1">
                                  <AvatarImage 
                                    src={userAvatar} 
                                    alt={`${userDisplayName}'s avatar`}
                                  />
                                  <AvatarFallback className="text-xs bg-blue-600 text-white">
                                    {userInitials}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={userDisplayName}>
                                  {userDisplayName.length > 10 
                                    ? `${userDisplayName.substring(0, 10)}...` 
                                    : userDisplayName
                                  }
                                </p>
                              </div>
                            )
                          }).filter(Boolean)}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No members to show
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Main Feed */}
              <div className="lg:col-span-8">
                <div className="space-y-4">
                  {/* Post Creator */}
                  {canPost && (
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <PostCreator 
                          userId={userId} 
                          groupId={groupId}
                          placeholder={`Share something with ${group.name}...`}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Posts Feed */}
                  {postsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="animate-pulse space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="space-y-2">
                                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                                </div>
                              </div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <Card className="shadow-sm">
                      <CardContent className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No posts yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Be the first to share something in this group
                        </p>
                        {canPost && (
                          <Button onClick={() => {
                            // Focus on post creator
                          }}>
                            Create Post
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => {
                        const transformedPost = {
                          ...post,
                          isLiked: post.likes?.some(like => like.user?.id === userId) || false,
                          isBookmarked: false,
                          privacy: post.visibility?.toLowerCase() as 'public' | 'friends' | 'private' | 'groups'
                        };
                        
                        return (
                          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <PostCard
                              post={transformedPost}
                              onLike={() => {}}
                              onComment={() => {}}
                              onShare={() => {}}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 lg:col-start-3">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Members • {group.memberCount}</span>
                      {isModerator && (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => setInviteDialogOpen(true)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite People
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {membersLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="animate-pulse flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ScrollArea className="h-96">
                        <div className="space-y-4">
                          {members.length === 0 ? (
                            <div className="text-center py-8">
                              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600 dark:text-gray-400">
                                No members found
                              </p>
                            </div>
                          ) : (
                            members.map((member) => {
                              // Additional null safety check
                              if (!member || !member.user) {
                                console.warn('Skipping invalid member:', member)
                                return null
                              }

                              const userDisplayName = getUserDisplayName(member.user)
                              const userAvatar = getUserAvatar(member.user)
                              const userInitials = userDisplayName.charAt(0).toUpperCase()

                              return (
                                <div key={member.id} className="flex items-center justify-between py-2">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage 
                                        src={userAvatar} 
                                        alt={`${userDisplayName}'s avatar`}
                                      />
                                      <AvatarFallback className="bg-blue-600 text-white">
                                        {userInitials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {userDisplayName}
                                      </p>
                                      <div className="flex items-center space-x-2">
                                        {member.role && member.role !== 'MEMBER' && (
                                          <Badge 
                                            variant={member.role === 'ADMIN' ? 'default' : 'secondary'}
                                            className="text-xs"
                                          >
                                            {member.role.toLowerCase()}
                                          </Badge>
                                        )}
                                        {member.joinedAt && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Joined {new Date(member.joinedAt).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                      {/* Academic info display with null safety */}
                                      {(member.user.major) && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {member.user.major}
                                          {member.user.academicYear && ` • Year ${member.user.academicYear}`}
                                        </p>
                                      )}
                                      {/* Show ban status if applicable */}
                                      {member.isBanned && (
                                        <Badge variant="destructive" className="text-xs mt-1">
                                          Banned
                                        </Badge>
                                      )}
                                      {member.isMuted && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          Muted
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Admin actions */}
                                  {isAdmin && member.userId !== userId && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Implement member management actions
                                        console.log('Member actions for:', member.userId)
                                      }}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )
                            }).filter(Boolean) // Remove any null entries
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 lg:col-start-3">
                <div className="space-y-6">
                  {/* Group Description */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {group.about || group.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Group Details */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Group Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Privacy</h4>
                          <div className={`flex items-center space-x-2 ${getPrivacyColor(group.privacy)}`}>
                            {getPrivacyIcon(group.privacy)}
                            <span className="font-medium">{group.privacy.toLowerCase()} group</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Members</h4>
                          <p className="text-gray-600 dark:text-gray-400">{group.memberCount} members</p>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Created</h4>
                          <p className="text-gray-600 dark:text-gray-400">
                            {new Date(group.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        {group.location && (
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location</h4>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <MapPin className="h-4 w-4" />
                              <span>{group.location}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {group.category && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Category</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{group.category}</Badge>
                            {group.subcategory && (
                              <Badge variant="outline">{group.subcategory}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {group.tags && group.tags.length > 0 && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {group.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {group.website && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Website</h4>
                          <a 
                            href={group.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center space-x-2"
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span>Visit group website</span>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite People Dialog */}
      {group && (
        <InvitePeopleDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          groupId={group.id}
          groupName={group.name}
          groupPrivacy={group.privacy}
          allowMemberInvites={group.allowMemberInvites}
          userRole={group.userRole || 'MEMBER'}
        />
      )}
    </div>
  )
}
