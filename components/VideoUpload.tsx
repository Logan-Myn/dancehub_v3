import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-toastify';
import { getAuth } from 'firebase/auth';

interface VideoUploadProps {
  onUploadComplete: (assetId: string) => void;
  onUploadError: (error: string) => void;
}

export function VideoUpload({ onUploadComplete, onUploadError }: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get the upload URL from your API
      const token = await getAuth().currentUser?.getIdToken();
      const response = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
          // 204 is success for Mux uploads
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
      const maxAttempts = 60; // Increased to 60 attempts (60 seconds)
      const pollInterval = 1000; // 1 second

      const pollAsset = async (): Promise<any> => {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for asset to be ready');
        }

        try {
          const assetResponse = await fetch(`/api/mux/assets/${uploadId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!assetResponse.ok) {
            throw new Error('Failed to check asset status');
          }

          const asset = await assetResponse.json();
          console.log('Asset status:', asset.status); // Debug log
          
          if (asset.status === 'ready') {
            return asset;
          }

          // If not ready, wait and try again
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
      onUploadComplete(readyAsset.playbackId);
      setIsUploading(false);
      setSelectedFile(null);

    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setSelectedFile(null);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast.error('File size must be less than 500MB');
        return;
      }
      setSelectedFile(file);
      // Start upload immediately after file selection
      handleUpload(file);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="video-upload"
          className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer
            ${isUploading ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Choose Video'}
        </label>
        {selectedFile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelUpload}
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedFile && (
        <div className="text-sm text-gray-500">
          Selected: {selectedFile.name}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <div className="text-sm text-gray-500">
            {uploadProgress === 100 ? 'Processing...' : `Uploading... ${uploadProgress}%`}
          </div>
        </div>
      )}
    </div>
  );
} 