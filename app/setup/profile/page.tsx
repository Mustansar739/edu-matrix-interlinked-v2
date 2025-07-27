'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { User, Check, X } from 'lucide-react'

export default function ProfileSetupPage() {
  const [username, setUsername] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3) return
    
    setIsChecking(true)
    try {
      const response = await fetch(`/api/profile/check-username?username=${value}`)
      const data = await response.json()
      setIsAvailable(data.available)
    } catch (error) {
      console.error('Error checking username:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and underscores, lowercase
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(cleanValue)
    setIsAvailable(null)
    
    if (cleanValue.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(cleanValue)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !isAvailable) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      if (response.ok) {
        toast.success('Profile setup complete!')
        router.push(`/profile/${username}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to setup profile')
      }
    } catch (error) {
      toast.error('Failed to setup profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Complete Your Profile</CardTitle>
          <p className="text-muted-foreground text-sm">
            Choose a username to access your profile
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isChecking && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  )}
                  {!isChecking && isAvailable === true && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {!isChecking && isAvailable === false && (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {username.length > 0 && username.length < 3 && (
                <p className="text-sm text-muted-foreground">
                  Username must be at least 3 characters
                </p>
              )}
              {isAvailable === false && (
                <p className="text-sm text-red-500">
                  Username is already taken
                </p>
              )}
              {isAvailable === true && (
                <p className="text-sm text-green-500">
                  Username is available!
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={!username || !isAvailable || isSubmitting}
            >
              {isSubmitting ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
