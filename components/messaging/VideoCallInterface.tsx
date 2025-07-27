'use client';

// ==========================================
// VIDEO CALL INTERFACE
// ==========================================
// Facebook-style video call interface

import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MoreVertical,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';

interface CallState {
  isActive: boolean;
  type?: 'voice' | 'video';
  conversationId?: string;
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
    isMuted?: boolean;
    isVideoEnabled?: boolean;
  }>;
  startTime?: Date;
}

interface VideoCallInterfaceProps {
  callState: CallState;
  onEndCall: () => void;
  onMute: () => void;
  onVideoToggle: () => void;
  onScreenShare: () => void;
  className?: string;
}

export function VideoCallInterface({
  callState,
  onEndCall,
  onMute,
  onVideoToggle,
  onScreenShare,
  className
}: VideoCallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const participant = callState.participants?.[0];

  // Update call duration
  useEffect(() => {
    if (!callState.isActive || !callState.startTime) return;

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - callState.startTime!.getTime()) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.isActive, callState.startTime]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Initialize video streams
  useEffect(() => {
    if (!callState.isActive) return;

    const initializeVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setIsVideoEnabled(false);
      }
    };

    initializeVideo();

    return () => {
      // Cleanup streams
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callState.isActive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    onMute();
    
    // Mute local stream
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
  };

  const handleVideoToggle = () => {
    setIsVideoEnabled(!isVideoEnabled);
    onVideoToggle();
    
    // Toggle video track
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
      }
    }
  };

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    onScreenShare();
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  if (!callState.isActive) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black flex items-center justify-center",
        className
      )}
      onMouseMove={handleMouseMove}
    >
      {isMinimized ? (
        // Minimized View
        <Card className="fixed bottom-4 right-4 w-80 h-48 bg-gray-900 text-white border-gray-700 overflow-hidden">
          <div className="relative h-full">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-2 right-2 w-20 h-16 bg-gray-800 rounded overflow-hidden">
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant?.avatar} />
                    <AvatarFallback className="text-xs">You</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white">
                  {participant?.name} • {formatDuration(callDuration)}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={isMuted ? "destructive" : "ghost"}
                    onClick={handleMute}
                    className="w-6 h-6 p-0"
                  >
                    {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={isVideoEnabled ? "ghost" : "destructive"}
                    onClick={handleVideoToggle}
                    className="w-6 h-6 p-0"
                  >
                    {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsMinimized(false)}
                    className="w-6 h-6 p-0"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onEndCall}
                    className="w-6 h-6 p-0"
                  >
                    <PhoneOff className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Full Screen View
        <div className="relative w-full h-full">
          {/* Remote Video */}
          <div className="absolute inset-0">
            {participant?.isVideoEnabled !== false ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={participant?.avatar} />
                  <AvatarFallback className="text-4xl">
                    {participant?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {participant?.name || 'Unknown'}
                </h3>
                <div className="text-gray-400">Camera is off</div>
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src="/api/placeholder/64/64" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Header */}
          {showControls && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant?.avatar} />
                    <AvatarFallback>{participant?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{participant?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-300">{formatDuration(callDuration)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsMinimized(true)}
                    className="text-white hover:bg-gray-700"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-gray-700"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <div className="flex items-center justify-center gap-4">
                {/* Mute */}
                <Button
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  onClick={handleMute}
                  className="w-14 h-14 rounded-full"
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {/* Video Toggle */}
                <Button
                  size="lg"
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  onClick={handleVideoToggle}
                  className="w-14 h-14 rounded-full"
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>

                {/* Screen Share */}
                <Button
                  size="lg"
                  variant={isScreenSharing ? "default" : "secondary"}
                  onClick={handleScreenShare}
                  className="w-14 h-14 rounded-full"
                >
                  <Monitor className="w-6 h-6" />
                </Button>

                {/* End Call */}
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onEndCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          {participant?.isMuted && (
            <div className="absolute bottom-20 left-4 bg-red-500 text-white px-2 py-1 rounded text-sm">
              <MicOff className="w-3 h-3 inline mr-1" />
              {participant.name} is muted
            </div>
          )}

          {isScreenSharing && (
            <div className="absolute top-20 left-4 bg-blue-500 text-white px-2 py-1 rounded text-sm">
              <Monitor className="w-3 h-3 inline mr-1" />
              Screen sharing
            </div>
          )}
        </div>
      )}
    </div>
  );
}
