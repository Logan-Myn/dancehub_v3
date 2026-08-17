import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client configured for Backblaze B2
const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;
const CDN_URL = process.env.B2_CDN_URL;

/**
 * Get the public URL for a file
 */
export function getPublicUrl(key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  return `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

/**
 * Upload a file to B2 storage
 */
export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

/**
 * Delete a file from B2 storage
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * List files in B2 storage with a given prefix
 */
export async function listFiles(prefix: string) {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
  );
  return response.Contents || [];
}

/**
 * Generate a signed URL for uploading a file directly to B2
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a signed URL for downloading a file from B2
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Recover the storage key from a public URL produced by `getPublicUrl`.
 *
 * Returns null for anything we did not upload (the bundled placeholder SVG,
 * an external URL, a malformed value) so callers never issue a delete against
 * a key they cannot account for.
 */
export function extractKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const prefixes = [
    CDN_URL ? `${CDN_URL}/` : null,
    `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/`,
  ].filter((p): p is string => Boolean(p));

  for (const prefix of prefixes) {
    if (url.startsWith(prefix)) {
      const key = url.slice(prefix.length);
      return key.length > 0 ? key : null;
    }
  }

  return null;
}

/**
 * Helper to generate a unique file key with folder structure
 */
export function generateFileKey(
  folder: string,
  fileName: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const fileExt = fileName.split('.').pop();
  const uniqueName = `${timestamp}-${crypto.randomUUID()}.${fileExt}`;

  if (userId) {
    return `${folder}/${userId}/${uniqueName}`;
  }
  return `${folder}/${uniqueName}`;
}
