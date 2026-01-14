/**
 * Client-side storage utilities for uploading files to B2 via the API
 */

interface UploadResponse {
  success: boolean;
  publicUrl: string;
  key: string;
}

/**
 * Upload a file to B2 storage via the API route
 * @param file - The file to upload
 * @param folder - The folder to store the file in (default: 'uploads')
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File,
  folder: string = 'uploads'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const data: UploadResponse = await response.json();
  return data.publicUrl;
}

/**
 * Storage folder constants for consistency
 */
export const STORAGE_FOLDERS = {
  COMMUNITY_IMAGES: 'community-images',
  COMMUNITY_PAGES: 'community-pages',
  COURSE_IMAGES: 'course-images',
  AVATARS: 'avatars',
  IMAGES: 'images',
} as const;
