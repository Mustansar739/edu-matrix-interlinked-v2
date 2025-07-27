"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthTestPage() {
  const { data: session, status } = useSession()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testSessionEndpoint = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/session-test')
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ error: 'Failed to fetch session test' })
    } finally {
      setLoading(false)
    }
  }

  const checkCookies = () => {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim())
    console.log('All cookies:', cookies)
    return cookies
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
          <CardDescription>Test NextAuth session and cookie management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Session Status: {status}</h3>
            {status === 'loading' && <p>Loading session...</p>}
            {status === 'authenticated' && session && (
              <div className="bg-green-50 p-3 rounded">
                <p><strong>User ID:</strong> {session.user?.id}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name}</p>
              </div>
            )}
            {status === 'unauthenticated' && (
              <Alert>
                <AlertDescription>
                  User is not authenticated. Please sign in first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-x-2">
            <Button onClick={testSessionEndpoint} disabled={loading}>
              {loading ? 'Testing...' : 'Test Session API'}
            </Button>
            <Button variant="outline" onClick={checkCookies}>
              Check Cookies (Console)
            </Button>
          </div>

          {testResult && (
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">API Test Result:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold">Current Browser Cookies:</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {document?.cookie ? document.cookie : 'No cookies found'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
