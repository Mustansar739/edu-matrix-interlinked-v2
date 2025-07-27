/**
 * @fileoverview Group Detail Page - Server Component
 * @module GroupDetailPage
 * @category PageComponent
 * 
 * @description
 * Server-side rendered group detail page for Students Interlinked
 * - Official Next.js 15 App Router server component pattern
 * - Async params handling for dynamic routes
 * - NextAuth.js 5.0 authentication with server-side session
 * - Converted from client to server component for better performance
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import GroupDetailPage from '@/components/students-interlinked/groups/GroupDetailPage'

interface GroupPageProps {
  params: Promise<{
    groupId: string
  }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const session = await auth()

  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/students-interlinked')
  }

  const { groupId } = await params

  return (
    <GroupDetailPage 
      groupId={groupId} 
      userId={session.user.id} 
    />
  )
}
