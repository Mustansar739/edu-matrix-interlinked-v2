'use client';

// ==========================================
// VOICE CALL INTERFACE
// ==========================================
// Facebook-style voice call interface

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MoreVertical,
  Minimize2,
  Maximize2
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

interface VoiceCallInterfaceProps {
  callState: CallState;
  onEndCall: () => void;
  onMute: () => void;
  onSpeaker: () => void;
  className?: string;
}

export function VoiceCallInterface({
  callState,
  onEndCall,
  onMute,
  onSpeaker,
  className
}: VoiceCallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

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
  };

  const handleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    onSpeaker();
  };

  if (!callState.isActive) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center",
      className
    )}>
      <Card className={cn(
        "bg-gradient-to-b from-gray-900 to-gray-800 text-white border-gray-700 transition-all duration-300",
        isMinimized ? "w-80 h-32" : "w-96 h-96"
      )}>
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="text-sm text-gray-300">Voice Call</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-gray-700"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
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

          {!isMinimized && (
            <>
              {/* Participant Info */}
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="relative mb-6">
                  <Avatar className="w-24 h-24 border-4 border-white">
                    <AvatarImage src={participant?.avatar} />
                    <AvatarFallback className="text-2xl bg-gray-600">
                      {participant?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Pulse animation for active call */}
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
                </div>

                <h3 className="text-xl font-semibold mb-2">
                  {participant?.name || 'Unknown'}
                </h3>
                
                <div className="text-sm text-gray-300 mb-4">
                  {formatDuration(callDuration)}
                </div>

                <div className="text-sm text-gray-400">
                  Voice call in progress...
                </div>
              </div>

              {/* Call Controls */}
              <div className="p-6 border-t border-gray-700">
                <div className="flex items-center justify-center gap-4">
                  {/* Mute */}
                  <Button
                    size="lg"
                    variant={isMuted ? "destructive" : "secondary"}
                    onClick={handleMute}
                    className="w-12 h-12 rounded-full"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>

                  {/* Speaker */}
                  <Button
                    size="lg"
                    variant={isSpeakerOn ? "default" : "secondary"}
                    onClick={handleSpeaker}
                    className="w-12 h-12 rounded-full"
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>

                  {/* End Call */}
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={onEndCall}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Minimized View */}
          {isMinimized && (
            <div className="flex-1 flex items-center gap-3 p-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={participant?.avatar} />
                <AvatarFallback>{participant?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {participant?.name || 'Unknown'}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDuration(callDuration)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isMuted ? "destructive" : "ghost"}
                  onClick={handleMute}
                  className="w-8 h-8 p-0"
                >
                  {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onEndCall}
                  className="w-8 h-8 p-0"
                >
                  <PhoneOff className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
