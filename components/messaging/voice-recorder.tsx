"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Trash2,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onVoiceRecorded: (audioBlob: Blob, duration: number) => void
  onCancel?: () => void
  className?: string
  maxDuration?: number // in seconds
}

export function VoiceRecorder({ 
  onVoiceRecorded, 
  onCancel, 
  className,
  maxDuration = 300 // 5 minutes default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setRecordingDuration(recordingTime)
        
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start recording timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= maxDuration) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
    } else {
      audioRef.current.play()
      setIsPlaying(true)
      
      // Start playback timer
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime)
          
          if (audioRef.current.ended) {
            setIsPlaying(false)
            setPlaybackTime(0)
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current)
              playbackIntervalRef.current = null
            }
          }
        }
      }, 100)
    }
  }

  const handleSend = () => {
    if (audioBlob && recordingDuration > 0) {
      onVoiceRecorded(audioBlob, recordingDuration)
      resetRecorder()
    }
  }

  const handleCancel = () => {
    resetRecorder()
    onCancel?.()
  }

  const resetRecorder = () => {
    setIsRecording(false)
    setIsPlaying(false)
    setRecordingTime(0)
    setPlaybackTime(0)
    setAudioBlob(null)
    setRecordingDuration(0)
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (isRecording) {
      return (recordingTime / maxDuration) * 100
    }
    if (recordingDuration > 0) {
      return (playbackTime / recordingDuration) * 100
    }
    return 0
  }

  return (
    <div className={cn("p-4 bg-background border rounded-lg space-y-4", className)}>
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false)
            setPlaybackTime(0)
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current)
              playbackIntervalRef.current = null
            }
          }}
        />
      )}

      {/* Recording/Playback Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full mr-1" />
              Recording
            </Badge>
          )}
          
          {audioBlob && !isRecording && (
            <Badge variant="secondary">
              Voice Message Ready
            </Badge>
          )}
        </div>
        
        <div className="text-sm font-mono">
          {isRecording ? formatTime(recordingTime) : 
           audioBlob ? formatTime(isPlaying ? playbackTime : recordingDuration) :
           formatTime(0)}
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={getProgressPercentage()} className="h-2" />

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!audioBlob ? (
          // Recording controls
          <>
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className="h-12 w-12 rounded-full"
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            {isRecording && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </>
        ) : (
          // Playback and send controls
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
              className="h-10 w-10"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={resetRecorder}
              className="h-10 w-10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              onClick={handleSend}
              className="h-10 px-4"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
            
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-center text-muted-foreground">
        {!audioBlob ? (
          isRecording ? 
            `Recording... (${formatTime(maxDuration - recordingTime)} remaining)` :
            'Click the microphone to start recording'
        ) : (
          'Review your message and click Send, or record again'
        )}
      </div>
    </div>
  )
}

// Voice Message Player Component
interface VoiceMessagePlayerProps {
  audioUrl: string
  duration: number
  isOwnMessage?: boolean
  className?: string
}

export function VoiceMessagePlayer({ 
  audioUrl, 
  duration, 
  isOwnMessage = false,
  className 
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const togglePlayback = async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } else {
      setIsLoading(true)
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        setIsLoading(false)
        
        // Start progress timer
        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
            
            if (audioRef.current.ended) {
              setIsPlaying(false)
              setCurrentTime(0)
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            }
          }
        }, 100)
      } catch (error) {
        console.error('Error playing audio:', error)
        setIsLoading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
      isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
      className
    )}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <Button
        variant={isOwnMessage ? "secondary" : "outline"}
        size="icon"
        onClick={togglePlayback}
        disabled={isLoading}
        className="h-8 w-8 rounded-full flex-shrink-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current transition-all duration-100 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between text-xs opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
