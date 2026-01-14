/**
 * Storage Migration Script: Supabase to Backblaze B2
 *
 * This script migrates existing files from Supabase Storage to Backblaze B2.
 * It handles:
 * - community-images bucket
 * - course-images bucket
 * - avatars bucket
 * - images bucket (community pages)
 *
 * Usage:
 * 1. Set up environment variables (see below)
 * 2. Run: npx tsx scripts/migrate-storage.ts
 *
 * Required Environment Variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - B2_ENDPOINT
 * - B2_REGION
 * - B2_KEY_ID
 * - B2_APP_KEY
 * - B2_BUCKET_NAME
 * - B2_CDN_URL (optional)
 */

import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize B2 client
const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME!;
const CDN_URL = process.env.B2_CDN_URL;

// Buckets to migrate
const BUCKETS = [
  'community-images',
  'course-images',
  'avatars',
  'images',
];

interface MigrationStats {
  bucket: string;
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
}

async function getPublicUrl(key: string): Promise<string> {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  return `${process.env.B2_ENDPOINT}/${B2_BUCKET_NAME}/${key}`;
}

async function downloadFromSupabase(bucket: string, path: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error(`Error downloading ${bucket}/${path}:`, error);
    return null;
  }

  return data;
}

async function uploadToB2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string | null> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return await getPublicUrl(key);
  } catch (error) {
    console.error(`Error uploading to B2:`, error);
    return null;
  }
}

async function listBucketFiles(bucket: string): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', {
        limit,
        offset,
      });

    if (error) {
      console.error(`Error listing ${bucket}:`, error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    // Filter out folders, only get files
    for (const item of data) {
      if (item.id && !item.name.endsWith('/')) {
        files.push(item.name);
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
}

async function checkFileExistsInB2(key: string): Promise<boolean> {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: B2_BUCKET_NAME,
        Prefix: key,
        MaxKeys: 1,
      })
    );

    return (response.Contents?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function migrateBucket(bucket: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    bucket,
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`\n📁 Migrating bucket: ${bucket}`);

  const files = await listBucketFiles(bucket);
  stats.total = files.length;

  console.log(`   Found ${files.length} files`);

  for (const filePath of files) {
    // Generate B2 key (preserve folder structure)
    const b2Key = `${bucket}/${filePath}`;

    // Check if file already exists in B2
    const exists = await checkFileExistsInB2(b2Key);
    if (exists) {
      console.log(`   ⏭️  Skipped (exists): ${filePath}`);
      stats.skipped++;
      continue;
    }

    // Download from Supabase
    const blob = await downloadFromSupabase(bucket, filePath);
    if (!blob) {
      console.log(`   ❌ Failed to download: ${filePath}`);
      stats.failed++;
      continue;
    }

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = blob.type || 'application/octet-stream';

    // Upload to B2
    const result = await uploadToB2(buffer, b2Key, contentType);
    if (result) {
      console.log(`   ✅ Migrated: ${filePath}`);
      stats.migrated++;
    } else {
      console.log(`   ❌ Failed to upload: ${filePath}`);
      stats.failed++;
    }
  }

  return stats;
}

async function updateDatabaseUrls(): Promise<void> {
  console.log('\n📝 Updating database URLs...');

  const oldBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! + '/storage/v1/object/public';
  const newBaseUrl = CDN_URL || `${process.env.B2_ENDPOINT}/${B2_BUCKET_NAME}`;

  // Update community image URLs
  console.log('   Updating communities.image_url...');
  const { error: communityError } = await supabase
    .from('communities')
    .update({
      image_url: supabase.rpc('replace', {
        column: 'image_url',
        from: oldBaseUrl,
        to: newBaseUrl,
      }),
    })
    .like('image_url', `${oldBaseUrl}%`);

  if (communityError) {
    console.error('   Error updating community URLs:', communityError);
  }

  // Update course image URLs
  console.log('   Updating courses.image_url...');
  const { error: courseError } = await supabase
    .from('courses')
    .update({
      image_url: supabase.rpc('replace', {
        column: 'image_url',
        from: oldBaseUrl,
        to: newBaseUrl,
      }),
    })
    .like('image_url', `${oldBaseUrl}%`);

  if (courseError) {
    console.error('   Error updating course URLs:', courseError);
  }

  // Update profile avatar URLs
  console.log('   Updating profiles.avatar_url...');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: supabase.rpc('replace', {
        column: 'avatar_url',
        from: oldBaseUrl,
        to: newBaseUrl,
      }),
    })
    .like('avatar_url', `${oldBaseUrl}%`);

  if (profileError) {
    console.error('   Error updating profile URLs:', profileError);
  }

  console.log('   Database URL updates complete');
}

async function main() {
  console.log('🚀 Starting Storage Migration: Supabase → Backblaze B2');
  console.log('================================================');

  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'B2_ENDPOINT',
    'B2_REGION',
    'B2_KEY_ID',
    'B2_APP_KEY',
    'B2_BUCKET_NAME',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  console.log('\nConfiguration:');
  console.log(`  Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`  B2 Endpoint: ${process.env.B2_ENDPOINT}`);
  console.log(`  B2 Bucket: ${B2_BUCKET_NAME}`);
  console.log(`  CDN URL: ${CDN_URL || '(not configured)'}`);

  const allStats: MigrationStats[] = [];

  // Migrate each bucket
  for (const bucket of BUCKETS) {
    const stats = await migrateBucket(bucket);
    allStats.push(stats);
  }

  // Print summary
  console.log('\n================================================');
  console.log('📊 Migration Summary:');
  console.log('================================================');

  let totalFiles = 0;
  let totalMigrated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const stats of allStats) {
    console.log(`\n${stats.bucket}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Skipped: ${stats.skipped}`);

    totalFiles += stats.total;
    totalMigrated += stats.migrated;
    totalFailed += stats.failed;
    totalSkipped += stats.skipped;
  }

  console.log('\n------------------------------------------------');
  console.log('Total:');
  console.log(`  Files: ${totalFiles}`);
  console.log(`  Migrated: ${totalMigrated}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Skipped: ${totalSkipped}`);

  // Update database URLs
  const updateUrls = process.argv.includes('--update-urls');
  if (updateUrls) {
    await updateDatabaseUrls();
  } else {
    console.log('\n💡 To update database URLs, run with --update-urls flag');
  }

  console.log('\n✅ Migration complete!');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
