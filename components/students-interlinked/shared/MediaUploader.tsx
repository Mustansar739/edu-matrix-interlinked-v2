'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Video, File, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MediaFile } from '../core/types';
import { formatFileSize, getMediaType } from '../core/utils/socialHelpers';

interface MediaUploaderProps {
  media?: MediaFile[];
  onUpload?: (files: FileList) => void;
  onRemove?: (mediaId: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  trigger?: React.ReactNode;
  readonly?: boolean;
  className?: string;
}

const defaultAcceptedTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export default function MediaUploader({
  media = [],
  onUpload,
  onRemove,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = defaultAcceptedTypes,
  trigger,
  readonly = false,
  className
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && onUpload) {
      onUpload(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerClick = () => {
    if (!readonly && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (mediaId: string) => {
    if (onRemove) {
      onRemove(mediaId);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (readonly || !onUpload) return;
    
    const files = e.dataTransfer.files;
    if (files) {
      onUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readonly) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const renderMediaPreview = (file: MediaFile) => {
    if (file.type.startsWith('image/')) {
      return (
        <Image
          src={file.url}
          alt={file.name}
          fill
          className="object-cover"
        />
      );
    } else if (file.type.startsWith('video/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Video className="h-8 w-8 mb-2" />
          <span className="text-xs text-center truncate w-full px-1">
            {file.name}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <File className="h-8 w-8 mb-2" />
          <span className="text-xs text-center truncate w-full px-1">
            {file.name}
          </span>
        </div>
      );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Trigger */}
      {!readonly && (
        <div className="flex items-center justify-between">
          {trigger ? (
            <div onClick={handleTriggerClick} className="cursor-pointer">
              {trigger}
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleTriggerClick}
              className="flex items-center gap-2"
              disabled={media.length >= maxFiles}
            >
              <Plus className="h-4 w-4" />
              Add Media
            </Button>
          )}
          
          {media.length > 0 && (
            <Badge variant="secondary">
              {media.length}/{maxFiles} files
            </Badge>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Media Preview Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((file) => (
            <Card key={file.id} className="relative overflow-hidden group">
              <CardContent className="p-2">
                {/* Media Preview */}
                <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                  {renderMediaPreview(file)}
                </div>

                {/* File Info */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {/* Upload Progress */}
                  {file.uploadProgress !== undefined && file.uploadProgress < 100 && (
                    <div className="space-y-1">
                      <Progress value={file.uploadProgress} className="h-1" />
                      <p className="text-xs text-muted-foreground">
                        Uploading... {file.uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {!readonly && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State / Drop Zone */}
      {media.length === 0 && !readonly && (
        <Card 
          className={cn(
            "border-dashed border-2 cursor-pointer transition-colors",
            "hover:bg-muted/50",
            dragOver && "border-primary bg-primary/5"
          )}
          onClick={handleTriggerClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Max {maxFiles} files, {formatFileSize(maxFileSize)} each
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-xs">Images</Badge>
              <Badge variant="outline" className="text-xs">Videos</Badge>
              <Badge variant="outline" className="text-xs">Documents</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
