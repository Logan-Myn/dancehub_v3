import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';

interface VideoUploadProps {
  onUploadComplete: (assetId: string) => void;
  onUploadError: (error: string) => void;
}

export default function VideoUpload({ onUploadComplete, onUploadError }: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      onUploadError('File size must be less than 100MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      onUploadError('File must be a video');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Get the upload URL from your API
      const response = await fetch('/api/mux/upload', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, uploadId } = await response.json();

      // Upload the file directly to Mux
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!upload.ok) throw new Error('Failed to upload video');

      // Wait for Mux to process the video
      const checkStatus = async () => {
        const statusResponse = await fetch(`/api/mux/asset-status/${uploadId}`);
        const { status, playbackId } = await statusResponse.json();

        if (status === 'ready') {
          setProgress(100);
          onUploadComplete(playbackId);
          toast.success('Video uploaded successfully');
        } else if (status === 'errored') {
          throw new Error('Failed to process video');
        } else {
          // Continue checking status
          setProgress((prev) => Math.min(95, prev + 5));
          setTimeout(checkStatus, 1000);
        }
      };

      // Start checking status
      setProgress(50);
      await checkStatus();
    } catch (error) {
      console.error('Error uploading video:', error);
      onUploadError('Failed to upload video');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        className="hidden"
        id="video-upload"
        disabled={isUploading}
      />
      <label
        htmlFor="video-upload"
        className="cursor-pointer flex items-center justify-center p-4 border-2 border-dashed rounded-lg hover:border-gray-400 transition-colors"
      >
        {isUploading ? (
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Uploading...</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Click to upload a video
            </p>
            <p className="text-xs text-gray-400">
              MP4, WebM, Ogg up to 100MB
            </p>
          </div>
        )}
      </label>
    </div>
  );
} 