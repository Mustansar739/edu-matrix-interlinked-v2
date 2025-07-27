/**
 * =============================================================================
 * NOTIFICATION SYSTEM INTEGRATION EXAMPLE
 * =============================================================================
 * 
 * 🎯 PURPOSE:
 * Example component showing how to integrate the notification system
 * into your main app layout (navbar, header, etc.)
 * 
 * 🔧 INTEGRATION FEATURES:
 * ✅ Easy drop-in integration
 * ✅ Responsive design
 * ✅ Proper positioning
 * ✅ Authentication handling
 * ✅ Error boundaries
 * 
 * 📋 USAGE:
 * 1. Import this component in your main layout
 * 2. Place it in your navbar or header
 * 3. The notification system will automatically work
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * VERSION: 1.0.0 (Integration Example)
 * =============================================================================
 */

'use client'

import React, { Suspense } from 'react'
import { NotificationSystem } from '@/components/notifications/NotificationSystem'
import { useSession } from 'next-auth/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell } from 'lucide-react'

// ==========================================
// LOADING SKELETON
// ==========================================

function NotificationSkeleton() {
  return (
    <div className="relative">
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  )
}

// ==========================================
// ERROR BOUNDARY
// ==========================================

class NotificationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Notification system error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ==========================================
// NOTIFICATION INTEGRATION COMPONENT
// ==========================================

export function NotificationSystemIntegration() {
  const { data: session, status } = useSession()

  // Don't render anything if not authenticated
  if (status === 'loading') {
    return <NotificationSkeleton />
  }

  if (!session?.user) {
    return null
  }

  return (
    <NotificationErrorBoundary>
      <Suspense fallback={<NotificationSkeleton />}>
        <NotificationSystem />
      </Suspense>
    </NotificationErrorBoundary>
  )
}

// ==========================================
// EXAMPLE NAVBAR INTEGRATION
// ==========================================

export function ExampleNavbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Edu Matrix
            </h1>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            {/* Other nav items */}
            <a href="/dashboard" className="text-gray-700 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/posts" className="text-gray-700 hover:text-gray-900">
              Posts
            </a>
            <a href="/profile" className="text-gray-700 hover:text-gray-900">
              Profile
            </a>

            {/* Notification System */}
            {session?.user && (
              <NotificationSystemIntegration />
            )}

            {/* User Menu */}
            {session?.user && (
              <div className="flex items-center space-x-2">
                <img
                  src={session.user.image || '/default-avatar.png'}
                  alt={session.user.name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm text-gray-700">
                  {session.user.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ==========================================
// EXAMPLE HEADER INTEGRATION
// ==========================================

export function ExampleHeader() {
  const { data: session } = useSession()

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name}!
          </h1>
          
          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
              Create Post
            </button>
            
            {/* Notification System */}
            <NotificationSystemIntegration />
          </div>
        </div>
      </div>
    </header>
  )
}

// ==========================================
// EXAMPLE MOBILE INTEGRATION
// ==========================================

export function ExampleMobileNavigation() {
  const { data: session } = useSession()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden">
      <div className="flex justify-around items-center py-2">
        <button className="p-3 rounded-full hover:bg-gray-100">
          <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        
        <button className="p-3 rounded-full hover:bg-gray-100">
          <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        
        {/* Notification System */}
        {session?.user && (
          <div className="p-3">
            <NotificationSystemIntegration />
          </div>
        )}
        
        <button className="p-3 rounded-full hover:bg-gray-100">
          <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ==========================================
// EXPORTS
// ==========================================

export default NotificationSystemIntegration
