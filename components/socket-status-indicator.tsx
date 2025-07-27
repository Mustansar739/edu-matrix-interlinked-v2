"use client"

import { useEffect, useState } from 'react'
import { useSocket } from '@/lib/socket/socket-context-clean'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'

export function SocketConnectionStatus() {
  const { socket, isConnected, error, connectionState, connect, disconnect, userId } = useSocket()
  const { data: session, status } = useSession()
  const [showDetails, setShowDetails] = useState(false)

  // Auto-hide success messages after 5 seconds
  useEffect(() => {
    if (isConnected && !error) {
      const timer = setTimeout(() => setShowDetails(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, error])

  // Don't show anything if user is not authenticated
  if (status === 'loading' || !session?.user) {
    return null
  }

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'auth_required':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
      case 'connecting':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Connecting...</Badge>
      case 'error':
        return <Badge variant="destructive">Connection Error</Badge>
      case 'auth_required':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Authentication Required</Badge>
      default:
        return <Badge variant="outline">Disconnected</Badge>
    }
  }

  const getStatusMessage = () => {
    if (isConnected) {
      return "Real-time features are active"
    }
    
    if (error) {
      return error
    }
    
    switch (connectionState) {
      case 'connecting':
        return "Establishing connection..."
      case 'auth_required':
        return "Please sign in to enable real-time features"
      default:
        return "Real-time features are disabled"
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact status indicator */}
      <div 
        className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border cursor-pointer hover:shadow-xl transition-all"
        onClick={() => setShowDetails(!showDetails)}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-gray-500" />}
        </span>
        {getStatusBadge()}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <Card className="mt-2 w-80">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Real-time Connection</h3>
                {getStatusIcon()}
              </div>

              {/* Status Message */}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getStatusMessage()}
              </p>

              {/* Connection Details */}
              {isConnected && socket && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Socket ID: {socket.id}</div>
                  <div>User ID: {userId}</div>
                  <div>Status: Connected to server</div>
                </div>
              )}

              {/* Error Details */}
              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {connectionState === 'error' && (
                  <Button
                    size="sm"
                    onClick={connect}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </Button>
                )}
                
                {isConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={disconnect}
                  >
                    Disconnect
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-gray-500">
                Real-time features include: instant messaging, live notifications, 
                collaborative editing, and activity updates.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
