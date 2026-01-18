/**
 * Backblaze B2 Storage Tests - Phase 4 Migration Validation
 *
 * Tests the storage operations with Backblaze B2:
 * - Upload file
 * - Get public URL
 * - Generate signed upload URL
 * - Generate signed download URL
 * - Delete file
 * - List files
 *
 * Note: These tests require B2 environment variables to be set:
 * - B2_ENDPOINT
 * - B2_REGION
 * - B2_KEY_ID
 * - B2_APP_KEY
 * - B2_BUCKET_NAME
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Check if B2 credentials are available
const B2_CONFIGURED =
  process.env.B2_ENDPOINT &&
  process.env.B2_REGION &&
  process.env.B2_KEY_ID &&
  process.env.B2_APP_KEY &&
  process.env.B2_BUCKET_NAME;

// Conditional describe - skip all tests if B2 not configured
const describeIfB2 = B2_CONFIGURED ? describe : describe.skip;

describeIfB2('Backblaze B2 Storage Tests - Phase 4 Migration', () => {
  // Import storage functions only if B2 is configured
  let uploadFile: (file: Buffer, key: string, contentType: string) => Promise<string>;
  let deleteFile: (key: string) => Promise<void>;
  let listFiles: (prefix: string) => Promise<{ Key?: string }[]>;
  let getSignedUploadUrl: (key: string, contentType: string, expiresIn?: number) => Promise<string>;
  let getSignedDownloadUrl: (key: string, expiresIn?: number) => Promise<string>;
  let getPublicUrl: (key: string) => string;
  let generateFileKey: (folder: string, fileName: string, userId?: string) => string;

  const TEST_PREFIX = '__test__';
  const uploadedKeys: string[] = [];

  beforeAll(async () => {
    // Dynamic import to avoid errors when B2 is not configured
    const storage = await import('../../lib/storage');
    uploadFile = storage.uploadFile;
    deleteFile = storage.deleteFile;
    listFiles = storage.listFiles;
    getSignedUploadUrl = storage.getSignedUploadUrl;
    getSignedDownloadUrl = storage.getSignedDownloadUrl;
    getPublicUrl = storage.getPublicUrl;
    generateFileKey = storage.generateFileKey;
  });

  afterAll(async () => {
    // Clean up any test files that were uploaded
    for (const key of uploadedKeys) {
      try {
        await deleteFile(key);
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  describe('1. Environment Configuration', () => {
    it('should have B2_ENDPOINT configured', () => {
      expect(process.env.B2_ENDPOINT).toBeDefined();
      expect(process.env.B2_ENDPOINT).toContain('backblazeb2.com');
    });

    it('should have B2_REGION configured', () => {
      expect(process.env.B2_REGION).toBeDefined();
    });

    it('should have B2_BUCKET_NAME configured', () => {
      expect(process.env.B2_BUCKET_NAME).toBeDefined();
    });

    it('should have B2_KEY_ID configured', () => {
      expect(process.env.B2_KEY_ID).toBeDefined();
    });

    it('should have B2_APP_KEY configured', () => {
      expect(process.env.B2_APP_KEY).toBeDefined();
    });
  });

  describe('2. Helper Functions', () => {
    it('should generate file key without userId', () => {
      const key = generateFileKey('uploads', 'test.jpg');
      expect(key).toMatch(/^uploads\/\d+-[a-f0-9-]+\.jpg$/);
    });

    it('should generate file key with userId', () => {
      const userId = 'user-123';
      const key = generateFileKey('avatars', 'photo.png', userId);
      expect(key).toMatch(/^avatars\/user-123\/\d+-[a-f0-9-]+\.png$/);
    });

    it('should get public URL without CDN', () => {
      const key = 'test/file.jpg';
      const url = getPublicUrl(key);
      expect(url).toContain(key);
      expect(url).toContain(process.env.B2_BUCKET_NAME);
    });

    it('should get public URL with CDN if configured', () => {
      const key = 'test/file.jpg';
      const url = getPublicUrl(key);
      // Should contain either CDN URL or B2 endpoint
      expect(url).toContain(key);
    });
  });

  describe('3. Upload Operations', () => {
    it('should upload a text file', async () => {
      const content = Buffer.from('Hello, B2 Storage Test!');
      const key = `${TEST_PREFIX}/test-upload-${Date.now()}.txt`;

      const url = await uploadFile(content, key, 'text/plain');
      uploadedKeys.push(key);

      expect(url).toBeDefined();
      expect(url).toContain(key);
    });

    it('should upload a JSON file', async () => {
      const data = { test: true, timestamp: Date.now() };
      const content = Buffer.from(JSON.stringify(data));
      const key = `${TEST_PREFIX}/test-upload-${Date.now()}.json`;

      const url = await uploadFile(content, key, 'application/json');
      uploadedKeys.push(key);

      expect(url).toBeDefined();
    });

    it('should upload binary data (simulated image)', async () => {
      // Create a small binary buffer (1x1 pixel PNG header)
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const key = `${TEST_PREFIX}/test-image-${Date.now()}.png`;

      const url = await uploadFile(pngHeader, key, 'image/png');
      uploadedKeys.push(key);

      expect(url).toBeDefined();
    });
  });

  describe('4. Signed URL Operations', () => {
    it('should generate signed upload URL', async () => {
      const key = `${TEST_PREFIX}/presigned-upload-${Date.now()}.txt`;
      const url = await getSignedUploadUrl(key, 'text/plain');

      expect(url).toBeDefined();
      expect(url).toContain('X-Amz-Signature');
      expect(url).toContain(key);
    });

    it('should generate signed upload URL with custom expiry', async () => {
      const key = `${TEST_PREFIX}/presigned-upload-${Date.now()}.txt`;
      const url = await getSignedUploadUrl(key, 'text/plain', 7200); // 2 hours

      expect(url).toBeDefined();
      expect(url).toContain('X-Amz-Expires');
    });

    it('should generate signed download URL for existing file', async () => {
      // First upload a file
      const content = Buffer.from('Download test content');
      const key = `${TEST_PREFIX}/download-test-${Date.now()}.txt`;
      await uploadFile(content, key, 'text/plain');
      uploadedKeys.push(key);

      // Generate signed download URL
      const url = await getSignedDownloadUrl(key);

      expect(url).toBeDefined();
      expect(url).toContain('X-Amz-Signature');
      expect(url).toContain(key);
    });
  });

  describe('5. List Operations', () => {
    it('should list files with prefix', async () => {
      // Upload a file first
      const content = Buffer.from('List test content');
      const key = `${TEST_PREFIX}/list-test-${Date.now()}.txt`;
      await uploadFile(content, key, 'text/plain');
      uploadedKeys.push(key);

      // List files
      const files = await listFiles(TEST_PREFIX);

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent prefix', async () => {
      const files = await listFiles('__non_existent_prefix_12345__');

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  describe('6. Delete Operations', () => {
    it('should delete an uploaded file', async () => {
      // Upload a file
      const content = Buffer.from('Delete test content');
      const key = `${TEST_PREFIX}/delete-test-${Date.now()}.txt`;
      await uploadFile(content, key, 'text/plain');

      // Delete the file - should complete without throwing
      await deleteFile(key);

      // Verify deletion succeeded by checking it's gone from list
      const files = await listFiles(key);
      expect(files.length).toBe(0);
    });

    it('should not throw when deleting non-existent file', async () => {
      const key = `${TEST_PREFIX}/non-existent-file-${Date.now()}.txt`;

      // S3/B2 delete is idempotent - should complete without error
      await deleteFile(key);
      // If we get here, test passed
      expect(true).toBe(true);
    });
  });

  describe('7. Integration Patterns', () => {
    it('should support avatar upload workflow', async () => {
      const userId = 'test-user-123';
      const fileName = 'avatar.jpg';

      // Generate key
      const key = generateFileKey('avatars', fileName, userId);
      expect(key).toContain('avatars');
      expect(key).toContain(userId);

      // Upload
      const content = Buffer.from('fake image data');
      const url = await uploadFile(content, key, 'image/jpeg');
      uploadedKeys.push(key);

      expect(url).toBeDefined();

      // Get public URL
      const publicUrl = getPublicUrl(key);
      expect(publicUrl).toContain(key);
    });

    it('should support community banner upload workflow', async () => {
      const communityId = 'test-community-456';
      const fileName = 'banner.png';

      // Generate key
      const key = generateFileKey('communities', fileName, communityId);

      // Upload
      const content = Buffer.from('fake banner data');
      const url = await uploadFile(content, key, 'image/png');
      uploadedKeys.push(key);

      expect(url).toBeDefined();
    });

    it('should support course thumbnail upload workflow', async () => {
      const courseId = 'test-course-789';
      const fileName = 'thumbnail.webp';

      const key = generateFileKey('courses', fileName, courseId);

      const content = Buffer.from('fake thumbnail data');
      const url = await uploadFile(content, key, 'image/webp');
      uploadedKeys.push(key);

      expect(url).toBeDefined();
    });
  });
});

// Additional test for when B2 is not configured
describe('B2 Storage Configuration Check', () => {
  it('should indicate if B2 is configured', () => {
    if (B2_CONFIGURED) {
      console.log('✓ B2 storage is configured - running full test suite');
    } else {
      console.log('⚠ B2 storage not configured - storage tests skipped');
      console.log('  Set B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME to run storage tests');
    }
    expect(true).toBe(true);
  });
});
