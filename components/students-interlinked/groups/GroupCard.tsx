'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Globe, Lock, EyeOff, Users, MessageSquare, Star, Clock, ExternalLink } from 'lucide-react'

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

interface GroupCardProps {
  group: Group
  onJoin?: () => void
  showJoinButton?: boolean
  loading?: boolean
  detailed?: boolean
  featured?: boolean
  className?: string
}

export default function GroupCard({
  group,
  onJoin,
  showJoinButton = false,
  loading = false,
  detailed = false,
  featured = false,
  className = ''
}: GroupCardProps) {
  const router = useRouter()

  const handleViewGroup = () => {
    router.push(`/students-interlinked/groups/${group.id}`)
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  if (detailed) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with avatar and basic info */}
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.profilePhotoUrl || ''} />
                <AvatarFallback className="text-sm font-medium">
                  {group.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                  {featured && <Star className="h-4 w-4 text-yellow-500" />}
                </div>
                
                <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                  <div className={`flex items-center space-x-1 ${getPrivacyColor(group.privacy)}`}>
                    {getPrivacyIcon(group.privacy)}
                    <span>{group.privacy.toLowerCase()}</span>
                  </div>
                  <Badge variant="outline" className="text-xs px-1 h-4">
                    {group.category.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {group.description}
                </p>
              </div>
            </div>

            {/* Tags */}
            {group.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {group.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                    {tag}
                  </Badge>
                ))}
                {group.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    +{group.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{group.memberCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{group.postCount}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Created {formatDate(group.createdAt)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <Separator />
            <div className="flex justify-between space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewGroup}
                className="flex-1"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
              {showJoinButton && (
                <Button
                  size="sm"
                  onClick={onJoin}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Joining...' : 'Join Group'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact view for sidebar
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <Avatar className="h-8 w-8">
            <AvatarImage src={group.profilePhotoUrl || ''} />
            <AvatarFallback className="text-xs">
              {group.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className="font-medium text-sm truncate">{group.name}</p>
              {featured && <Star className="h-3 w-3 text-yellow-500" />}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 ${getPrivacyColor(group.privacy)}`}>
                {getPrivacyIcon(group.privacy)}
                <span className="text-xs">{group.privacy.toLowerCase()}</span>
              </div>
              <Badge variant="outline" className="text-xs px-1 h-4">
                {group.category.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {group.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.memberCount} members • {group.postCount} posts
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 ml-10">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={handleViewGroup}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
        {showJoinButton && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={onJoin}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join'}
          </Button>
        )}
      </div>
      
      <Separator />
    </div>
  )
}
