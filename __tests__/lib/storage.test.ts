/**
 * Unit tests for lib/storage.ts
 * Tests pure utility function: generateFileKey
 * Note: getPublicUrl depends on module-level env vars that are captured at import time
 */

describe('generateFileKey', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // We need to import dynamically to avoid S3Client initialization issues
  const getGenerateFileKey = () => {
    // Clear the module cache
    jest.resetModules();

    // Set required env vars before import
    process.env.B2_ENDPOINT = 'https://s3.us-west-004.backblazeb2.com';
    process.env.B2_REGION = 'us-west-004';
    process.env.B2_KEY_ID = 'test-key-id';
    process.env.B2_APP_KEY = 'test-app-key';
    process.env.B2_BUCKET_NAME = 'test-bucket';

    // Import the module fresh
    const storage = require('@/lib/storage');
    return storage.generateFileKey;
  };

  it('generates key with folder and timestamp', () => {
    const generateFileKey = getGenerateFileKey();
    const result = generateFileKey('avatars', 'photo.jpg');

    expect(result).toMatch(/^avatars\/\d+-[a-f0-9-]+\.jpg$/);
  });

  it('includes user ID in path when provided', () => {
    const generateFileKey = getGenerateFileKey();
    const result = generateFileKey('avatars', 'photo.jpg', 'user-123');

    expect(result).toMatch(/^avatars\/user-123\/\d+-[a-f0-9-]+\.jpg$/);
  });

  it('preserves file extension', () => {
    const generateFileKey = getGenerateFileKey();
    const jpgResult = generateFileKey('uploads', 'image.jpg');
    const pngResult = generateFileKey('uploads', 'image.png');
    const webpResult = generateFileKey('uploads', 'image.webp');

    expect(jpgResult).toMatch(/\.jpg$/);
    expect(pngResult).toMatch(/\.png$/);
    expect(webpResult).toMatch(/\.webp$/);
  });

  it('handles files with multiple dots in name', () => {
    const generateFileKey = getGenerateFileKey();
    const result = generateFileKey('uploads', 'my.photo.backup.jpg');

    expect(result).toMatch(/\.jpg$/);
  });

  it('handles different folder names', () => {
    const generateFileKey = getGenerateFileKey();
    const avatarResult = generateFileKey('avatars', 'image.jpg');
    const bannerResult = generateFileKey('banners', 'image.jpg');
    const courseResult = generateFileKey('courses/thumbnails', 'image.jpg');

    expect(avatarResult).toMatch(/^avatars\//);
    expect(bannerResult).toMatch(/^banners\//);
    expect(courseResult).toMatch(/^courses\/thumbnails\//);
  });

  it('generates unique keys for same file name', () => {
    // Need to use real timers for this test to get unique UUIDs
    jest.useRealTimers();
    const generateFileKey = getGenerateFileKey();

    const result1 = generateFileKey('uploads', 'photo.jpg');
    const result2 = generateFileKey('uploads', 'photo.jpg');

    expect(result1).not.toBe(result2);
  });

  it('includes timestamp for ordering', () => {
    const generateFileKey = getGenerateFileKey();
    const result = generateFileKey('uploads', 'photo.jpg');

    // Extract timestamp from result
    const timestampMatch = result.match(/\/(\d+)-/);
    expect(timestampMatch).not.toBeNull();

    const timestamp = parseInt(timestampMatch![1]);
    expect(timestamp).toBe(new Date('2025-01-15T12:00:00Z').getTime());
  });

  it('handles files without extension', () => {
    const generateFileKey = getGenerateFileKey();
    const result = generateFileKey('uploads', 'README');

    // Files without dot get the last "part" after split('.') which is the filename itself
    expect(result).toMatch(/^uploads\/\d+-[a-f0-9-]+\.README$/);
  });
});

describe('getPublicUrl', () => {
  // These tests require careful env var setup before module load

  const getStorageModule = (cdnUrl?: string) => {
    jest.resetModules();

    process.env.B2_ENDPOINT = 'https://s3.us-west-004.backblazeb2.com';
    process.env.B2_REGION = 'us-west-004';
    process.env.B2_KEY_ID = 'test-key-id';
    process.env.B2_APP_KEY = 'test-app-key';
    process.env.B2_BUCKET_NAME = 'test-bucket';

    if (cdnUrl) {
      process.env.B2_CDN_URL = cdnUrl;
    } else {
      delete process.env.B2_CDN_URL;
    }

    return require('@/lib/storage');
  };

  it('returns B2 endpoint URL when CDN is not configured', () => {
    const storage = getStorageModule();
    const result = storage.getPublicUrl('uploads/image.jpg');

    expect(result).toBe('https://s3.us-west-004.backblazeb2.com/test-bucket/uploads/image.jpg');
  });

  it('returns CDN URL when configured', () => {
    const storage = getStorageModule('https://cdn.dancehub.com');
    const result = storage.getPublicUrl('uploads/image.jpg');

    expect(result).toBe('https://cdn.dancehub.com/uploads/image.jpg');
  });

  it('handles nested paths', () => {
    const storage = getStorageModule('https://cdn.example.com');
    const result = storage.getPublicUrl('community/avatars/user-123/photo.png');

    expect(result).toBe('https://cdn.example.com/community/avatars/user-123/photo.png');
  });

  it('handles empty key', () => {
    const storage = getStorageModule('https://cdn.example.com');
    const result = storage.getPublicUrl('');

    expect(result).toBe('https://cdn.example.com/');
  });
});
