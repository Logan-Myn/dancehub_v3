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

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // Get upload URL
      const response = await fetch('/api/mux/upload-url');
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, assetId } = await response.json();

      // Upload file
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });
      if (!upload.ok) throw new Error('Failed to upload file');

      // Poll for asset status
      let status = 'preparing';
      while (status === 'preparing') {
        const statusResponse = await fetch(`/api/mux/asset-status/${assetId}`);
        if (!statusResponse.ok) throw new Error('Failed to check status');
        const statusData = await statusResponse.json();
        status = statusData.status;

        if (status === 'ready') {
          onUploadComplete(assetId);
          setIsUploading(false);
          toast.success('Video uploaded successfully!');
          break;
        } else if (status === 'errored') {
          throw new Error('Failed to process video');
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    await handleUpload(file);
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        id="video-upload"
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