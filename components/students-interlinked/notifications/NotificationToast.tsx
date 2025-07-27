'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface NotificationToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'like' | 'comment' | 'follow' | 'mention'
  title: string
  message: string
  actor?: {
    id: string
    name: string
    image?: string
  }
  actions?: Array<{
    label: string
    action: () => void
    primary?: boolean
  }>
  duration?: number // Auto-dismiss after duration (ms), 0 = no auto-dismiss
  onDismiss?: () => void
  onClick?: () => void
  className?: string
}

export default function NotificationToast({
  id,
  type,
  title,
  message,
  actor,
  actions = [],
  duration = 5000,
  onDismiss,
  onClick,
  className
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (duration > 0) {
      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100))
          if (newProgress <= 0) {
            clearInterval(progressInterval)
            handleDismiss()
            return 0
          }
          return newProgress
        })
      }, 100)

      return () => clearInterval(progressInterval)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 300) // Wait for exit animation
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'like':
        return <span className="text-lg">❤️</span>
      case 'comment':
        return <span className="text-lg">💬</span>
      case 'follow':
        return <span className="text-lg">👤</span>
      case 'mention':
        return <span className="text-lg">@</span>
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getColorScheme = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm max-w-sm w-full",
            getColorScheme(),
            onClick && "cursor-pointer hover:shadow-xl transition-shadow",
            className
          )}
          onClick={onClick}
        >
          {/* Progress Bar */}
          {duration > 0 && (
            <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-100 ease-linear"
                 style={{ width: `${progress}%` }} />
          )}

          <div className="p-4">
            <div className="flex items-start space-x-3">
              {/* Icon or Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {actor ? (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={actor.image} />
                    <AvatarFallback className="text-xs">
                      {actor.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  getIcon()
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {message}
                    </p>

                    {/* Actions */}
                    {actions.length > 0 && (
                      <div className="flex space-x-2 mt-3">
                        {actions.map((action, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant={action.primary ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.action()
                              handleDismiss()
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dismiss Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDismiss()
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Toast Container Component
interface NotificationToastContainerProps {
  toasts: Array<NotificationToastProps & { id: string }>
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
}

export function NotificationToastContainer({ 
  toasts, 
  onRemove, 
  position = 'top-right' 
}: NotificationToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div className={cn("fixed z-50 pointer-events-none", getPositionClasses())}>
      <div className="space-y-3 pointer-events-auto">
        <AnimatePresence>
          {toasts.map((toast) => (
            <NotificationToast
              key={toast.id}
              {...toast}
              onDismiss={() => onRemove(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
