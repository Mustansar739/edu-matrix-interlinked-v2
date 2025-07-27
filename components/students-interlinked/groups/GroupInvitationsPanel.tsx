'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { useSocket } from '@/lib/socket/socket-context-clean'
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  UserPlus,
  Loader2,
  Bell
} from 'lucide-react'

// Types
interface GroupInvitation {
  id: string
  message?: string
  createdAt: string
  expiresAt?: string
  group: {
    id: string
    name: string
    description: string
    profilePhoto?: string
    coverPhoto?: string
    privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET'
    category?: string
    memberCount: number
  }
  inviter: {
    id: string
    name: string
    profilePicture?: string
  }
}

/**
 * GroupInvitationsPanel - Facebook-like invitation notifications
 * Features:
 * - Real-time invitation display
 * - Accept/decline functionality
 * - Auto-refresh invitations
 * - Expiration handling
 * - Toast notifications
 */
export default function GroupInvitationsPanel() {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  
  const { toast } = useToast()
  const { socket, isConnected, userId } = useSocket()

  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/students-interlinked/groups/invitations')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch invitations')
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch invitations on mount and setup Socket.IO listeners
  useEffect(() => {
    fetchInvitations()

    // Socket.IO real-time listeners for invitation updates
    if (socket && isConnected) {
      console.log('📡 Setting up Socket.IO listeners for group invitations')
      
      // Listen for new invitations
      socket.on('invitation:received', (invitationData) => {
        console.log('📨 New invitation received via Socket.IO:', invitationData)
        
        // Add new invitation to list
        setInvitations(prev => [invitationData, ...prev])
        
        // Show toast notification
        toast({
          title: "New Group Invitation! 🎉",
          description: `${invitationData.inviter.name} invited you to join ${invitationData.group.name}`
        })
      })

      // Listen for invitation responses from other users
      socket.on('invitation:responded', (responseData) => {
        console.log('📋 Invitation response received via Socket.IO:', responseData)
        
        // Remove invitation if it was for current user
        if (responseData.userId === userId) {
          setInvitations(prev => prev.filter(inv => inv.id !== responseData.invitationId))
        }
      })

      // Listen for invitation cancellations
      socket.on('invitation:cancelled', (cancellationData) => {
        console.log('❌ Invitation cancelled via Socket.IO:', cancellationData)
        
        // Remove cancelled invitation
        setInvitations(prev => prev.filter(inv => inv.id !== cancellationData.invitationId))
        
        toast({
          title: "Invitation Cancelled",
          description: "A group invitation was cancelled by the sender.",
          variant: "destructive"
        })
      })

      // Cleanup listeners on unmount
      return () => {
        console.log('🧹 Cleaning up Socket.IO invitation listeners')
        socket.off('invitation:received')
        socket.off('invitation:responded')
        socket.off('invitation:cancelled')
      }
    }
  }, [socket, isConnected, userId, toast])

  // Respond to invitation
  const respondToInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    setRespondingTo(invitationId)
    
    try {
      const response = await fetch('/api/students-interlinked/groups/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Remove invitation from list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
        
        toast({
          title: action === 'accept' ? "Invitation accepted!" : "Invitation declined",
          description: data.message
        })

        // Socket.IO real-time notification for invitation response
        if (socket && isConnected) {
          console.log('📡 Emitting invitation response via Socket.IO')
          socket.emit('invitation:respond', {
            invitationId,
            action,
            userId,
            groupId: data.groupId,
            groupName: data.groupName,
            timestamp: new Date().toISOString()
          })

          // If accepted, notify group members about new member
          if (action === 'accept') {
            socket.emit('group:member_joined', {
              groupId: data.groupId,
              groupName: data.groupName,
              newMemberId: userId,
              memberCount: data.newMemberCount || 0,
              timestamp: new Date().toISOString()
            })
          }
        }

        // If accepted, you might want to redirect to the group
        if (action === 'accept') {
          // Optional: Redirect to group page
          // window.location.href = `/students-interlinked/groups/${data.groupId}`
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to respond to invitation')
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond to invitation",
        variant: "destructive"
      })
    } finally {
      setRespondingTo(null)
    }
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  // Check if invitation is expiring soon (within 24 hours)
  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expiry = new Date(expiresAt)
    const now = new Date()
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No pending group invitations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Group Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Group Profile Picture */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invitation.group.profilePhoto || ''} />
                      <AvatarFallback>
                        <Users className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {invitation.group.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {invitation.group.privacy}
                        </Badge>
                        {isExpiringSoon(invitation.expiresAt) && (
                          <Badge variant="destructive" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Expires soon
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>{invitation.inviter.name}</strong> invited you to join this group
                      </p>

                      {invitation.message && (
                        <p className="text-sm text-gray-500 italic mb-2">
                          "{invitation.message}"
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatTimeAgo(invitation.createdAt)}</span>
                        <span>•</span>
                        <span>{invitation.group.memberCount} members</span>
                        {invitation.group.category && (
                          <>
                            <span>•</span>
                            <span>{invitation.group.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inviter Avatar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={invitation.inviter.profilePicture || ''} />
                      <AvatarFallback className="text-xs">
                        {invitation.inviter.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => respondToInvitation(invitation.id, 'accept')}
                      disabled={respondingTo === invitation.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {respondingTo === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Accept
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToInvitation(invitation.id, 'decline')}
                      disabled={respondingTo === invitation.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
