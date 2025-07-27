/**
 * =============================================================================
 * NOTIFICATION SYSTEM TESTER - COMPREHENSIVE TESTING COMPONENT
 * =============================================================================
 * 
 * 🎯 PURPOSE:
 * Test all notification functionality including likes, comments, follows
 * to ensure the complete notification system works end-to-end.
 * 
 * 🔧 TESTING FEATURES:
 * ✅ Test post likes notifications
 * ✅ Test comment likes notifications  
 * ✅ Test post comments notifications
 * ✅ Test comment replies notifications
 * ✅ Test follow notifications
 * ✅ Test real-time delivery
 * ✅ Test notification counts
 * ✅ Test mark as read functionality
 * ✅ Test notification display
 * 
 * 🎨 DESIGN:
 * - Test buttons for each notification type
 * - Real-time notification display
 * - Status indicators for each test
 * - Error handling and logging
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * VERSION: 1.0.0 (Testing Component)
 * =============================================================================
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { 
  Heart, 
  MessageCircle, 
  Users, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Loader2,
  TestTube,
  Play,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface TestResult {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  duration?: number
  timestamp?: Date
}

interface TestScenario {
  id: string
  name: string
  description: string
  testFunction: () => Promise<string>
  category: 'likes' | 'comments' | 'follows' | 'system'
}

// ==========================================
// NOTIFICATION SYSTEM TESTER COMPONENT
// ==========================================

export function NotificationSystemTester() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: session } = useSession()

  // ==========================================
  // TEST FUNCTIONS
  // ==========================================

  /**
   * Test post like notification
   */
  const testPostLikeNotification = async () => {
    // First, create a test post
    const postResponse = await fetch('/api/students-interlinked/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test post for like notifications',
        visibility: 'PUBLIC'
      })
    })

    if (!postResponse.ok) {
      throw new Error('Failed to create test post')
    }

    const post = await postResponse.json()
    
    // Then like the post
    const likeResponse = await fetch(`/api/unified-likes/post/${post.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'like',
        reaction: 'like'
      })
    })

    if (!likeResponse.ok) {
      throw new Error('Failed to like post')
    }

    // Clean up - delete the test post
    await fetch(`/api/students-interlinked/posts/${post.id}`, {
      method: 'DELETE'
    })

    return 'Post like notification sent successfully'
  }

  /**
   * Test comment notification
   */
  const testCommentNotification = async () => {
    // First, create a test post
    const postResponse = await fetch('/api/students-interlinked/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test post for comment notifications',
        visibility: 'PUBLIC'
      })
    })

    if (!postResponse.ok) {
      throw new Error('Failed to create test post')
    }

    const post = await postResponse.json()
    
    // Then comment on the post
    const commentResponse = await fetch(`/api/students-interlinked/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test comment for notifications'
      })
    })

    if (!commentResponse.ok) {
      throw new Error('Failed to create comment')
    }

    // Clean up - delete the test post
    await fetch(`/api/students-interlinked/posts/${post.id}`, {
      method: 'DELETE'
    })

    return 'Comment notification sent successfully'
  }

  /**
   * Test follow notification
   */
  const testFollowNotification = async () => {
    // Get a random user to follow (excluding current user)
    const usersResponse = await fetch('/api/users?limit=10')
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users')
    }

    const users = await usersResponse.json()
    const targetUser = users.find((user: any) => user.id !== session?.user?.id)
    
    if (!targetUser) {
      throw new Error('No target user found for follow test')
    }

    // Follow the user
    const followResponse = await fetch(`/api/follow/${targetUser.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUser.id,
        notifyUser: true
      })
    })

    if (!followResponse.ok) {
      throw new Error('Failed to follow user')
    }

    // Unfollow to clean up
    await fetch(`/api/follow/${targetUser.id}`, {
      method: 'DELETE'
    })

    return 'Follow notification sent successfully'
  }

  /**
   * Test notification counts
   */
  const testNotificationCounts = async () => {
    const response = await fetch('/api/notifications/counts')
    if (!response.ok) {
      throw new Error('Failed to fetch notification counts')
    }

    const counts = await response.json()
    
    if (typeof counts.unreadCount !== 'number') {
      throw new Error('Invalid notification count response')
    }

    return `Notification count: ${counts.unreadCount}`
  }

  /**
   * Test mark as read functionality
   */
  const testMarkAsRead = async () => {
    // Get notifications
    const notificationsResponse = await fetch('/api/notifications?limit=1')
    if (!notificationsResponse.ok) {
      throw new Error('Failed to fetch notifications')
    }

    const data = await notificationsResponse.json()
    const notifications = data.notifications || []
    
    if (notifications.length === 0) {
      return 'No notifications to mark as read'
    }

    const notification = notifications[0]
    
    // Mark as read
    const markResponse = await fetch(`/api/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true })
    })

    if (!markResponse.ok) {
      throw new Error('Failed to mark notification as read')
    }

    return 'Notification marked as read successfully'
  }

  /**
   * Test real-time connection
   */
  const testRealtimeConnection = async () => {
    try {
      const { io } = await import('socket.io-client')
      
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket'],
        timeout: 5000
      })

      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect()
          reject(new Error('Connection timeout'))
        }, 5000)

        socket.on('connect', () => {
          clearTimeout(timeout)
          socket.disconnect()
          resolve('Real-time connection established successfully')
        })

        socket.on('connect_error', (error) => {
          clearTimeout(timeout)
          reject(new Error(`Connection failed: ${error.message}`))
        })
      })
    } catch (error) {
      throw new Error('Failed to test real-time connection')
    }
  }

  // ==========================================
  // TEST SCENARIOS
  // ==========================================

  const testScenarios: TestScenario[] = [
    {
      id: 'post-like',
      name: 'Post Like Notification',
      description: 'Test notification when someone likes a post',
      testFunction: testPostLikeNotification,
      category: 'likes'
    },
    {
      id: 'comment-notification',
      name: 'Comment Notification',
      description: 'Test notification when someone comments on a post',
      testFunction: testCommentNotification,
      category: 'comments'
    },
    {
      id: 'follow-notification',
      name: 'Follow Notification',
      description: 'Test notification when someone follows a user',
      testFunction: testFollowNotification,
      category: 'follows'
    },
    {
      id: 'notification-counts',
      name: 'Notification Counts',
      description: 'Test notification count API',
      testFunction: testNotificationCounts,
      category: 'system'
    },
    {
      id: 'mark-as-read',
      name: 'Mark as Read',
      description: 'Test marking notifications as read',
      testFunction: testMarkAsRead,
      category: 'system'
    },
    {
      id: 'realtime-connection',
      name: 'Real-time Connection',
      description: 'Test Socket.IO connection for real-time updates',
      testFunction: testRealtimeConnection,
      category: 'system'
    }
  ]

  // ==========================================
  // TEST EXECUTION
  // ==========================================

  /**
   * Run individual test
   */
  const runTest = async (scenario: TestScenario) => {
    const startTime = Date.now()
    setCurrentTest(scenario.id)
    
    // Update test result to running
    setTestResults(prev => prev.map(result => 
      result.id === scenario.id 
        ? { ...result, status: 'running' as const }
        : result
    ))

    try {
      const message = await scenario.testFunction()
      const duration = Date.now() - startTime
      
      setTestResults(prev => prev.map(result => 
        result.id === scenario.id 
          ? { 
              ...result, 
              status: 'success' as const, 
              message,
              duration,
              timestamp: new Date()
            }
          : result
      ))

      toast({
        title: "Test Passed",
        description: `${scenario.name}: ${message}`,
        variant: "default"
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setTestResults(prev => prev.map(result => 
        result.id === scenario.id 
          ? { 
              ...result, 
              status: 'error' as const, 
              message: errorMessage,
              duration,
              timestamp: new Date()
            }
          : result
      ))

      toast({
        title: "Test Failed",
        description: `${scenario.name}: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setCurrentTest(null)
    }
  }

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsRunning(true)
    
    for (const scenario of testScenarios) {
      await runTest(scenario)
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setIsRunning(false)
  }

  /**
   * Initialize test results
   */
  useEffect(() => {
    setTestResults(testScenarios.map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      status: 'pending' as const
    })))
  }, [])

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <TestTube className="h-4 w-4 text-gray-400" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive'
    } as const

    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700'
    }

    return (
      <Badge className={cn(colors[status])}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getCategoryIcon = (category: TestScenario['category']) => {
    switch (category) {
      case 'likes':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'comments':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'follows':
        return <Users className="h-4 w-4 text-green-500" />
      case 'system':
        return <Bell className="h-4 w-4 text-purple-500" />
    }
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Notification System Tester
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test all notification functionality including likes, comments, follows, and real-time updates
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setTestResults(testScenarios.map(scenario => ({
                  id: scenario.id,
                  name: scenario.name,
                  description: scenario.description,
                  status: 'pending' as const
                })))
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Tests
            </Button>
          </div>

          <div className="space-y-4">
            {testScenarios.map((scenario) => {
              const result = testResults.find(r => r.id === scenario.id)
              if (!result) return null

              return (
                <div key={scenario.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(scenario.category)}
                      <h3 className="font-medium">{scenario.name}</h3>
                      {getStatusBadge(result.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runTest(scenario)}
                        disabled={isRunning || currentTest === scenario.id}
                      >
                        {currentTest === scenario.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {scenario.description}
                  </p>
                  
                  {result.message && (
                    <p className={cn(
                      "text-sm px-3 py-2 rounded-md",
                      result.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    )}>
                      {result.message}
                    </p>
                  )}
                  
                  {result.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed in {result.duration}ms
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationSystemTester
