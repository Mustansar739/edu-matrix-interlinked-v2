import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function ProfilePage() {
  const session = await auth()
  
  // If user is not authenticated, redirect to sign in
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/profile')
  }
  
  // If user doesn't have a username, redirect to setup
  if (!session.user.username) {
    redirect('/setup/profile')
  }
  
  // Redirect to the user's own profile page
  redirect(`/profile/${session.user.username}`)
}
