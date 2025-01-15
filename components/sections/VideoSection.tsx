"use client";

import { Section } from "@/types/page-builder";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash, Settings, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MuxPlayerComponent from '@mux/mux-player-react';

interface VideoSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
}

export default function VideoSection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false 
}: VideoSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSectionDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get upload URL
      const response = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadId, uploadUrl } = await response.json();

      // Create a promise to handle the upload
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      });

      // Wait for upload to complete
      await uploadPromise;
      setUploadProgress(100);

      // Start polling for asset readiness
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      const pollInterval = 1000; // 1 second

      const pollAsset = async (): Promise<any> => {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for asset to be ready');
        }

        try {
          const assetResponse = await fetch(`/api/mux/assets/${uploadId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!assetResponse.ok) {
            throw new Error('Failed to check asset status');
          }

          const asset = await assetResponse.json();

          if (asset.status === 'ready') {
            return asset;
          }

          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollAsset();
        } catch (error) {
          console.error('Error polling asset:', error);
          throw error;
        }
      };

      // Start polling for asset readiness
      const readyAsset = await pollAsset();
      onUpdate({
        ...section.content,
        videoId: readyAsset.playbackId
      });
      setIsUploading(false);
      toast.success('Video uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast.error('File size must be less than 500MB');
        return;
      }
      handleUpload(file);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast.error('File size must be less than 500MB');
        return;
      }
      handleUpload(file);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group video-section",
        isSectionDragging ? "opacity-50" : "opacity-100"
      )}
      onMouseEnter={() => {
        if (!isSettingsOpen) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!isSettingsOpen) {
          setIsHovered(false);
        }
      }}
    >
      {/* Editor Toolbar */}
      {isEditing && (isHovered || isSettingsOpen) && (
        <div className="absolute top-0 right-0 p-2 flex items-center gap-2 bg-black/75 rounded-bl z-20">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Popover 
            open={isSettingsOpen} 
            onOpenChange={(open) => {
              setIsSettingsOpen(open);
              if (open) {
                setIsHovered(false);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-80"
              onInteractOutside={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('.video-section')) {
                  setIsSettingsOpen(false);
                }
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Title</label>
                  <Input
                    value={section.content.title || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      title: e.target.value 
                    })}
                    placeholder="Enter video title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Description</label>
                  <Input
                    value={section.content.description || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      description: e.target.value 
                    })}
                    placeholder="Enter video description"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {section.content.videoId ? (
            <div className="aspect-video w-full relative rounded-lg overflow-hidden">
              <MuxPlayerComponent
                streamType="on-demand"
                playbackId={section.content.videoId}
                metadata={{
                  video_title: section.content.title || "Video",
                  video_description: section.content.description || "",
                }}
                style={{
                  height: '100%',
                  width: '100%',
                  aspectRatio: '16/9',
                }}
                theme="dark"
                primaryColor="#3b82f6"
                autoPlay={false}
                preload="metadata"
                maxResolution="1080p"
                onError={(error) => {
                  console.error('Mux Player Error:', error);
                  toast.error('Error playing video');
                }}
                onStalled={() => {
                  console.log('Video playback stalled, attempting to recover...');
                }}
              />
            </div>
          ) : isEditing ? (
            <div
              className={`aspect-video relative border-2 border-dashed rounded-lg transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                <Upload className="w-12 h-12 text-gray-400" />
                <div className="text-center">
                  <p className="text-lg font-medium">
                    Drag and drop your video here, or{" "}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-500 hover:text-blue-600"
                      disabled={isUploading}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum file size: 500MB
                  </p>
                </div>
              </div>

              {isUploading && (
                <div className="absolute inset-x-0 bottom-8 px-8 space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <div className="text-sm text-center text-gray-500">
                    {uploadProgress === 100 ? 'Processing...' : `Uploading... ${uploadProgress}%`}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {(section.content.title || section.content.description) && (
            <div className="mt-6 space-y-2">
              {section.content.title && (
                <h3 className="text-2xl font-semibold">{section.content.title}</h3>
              )}
              {section.content.description && (
                <p className="text-gray-600">{section.content.description}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 