/**
 * @fileoverview PostMedia Component - Media Display for Social Posts
 * @module StudentsInterlinked/Feed/PostMedia  
 * @category Social Media Components
 * @version 1.0.0
 * 
 * ==========================================
 * POST MEDIA DISPLAY COMPONENT
 * ==========================================
 * 
 * This component handles the display of various media types in social posts
 * including images, videos, and documents with proper responsive layout.
 * 
 * FEATURES:
 * - Responsive image galleries with grid layout
 * - Video player with controls
 * - Document preview with download links
 * - Lazy loading for performance
 * - Accessibility support
 * - Mobile-optimized display
 * 
 * @author GitHub Copilot
 * @since 2025-01-25
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FileText, Download, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostMediaProps {
  imageUrls?: string[];
  videoUrls?: string[];
  documentUrls?: string[];
  className?: string;
}

const PostMedia: React.FC<PostMediaProps> = ({
  imageUrls = [],
  videoUrls = [],
  documentUrls = [],
  className
}) => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // Helper function to get grid layout classes based on image count - Facebook Style
  const getImageGridClass = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2 gap-0.5';
      case 3:
        return 'grid-cols-2 gap-0.5';
      case 4:
        return 'grid-cols-2 gap-0.5';
      default:
        return 'grid-cols-2 gap-0.5';
    }
  };

  // Helper function to get image aspect ratio classes - Facebook Style
  const getImageAspectClass = (index: number, total: number) => {
    if (total === 1) return 'aspect-[4/3]'; // Facebook single image ratio
    if (total === 3 && index === 0) return 'row-span-2 aspect-square';
    return 'aspect-square';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Facebook-Style Images */}
      {imageUrls.length === 1 && (
        <div className="relative w-full">
          <Image
            src={imageUrls[0]}
            alt="Post image"
            width={600}
            height={400}
            className="w-full h-auto max-h-[500px] object-cover rounded-lg"
            priority
          />
        </div>
      )}

      {/* Facebook-style Grid Layout for Multiple Images */}
      {imageUrls.length === 2 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="relative aspect-square">
              <Image
                src={url}
                alt={`Post image ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}

      {imageUrls.length === 3 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          <div className="relative aspect-square">
            <Image
              src={imageUrls[0]}
              alt="Post image 1"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
          <div className="grid grid-rows-2 gap-0.5">
            {imageUrls.slice(1, 3).map((url, idx) => (
              <div key={idx + 1} className="relative aspect-square">
                <Image
                  src={url}
                  alt={`Post image ${idx + 2}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {imageUrls.length === 4 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="relative aspect-square">
              <Image
                src={url}
                alt={`Post image ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}

      {imageUrls.length >= 5 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          <div className="relative aspect-square">
            <Image
              src={imageUrls[0]}
              alt="Post image 1"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
          <div className="grid grid-rows-2 gap-0.5">
            <div className="relative aspect-square">
              <Image
                src={imageUrls[1]}
                alt="Post image 2"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 12.5vw"
              />
            </div>
            <div className="relative aspect-square">
              <Image
                src={imageUrls[2]}
                alt="Post image 3"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 12.5vw"
              />
              {/* Facebook-style "+X more" overlay */}
              {imageUrls.length > 3 && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    +{imageUrls.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Videos */}
      {videoUrls.length > 0 && (
        <div className="space-y-2">
          {videoUrls.map((url, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden bg-black">
              <video
                className="w-full h-auto max-h-96"
                controls
                preload="metadata"
                onPlay={() => setPlayingVideo(url)}
                onPause={() => setPlayingVideo(null)}
              >
                <source src={url} type="video/mp4" />
                <source src={url} type="video/webm" />
                <source src={url} type="video/ogg" />
                Your browser does not support the video tag.
              </video>
              
              {/* Custom play button overlay (optional) */}
              {playingVideo !== url && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black bg-opacity-50 rounded-full p-4">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {documentUrls.length > 0 && (
        <div className="space-y-2">
          {documentUrls.map((url, index) => {
            const fileName = url.split('/').pop() || `Document ${index + 1}`;
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            
            return (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileName}
                  </p>
                  <p className="text-xs text-gray-500 uppercase">
                    {fileExtension} file
                  </p>
                </div>
                
                <a
                  href={url}
                  download
                  className="flex-shrink-0 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PostMedia;
