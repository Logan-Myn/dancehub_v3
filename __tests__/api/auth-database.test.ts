/**
 * Auth Database Layer Tests - Better Auth + Neon Integration
 *
 * Tests the database operations for authentication-related API routes:
 * 1. Profile creation on signup (INSERT with ON CONFLICT)
 * 2. Profile email sync on email verification (UPDATE by auth_user_id)
 * 3. Profile email sync on email change (UPDATE by auth_user_id)
 *
 * These tests validate the Neon database layer for the auth routes
 * migrated from Supabase to Better Auth + Neon.
 *
 * Schema notes:
 * - Better Auth "user" table uses camelCase: emailVerified, createdAt, updatedAt
 * - profiles table uses snake_case: auth_user_id, created_at, updated_at
 * - auth_user_id is TEXT type (matching Better Auth user.id)
 */

import {
  testQuery,
  testQueryOne,
  testSql,
} from '../utils/test-db';

// Interfaces matching the auth database operations
interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  is_admin: boolean;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Better Auth uses camelCase column names
interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;  // camelCase in Better Auth
  createdAt: string;       // camelCase
  updatedAt: string;       // camelCase
}

// Test data IDs for auth tests
const AUTH_TEST_IDS = {
  profileId: '',
  authUserId: '',
  secondProfileId: '',
  secondAuthUserId: '',
};

describe('Auth Database Layer Tests - Better Auth + Neon Integration', () => {
  // Generate unique identifiers for this test run
  const uniqueSuffix = Date.now().toString(36);

  beforeAll(async () => {
    // Create a test Better Auth user first
    // Note: Better Auth uses camelCase column names and TEXT id
    const authUser = await testQueryOne<{ id: string }>`
      INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
      VALUES (
        ${'auth-test-' + uniqueSuffix},
        ${'auth-test-user-' + uniqueSuffix + '@test.com'},
        'Test Auth User',
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (!authUser) throw new Error('Failed to create test auth user');
    AUTH_TEST_IDS.authUserId = authUser.id;

    // Create a second auth user for additional tests
    const secondAuthUser = await testQueryOne<{ id: string }>`
      INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
      VALUES (
        ${'auth-test2-' + uniqueSuffix},
        ${'auth-test-user2-' + uniqueSuffix + '@test.com'},
        'Test Auth User 2',
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (!secondAuthUser) throw new Error('Failed to create second test auth user');
    AUTH_TEST_IDS.secondAuthUserId = secondAuthUser.id;
  });

  afterAll(async () => {
    // Clean up test data in reverse order (profiles first due to FK)
    if (AUTH_TEST_IDS.profileId) {
      await testSql`DELETE FROM profiles WHERE id = ${AUTH_TEST_IDS.profileId}`;
    }
    if (AUTH_TEST_IDS.secondProfileId) {
      await testSql`DELETE FROM profiles WHERE id = ${AUTH_TEST_IDS.secondProfileId}`;
    }
    if (AUTH_TEST_IDS.authUserId) {
      await testSql`DELETE FROM "user" WHERE id = ${AUTH_TEST_IDS.authUserId}`;
    }
    if (AUTH_TEST_IDS.secondAuthUserId) {
      await testSql`DELETE FROM "user" WHERE id = ${AUTH_TEST_IDS.secondAuthUserId}`;
    }

    // Reset IDs
    AUTH_TEST_IDS.profileId = '';
    AUTH_TEST_IDS.authUserId = '';
    AUTH_TEST_IDS.secondProfileId = '';
    AUTH_TEST_IDS.secondAuthUserId = '';
  });

  describe('1. Database Connection', () => {
    it('should connect to Neon database', async () => {
      const result = await testQueryOne<{ now: string }>`SELECT NOW() as now`;
      expect(result).not.toBeNull();
      expect(result?.now).toBeDefined();
    });

    it('should have Better Auth user table', async () => {
      const result = await testQueryOne<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'user'
        ) as exists
      `;
      expect(result?.exists).toBe(true);
    });

    it('should have profiles table with auth_user_id column', async () => {
      const result = await testQueryOne<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'auth_user_id'
        ) as exists
      `;
      expect(result?.exists).toBe(true);
    });
  });

  describe('2. Signup Profile Creation (app/api/auth/signup/route.ts pattern)', () => {
    it('should create profile with full_name and auto-generate display_name', async () => {
      const email = `signup-test-${uniqueSuffix}@test.com`;
      const fullName = 'John Doe';

      // Pattern from signup route: INSERT with all fields
      const profile = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${email},
          ${fullName},
          ${fullName.split(' ')[0]},
          NOW(),
          NOW(),
          ${AUTH_TEST_IDS.authUserId}
        )
        RETURNING *
      `;

      expect(profile).not.toBeNull();
      expect(profile?.email).toBe(email);
      expect(profile?.full_name).toBe(fullName);
      expect(profile?.display_name).toBe('John');
      expect(profile?.auth_user_id).toBe(AUTH_TEST_IDS.authUserId);

      AUTH_TEST_IDS.profileId = profile!.id;
    });

    it('should create profile with NULL full_name and display_name', async () => {
      const email = `signup-test-null-${uniqueSuffix}@test.com`;
      const fullName = null as string | null;
      const displayName = fullName?.split(' ')[0] || null;

      // Pattern from signup route: INSERT with NULL values
      const profile = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${email},
          ${fullName},
          ${displayName},
          NOW(),
          NOW(),
          ${AUTH_TEST_IDS.secondAuthUserId}
        )
        RETURNING *
      `;

      expect(profile).not.toBeNull();
      expect(profile?.email).toBe(email);
      expect(profile?.full_name).toBeNull();
      expect(profile?.display_name).toBeNull();
      expect(profile?.auth_user_id).toBe(AUTH_TEST_IDS.secondAuthUserId);

      AUTH_TEST_IDS.secondProfileId = profile!.id;
    });

    it('should handle ON CONFLICT (email) upsert pattern from signup route', async () => {
      // First, get the existing profile
      const existingProfile = await testQueryOne<Profile>`
        SELECT * FROM profiles WHERE id = ${AUTH_TEST_IDS.profileId}
      `;
      expect(existingProfile).not.toBeNull();

      const newAuthUserId = AUTH_TEST_IDS.authUserId;

      // Pattern from signup route: ON CONFLICT (email) updates auth_user_id
      // This works because profiles.email has a unique constraint
      const updatedProfile = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${existingProfile!.email},
          ${'Updated Name'},
          ${'Updated'},
          NOW(),
          NOW(),
          ${newAuthUserId}
        )
        ON CONFLICT (email) DO UPDATE SET
          auth_user_id = ${newAuthUserId},
          updated_at = NOW()
        RETURNING *
      `;

      expect(updatedProfile).not.toBeNull();
      // Should keep the same ID (upsert on existing row)
      expect(updatedProfile?.id).toBe(existingProfile!.id);
      // auth_user_id should be updated
      expect(updatedProfile?.auth_user_id).toBe(newAuthUserId);
      // original fields should NOT change (only auth_user_id and updated_at)
      expect(updatedProfile?.full_name).toBe(existingProfile!.full_name);
    });

    it('should handle display_name extraction from multi-word full_name', async () => {
      const fullName = 'Maria Garcia Lopez';
      const email = `multi-word-test-${uniqueSuffix}@test.com`;

      // Create a temp auth user for this test (Better Auth uses TEXT id)
      const tempAuthUser = await testQueryOne<{ id: string }>`
        INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
        VALUES (${'temp-auth-' + uniqueSuffix}, ${email}, ${fullName}, false, NOW(), NOW())
        RETURNING id
      `;

      const profile = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${email},
          ${fullName},
          ${fullName.split(' ')[0]},
          NOW(),
          NOW(),
          ${tempAuthUser!.id}
        )
        RETURNING *
      `;

      expect(profile?.display_name).toBe('Maria');
      expect(profile?.full_name).toBe('Maria Garcia Lopez');

      // Cleanup
      await testSql`DELETE FROM profiles WHERE id = ${profile!.id}`;
      await testSql`DELETE FROM "user" WHERE id = ${tempAuthUser!.id}`;
    });
  });

  describe('3. Email Verification Sync (app/api/auth/verify-email/route.ts pattern)', () => {
    it('should update profile email by auth_user_id', async () => {
      const newEmail = `verified-${uniqueSuffix}@test.com`;

      // Pattern from verify-email route: UPDATE by auth_user_id
      const updatedProfile = await testQueryOne<Profile>`
        UPDATE profiles
        SET email = ${newEmail}, updated_at = NOW()
        WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
        RETURNING *
      `;

      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile?.email).toBe(newEmail);
      expect(updatedProfile?.auth_user_id).toBe(AUTH_TEST_IDS.authUserId);
    });

    it('should update updated_at timestamp on email change', async () => {
      // Get current timestamp
      const before = await testQueryOne<Profile>`
        SELECT * FROM profiles WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
      `;
      expect(before).not.toBeNull();

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const newEmail = `verified2-${uniqueSuffix}@test.com`;

      const after = await testQueryOne<Profile>`
        UPDATE profiles
        SET email = ${newEmail}, updated_at = NOW()
        WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
        RETURNING *
      `;

      expect(after).not.toBeNull();
      expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
        new Date(before!.updated_at).getTime()
      );
    });

    it('should handle update when profile does not exist (no-op)', async () => {
      const nonExistentAuthUserId = 'non-existent-auth-user-id';
      const newEmail = 'should-not-update@test.com';

      // This should return null (no rows updated)
      const result = await testQueryOne<Profile>`
        UPDATE profiles
        SET email = ${newEmail}, updated_at = NOW()
        WHERE auth_user_id = ${nonExistentAuthUserId}
        RETURNING *
      `;

      expect(result).toBeNull();
    });
  });

  describe('4. Email Change Sync (app/api/auth/verify-email-change/route.ts pattern)', () => {
    it('should update email on change verification', async () => {
      const changedEmail = `changed-email-${uniqueSuffix}@test.com`;

      // Pattern from verify-email-change route (same as verify-email)
      const updatedProfile = await testQueryOne<Profile>`
        UPDATE profiles
        SET email = ${changedEmail}, updated_at = NOW()
        WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
        RETURNING *
      `;

      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile?.email).toBe(changedEmail);
    });

    it('should handle sequential email updates', async () => {
      // Simulate two updates in sequence
      const email1 = `sequential1-${uniqueSuffix}@test.com`;
      const email2 = `sequential2-${uniqueSuffix}@test.com`;

      await testSql`
        UPDATE profiles
        SET email = ${email1}, updated_at = NOW()
        WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
      `;

      await testSql`
        UPDATE profiles
        SET email = ${email2}, updated_at = NOW()
        WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
      `;

      const result = await testQueryOne<Profile>`
        SELECT * FROM profiles WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
      `;

      // Last update should win
      expect(result?.email).toBe(email2);
    });
  });

  describe('5. Better Auth User Table Tests', () => {
    it('should query Better Auth user by id', async () => {
      const user = await testQueryOne<BetterAuthUser>`
        SELECT * FROM "user" WHERE id = ${AUTH_TEST_IDS.authUserId}
      `;

      expect(user).not.toBeNull();
      expect(user?.email).toContain('auth-test-user');
    });

    it('should have session table', async () => {
      const result = await testQueryOne<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'session'
        ) as exists
      `;
      expect(result?.exists).toBe(true);
    });

    it('should have account table', async () => {
      const result = await testQueryOne<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'account'
        ) as exists
      `;
      expect(result?.exists).toBe(true);
    });

    it('should have verification table', async () => {
      const result = await testQueryOne<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'verification'
        ) as exists
      `;
      expect(result?.exists).toBe(true);
    });
  });

  describe('6. Profile-User Relationship Tests', () => {
    it('should join profiles with Better Auth user table', async () => {
      const result = await testQueryOne<{
        profile_id: string;
        profile_email: string;
        auth_user_id: string;
        auth_email: string;
        auth_name: string;
      }>`
        SELECT
          p.id as profile_id,
          p.email as profile_email,
          u.id as auth_user_id,
          u.email as auth_email,
          u.name as auth_name
        FROM profiles p
        JOIN "user" u ON p.auth_user_id = u.id
        WHERE p.id = ${AUTH_TEST_IDS.profileId}
      `;

      expect(result).not.toBeNull();
      expect(result?.auth_user_id).toBe(AUTH_TEST_IDS.authUserId);
    });

    it('should find profile by auth_user_id', async () => {
      const profile = await testQueryOne<Profile>`
        SELECT * FROM profiles WHERE auth_user_id = ${AUTH_TEST_IDS.authUserId}
      `;

      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(AUTH_TEST_IDS.profileId);
    });

    it('should allow NULL auth_user_id for legacy profiles', async () => {
      // Create a profile without auth_user_id (legacy migration case)
      const legacyEmail = `legacy-profile-${uniqueSuffix}@test.com`;

      const legacyProfile = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${legacyEmail},
          'Legacy User',
          NULL,
          NOW(),
          NOW(),
          NULL
        )
        RETURNING *
      `;

      expect(legacyProfile).not.toBeNull();
      expect(legacyProfile?.auth_user_id).toBeNull();

      // Cleanup
      await testSql`DELETE FROM profiles WHERE id = ${legacyProfile!.id}`;
    });
  });

  describe('7. Constraint Tests', () => {
    it('should enforce unique email constraint on profiles', async () => {
      const existingProfile = await testQueryOne<Profile>`
        SELECT * FROM profiles WHERE id = ${AUTH_TEST_IDS.profileId}
      `;

      // Create a temp auth user for the duplicate email test
      const tempAuthUser = await testQueryOne<{ id: string }>`
        INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
        VALUES (${'temp-dup-' + Date.now()}, ${'temp-dup-' + Date.now() + '@test.com'}, 'Temp', false, NOW(), NOW())
        RETURNING id
      `;

      // Try to insert duplicate email without ON CONFLICT - should fail
      let errorThrown = false;
      try {
        await testSql`
          INSERT INTO profiles (id, email, created_at, updated_at, auth_user_id)
          VALUES (gen_random_uuid(), ${existingProfile!.email}, NOW(), NOW(), ${tempAuthUser!.id})
        `;
      } catch (error) {
        errorThrown = true;
        expect(String(error)).toContain('profiles_email_key');
      }
      expect(errorThrown).toBe(true);

      // Cleanup
      await testSql`DELETE FROM "user" WHERE id = ${tempAuthUser!.id}`;
    });

    it('should allow multiple NULL display_names', async () => {
      const email1 = `null-display1-${uniqueSuffix}@test.com`;
      const email2 = `null-display2-${uniqueSuffix}@test.com`;

      const profile1 = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, display_name, created_at, updated_at)
        VALUES (gen_random_uuid(), ${email1}, NULL, NOW(), NOW())
        RETURNING *
      `;

      const profile2 = await testQueryOne<Profile>`
        INSERT INTO profiles (id, email, display_name, created_at, updated_at)
        VALUES (gen_random_uuid(), ${email2}, NULL, NOW(), NOW())
        RETURNING *
      `;

      expect(profile1?.display_name).toBeNull();
      expect(profile2?.display_name).toBeNull();

      // Cleanup
      await testSql`DELETE FROM profiles WHERE id = ${profile1!.id}`;
      await testSql`DELETE FROM profiles WHERE id = ${profile2!.id}`;
    });

    it('should enforce foreign key from profiles.auth_user_id to user.id', async () => {
      const fakeAuthUserId = 'this-user-does-not-exist';
      const email = `fk-test-${uniqueSuffix}@test.com`;

      // Try to insert profile with non-existent auth_user_id - should fail
      let errorThrown = false;
      try {
        await testSql`
          INSERT INTO profiles (id, email, auth_user_id, created_at, updated_at)
          VALUES (gen_random_uuid(), ${email}, ${fakeAuthUserId}, NOW(), NOW())
        `;
      } catch (error) {
        errorThrown = true;
        expect(String(error)).toContain('foreign key');
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe('8. Better Auth Schema Verification', () => {
    it('should have all required Better Auth columns in user table', async () => {
      const columns = await testQuery<{ column_name: string }>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      // Required Better Auth columns (camelCase)
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('emailVerified');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should have custom Better Auth columns', async () => {
      const columns = await testQuery<{ column_name: string }>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      // Custom fields added in auth-server.ts
      expect(columnNames).toContain('displayName');
      expect(columnNames).toContain('fullName');
      expect(columnNames).toContain('avatarUrl');
      expect(columnNames).toContain('isAdmin');
      expect(columnNames).toContain('stripeAccountId');
    });

    it('should have session table with required columns', async () => {
      const columns = await testQuery<{ column_name: string }>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'session'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('token');
      expect(columnNames).toContain('expiresAt');
    });

    it('should have account table with required columns', async () => {
      const columns = await testQuery<{ column_name: string }>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'account'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('providerId');
      expect(columnNames).toContain('accountId');
    });
  });
});
