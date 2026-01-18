/**
 * Test database utilities for Neon integration tests
 * Provides direct database access for testing API route migrations
 */
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required for tests');
}

export const testSql = neon(databaseUrl);

/**
 * Execute a typed SQL query
 */
export async function testQuery<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return testSql(strings, ...values) as Promise<T[]>;
}

/**
 * Execute a typed SQL query expecting a single result
 */
export async function testQueryOne<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T | null> {
  const results = await testSql(strings, ...values) as T[];
  return results[0] ?? null;
}

// Test data IDs - will be populated during setup
export const TEST_IDS = {
  profileId: '',
  communityId: '',
  communitySlug: '',
  courseId: '',
  courseSlug: '',
  chapterId: '',
  lessonId: '',
  privateLessonId: '',
  liveClassId: '',
  threadId: '',
  memberId: '',
  secondProfileId: '',
};

/**
 * Create test data for integration tests
 */
export async function setupTestData(): Promise<typeof TEST_IDS> {
  // Generate unique identifiers for this test run
  const uniqueSuffix = Date.now().toString(36);
  const testEmail = `test-wave-${uniqueSuffix}@dancehub-test.com`;
  const secondTestEmail = `test-wave-member-${uniqueSuffix}@dancehub-test.com`;
  const communitySlug = `test-community-${uniqueSuffix}`;
  const courseSlug = `test-course-${uniqueSuffix}`;

  // Create a test profile (community creator)
  const profile = await testQueryOne<{ id: string }>`
    INSERT INTO profiles (id, email, display_name, full_name, is_admin)
    VALUES (
      gen_random_uuid(),
      ${testEmail},
      ${'test_creator_' + uniqueSuffix},
      'Test Creator User',
      false
    )
    RETURNING id
  `;

  if (!profile) throw new Error('Failed to create test profile');
  TEST_IDS.profileId = profile.id;

  // Create a second test profile (community member)
  const secondProfile = await testQueryOne<{ id: string }>`
    INSERT INTO profiles (id, email, display_name, full_name, is_admin)
    VALUES (
      gen_random_uuid(),
      ${secondTestEmail},
      ${'test_member_' + uniqueSuffix},
      'Test Member User',
      false
    )
    RETURNING id
  `;

  if (!secondProfile) throw new Error('Failed to create second test profile');
  TEST_IDS.secondProfileId = secondProfile.id;

  // Create a test community
  const community = await testQueryOne<{ id: string }>`
    INSERT INTO communities (id, name, slug, description, created_by, status, membership_enabled, membership_price)
    VALUES (
      gen_random_uuid(),
      'Test Integration Community',
      ${communitySlug},
      'A test community for integration tests',
      ${TEST_IDS.profileId},
      'active',
      true,
      10.00
    )
    RETURNING id
  `;

  if (!community) throw new Error('Failed to create test community');
  TEST_IDS.communityId = community.id;
  TEST_IDS.communitySlug = communitySlug;

  // Create a community member
  const member = await testQueryOne<{ id: string }>`
    INSERT INTO community_members (id, user_id, community_id, role, status)
    VALUES (
      gen_random_uuid(),
      ${TEST_IDS.secondProfileId},
      ${TEST_IDS.communityId},
      'member',
      'active'
    )
    RETURNING id
  `;

  if (!member) throw new Error('Failed to create test member');
  TEST_IDS.memberId = member.id;

  // Create a test course
  const course = await testQueryOne<{ id: string }>`
    INSERT INTO courses (id, title, slug, description, community_id, created_by, is_public)
    VALUES (
      gen_random_uuid(),
      'Test Integration Course',
      ${courseSlug},
      'A test course for integration tests',
      ${TEST_IDS.communityId},
      ${TEST_IDS.profileId},
      true
    )
    RETURNING id
  `;

  if (!course) throw new Error('Failed to create test course');
  TEST_IDS.courseId = course.id;
  TEST_IDS.courseSlug = courseSlug;

  // Create a test chapter
  const chapter = await testQueryOne<{ id: string }>`
    INSERT INTO chapters (id, title, chapter_position, course_id)
    VALUES (
      gen_random_uuid(),
      'Test Integration Chapter',
      1,
      ${TEST_IDS.courseId}
    )
    RETURNING id
  `;

  if (!chapter) throw new Error('Failed to create test chapter');
  TEST_IDS.chapterId = chapter.id;

  // Create a test lesson
  const lesson = await testQueryOne<{ id: string }>`
    INSERT INTO lessons (id, title, content, lesson_position, chapter_id, created_by)
    VALUES (
      gen_random_uuid(),
      'Test Integration Lesson',
      'Test lesson content for integration tests',
      1,
      ${TEST_IDS.chapterId},
      ${TEST_IDS.profileId}
    )
    RETURNING id
  `;

  if (!lesson) throw new Error('Failed to create test lesson');
  TEST_IDS.lessonId = lesson.id;

  // Create a test private lesson
  const privateLesson = await testQueryOne<{ id: string }>`
    INSERT INTO private_lessons (id, community_id, teacher_id, title, description, duration_minutes, regular_price, is_active)
    VALUES (
      gen_random_uuid(),
      ${TEST_IDS.communityId},
      ${TEST_IDS.profileId},
      'Test Integration Private Lesson',
      'A test private lesson for integration tests',
      60,
      50.00,
      true
    )
    RETURNING id
  `;

  if (!privateLesson) throw new Error('Failed to create test private lesson');
  TEST_IDS.privateLessonId = privateLesson.id;

  // Create a test live class
  const liveClass = await testQueryOne<{ id: string }>`
    INSERT INTO live_classes (id, community_id, teacher_id, title, description, scheduled_start_time, duration_minutes, status)
    VALUES (
      gen_random_uuid(),
      ${TEST_IDS.communityId},
      ${TEST_IDS.profileId},
      'Test Integration Live Class',
      'A test live class for integration tests',
      NOW() + INTERVAL '1 day',
      60,
      'scheduled'
    )
    RETURNING id
  `;

  if (!liveClass) throw new Error('Failed to create test live class');
  TEST_IDS.liveClassId = liveClass.id;

  // Create a test thread
  const thread = await testQueryOne<{ id: string }>`
    INSERT INTO threads (id, title, content, user_id, community_id, created_by, author_name)
    VALUES (
      gen_random_uuid(),
      'Test Integration Thread',
      'Test thread content for integration tests',
      ${TEST_IDS.profileId},
      ${TEST_IDS.communityId},
      ${TEST_IDS.profileId},
      'Test Creator User'
    )
    RETURNING id
  `;

  if (!thread) throw new Error('Failed to create test thread');
  TEST_IDS.threadId = thread.id;

  return TEST_IDS;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of creation (respecting foreign keys)
  if (TEST_IDS.threadId) {
    await testSql`DELETE FROM threads WHERE id = ${TEST_IDS.threadId}`;
  }
  if (TEST_IDS.liveClassId) {
    await testSql`DELETE FROM live_classes WHERE id = ${TEST_IDS.liveClassId}`;
  }
  if (TEST_IDS.privateLessonId) {
    await testSql`DELETE FROM private_lessons WHERE id = ${TEST_IDS.privateLessonId}`;
  }
  if (TEST_IDS.lessonId) {
    await testSql`DELETE FROM lessons WHERE id = ${TEST_IDS.lessonId}`;
  }
  if (TEST_IDS.chapterId) {
    await testSql`DELETE FROM chapters WHERE id = ${TEST_IDS.chapterId}`;
  }
  if (TEST_IDS.courseId) {
    await testSql`DELETE FROM courses WHERE id = ${TEST_IDS.courseId}`;
  }
  if (TEST_IDS.memberId) {
    await testSql`DELETE FROM community_members WHERE id = ${TEST_IDS.memberId}`;
  }
  if (TEST_IDS.communityId) {
    await testSql`DELETE FROM communities WHERE id = ${TEST_IDS.communityId}`;
  }
  if (TEST_IDS.secondProfileId) {
    await testSql`DELETE FROM profiles WHERE id = ${TEST_IDS.secondProfileId}`;
  }
  if (TEST_IDS.profileId) {
    await testSql`DELETE FROM profiles WHERE id = ${TEST_IDS.profileId}`;
  }

  // Reset IDs
  TEST_IDS.profileId = '';
  TEST_IDS.communityId = '';
  TEST_IDS.communitySlug = '';
  TEST_IDS.courseId = '';
  TEST_IDS.courseSlug = '';
  TEST_IDS.chapterId = '';
  TEST_IDS.lessonId = '';
  TEST_IDS.privateLessonId = '';
  TEST_IDS.liveClassId = '';
  TEST_IDS.threadId = '';
  TEST_IDS.memberId = '';
  TEST_IDS.secondProfileId = '';
}
