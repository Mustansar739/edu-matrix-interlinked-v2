'use client';

// ==========================================
// MEDIA VIEWER COMPONENT
// ==========================================
// Full-screen media viewer with controls

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  X,
  Download,
  Share,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Maximize,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MediaViewerProps {
  media: {
    url: string;
    type: 'image' | 'video' | 'audio';
    title?: string;
    duration?: number;
  };
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  className?: string;
}

export function MediaViewer({
  media,
  onClose,
  onDownload,
  onShare,
  className
}: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide controls for video
  useEffect(() => {
    if (media.type === 'video' || media.type === 'audio') {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      
      if (showControls) {
        const timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000);
        setControlsTimeout(timeout);
      }
    }

    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [showControls, media.type]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          if (media.type === 'video' || media.type === 'audio') {
            setIsPlaying(!isPlaying);
          }
          break;
        case 'ArrowLeft':
          if (media.type === 'video' || media.type === 'audio') {
            setCurrentTime(Math.max(0, currentTime - 10));
          }
          break;
        case 'ArrowRight':
          if (media.type === 'video' || media.type === 'audio') {
            setCurrentTime(Math.min(duration, currentTime + 10));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (media.type === 'video' || media.type === 'audio') {
            setVolume(Math.min(1, volume + 0.1));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (media.type === 'video' || media.type === 'audio') {
            setVolume(Math.max(0, volume - 0.1));
          }
          break;
        case 'm':
          if (media.type === 'video' || media.type === 'audio') {
            setIsMuted(!isMuted);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose, isPlaying, currentTime, duration, volume, isMuted, media.type]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => {
    setZoom(Math.min(3, zoom + 0.25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(0.25, zoom - 0.25));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black flex items-center justify-center",
        className
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Header Controls */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/75 to-transparent p-4 z-10">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium">
                {media.title || 'Media'}
              </h3>
              <Badge variant="secondary" className="capitalize">
                {media.type}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onShare}
                className="text-white hover:bg-white/20"
              >
                <Share className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Media Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {media.type === 'image' && (
          <img
            src={media.url}
            alt="Media content"
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />
        )}

        {media.type === 'video' && (
          <video
            src={media.url}
            className="max-w-full max-h-full"
            controls={false}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            ref={(video) => {
              if (video) {
                video.volume = volume;
                video.muted = isMuted;
                if (isPlaying) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }}
          />
        )}

        {media.type === 'audio' && (
          <div className="w-96 bg-gray-900 rounded-lg p-6">
            <div className="text-center text-white mb-4">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-medium">{media.title || 'Audio'}</h3>
            </div>
            
            <audio
              src={media.url}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              ref={(audio) => {
                if (audio) {
                  audio.volume = volume;
                  audio.muted = isMuted;
                  if (isPlaying) {
                    audio.play();
                  } else {
                    audio.pause();
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Image Controls */}
      {media.type === 'image' && showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/75 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-white text-sm min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-white/30 mx-2" />
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRotate}
              className="text-white hover:bg-white/20"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="text-white hover:bg-white/20"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Video/Audio Controls */}
      {(media.type === 'video' || media.type === 'audio') && showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-4">
          <div className="flex items-center gap-4 text-white">
            {/* Play/Pause */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Skip Back */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {/* Time Display */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Progress Bar */}
            <div className="flex-1 mx-4">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Skip Forward */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Volume */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:bg-white/20"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            {/* Volume Slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
            />

            {/* Fullscreen */}
            {media.type === 'video' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const element = document.documentElement;
                  if (element.requestFullscreen) {
                    element.requestFullscreen();
                  }
                }}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Click to close (only for background) */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
