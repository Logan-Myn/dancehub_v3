# Migration Analysis: Supabase → Better-Auth + Neon

> **Document Created:** January 2025
> **Project:** DanceHub v3
> **Status:** In Progress

---

## Current Progress

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1.1** | Backup Everything | ✅ Completed |
| **Phase 1.2** | Switch from npm to Bun | ✅ Completed |
| **Phase 1.3** | Set Up Neon Database | ✅ Completed |
| **Phase 1.4** | Install New Dependencies | ✅ Completed |
| **Phase 2** | Database Migration | ⬜ Not Started |
| **Phase 3** | Authentication Migration | ⬜ Not Started |
| **Phase 4** | Storage Migration | ⬜ Not Started |
| **Phase 5** | Code Updates | ⬜ Not Started |
| **Phase 6** | Testing | ⬜ Not Started |

**Last Updated:** January 14, 2025
**Current Step:** Phase 2 - Database Migration

---

## Executive Summary

This document outlines the migration strategy from Supabase (Auth + Database + Storage) to Better-Auth for authentication and Neon for PostgreSQL database. The migration is recommended due to consistency with other projects, better developer experience, and modern architecture benefits.

**Estimated Timeline:** 3-4 weeks
**Risk Level:** Medium
**Recommendation:** Proceed with migration using Big Bang approach

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Migration Strategy](#migration-strategy)
4. [Risk Assessment](#risk-assessment)
5. [Implementation Phases](#implementation-phases)
6. [Technical Details](#technical-details)
7. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### Supabase Usage Overview

| Component | Files Affected | Complexity |
|-----------|----------------|------------|
| Authentication | 30+ files | High |
| Database queries | 100+ files | Medium |
| Storage | 10+ files | Medium |
| Middleware | 1 file | Medium |
| RLS Policies | 54 migrations | High |

### Key Dependencies

```json
{
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.47.12"
}
```

### Files Using Supabase (147 total)

**Core Authentication Files:**
- `contexts/AuthContext.tsx` - Main auth provider
- `middleware.ts` - Route protection
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/admin.ts` - Server-side admin client
- `lib/auth.ts` - Auth utilities
- `hooks/auth.ts` - Auth hooks

**API Routes (90+ files):**
- `/app/api/auth/*` - Authentication endpoints
- `/app/api/community/*` - Community operations
- `/app/api/admin/*` - Admin operations
- `/app/api/stripe/*` - Payment operations
- `/app/api/threads/*` - Forum operations

**Components (40+ files):**
- Auth modals and forms
- User profile components
- Video session components
- Upload components

### Database Schema

**54 Migration Files** defining:
- `profiles` - User profiles
- `communities` - Dance communities
- `members` - Community memberships
- `courses`, `chapters`, `lessons` - Course content
- `threads`, `comments` - Forum system
- `private_lessons`, `lesson_bookings` - Booking system
- `live_classes` - Live class management
- `teacher_availability` - Scheduling
- `notifications` - User notifications
- `email_preferences` - Email settings
- Various junction tables and views

### Current Auth Patterns

```typescript
// Client-side auth (AuthContext.tsx)
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
supabase.auth.onAuthStateChange((_event, session) => { ... });

// Server-side auth (API routes)
const supabase = createAdminClient();
const { data: { user } } = await supabase.auth.getUser();

// Middleware auth
const supabase = createMiddlewareClient({ req, res });
const { data: { session } } = await supabase.auth.getSession();
```

---

## Target Architecture

### New Stack

| Component | Current | Target |
|-----------|---------|--------|
| Authentication | Supabase Auth | Better-Auth |
| Database | Supabase PostgreSQL | Neon Serverless |
| Storage (Images/Docs) | Supabase Storage | Backblaze B2 |
| Storage (Videos) | Mux | Mux (unchanged) |
| ORM | Raw SQL | Drizzle ORM (optional) |

### Why Backblaze B2?

| Feature | Backblaze B2 | Alternatives |
|---------|--------------|--------------|
| **Cost** | $0.006/GB stored | Vercel Blob: $0.15/GB, S3: $0.023/GB |
| **Egress** | Free with Cloudflare | Others charge $0.09-0.30/GB |
| **API** | S3-compatible | Native S3 |
| **Consistency** | Already used in other projects | Would be new setup |

Backblaze B2 is the most cost-effective option and maintains consistency with existing projects.

### Benefits of Migration

1. **Better-Auth Advantages:**
   - Framework-agnostic, modern architecture
   - Built on industry standards
   - Better TypeScript support
   - More flexible session management
   - Easier to customize

2. **Neon Advantages:**
   - Serverless PostgreSQL with scale-to-zero
   - Database branching for development
   - Instant provisioning
   - Better performance in edge/serverless
   - Cost optimization

3. **Operational Benefits:**
   - Consistent stack across projects
   - Reduced vendor lock-in
   - Better developer experience
   - More control over auth logic

---

## Migration Strategy

### Approach: Big Bang Migration

**Rationale:** Project size supports this approach, cleaner implementation, faster completion.

**Alternative Approaches Considered:**
- Gradual Migration (rejected: too complex for project size)
- Feature-by-Feature (rejected: unnecessary for user base)

### High-Level Timeline

```
Week 1: Preparation & Database
├── Day 1-2: Backup, export, Neon setup
├── Day 3-4: Schema migration & verification
└── Day 5: Database client updates

Week 2: Authentication
├── Day 1-2: Better-Auth installation & config
├── Day 3-4: Auth context & middleware rewrite
└── Day 5: User data migration

Week 3: Storage & Code Updates
├── Day 1-2: Storage provider setup & migration
├── Day 3-4: Update all 147 files
└── Day 5: Integration fixes

Week 4: Testing & Deployment
├── Day 1-2: Comprehensive testing
├── Day 3: Staging deployment
├── Day 4: Production deployment
└── Day 5: Monitoring & fixes
```

---

## Risk Assessment

### High Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Password hash incompatibility | Users cannot login | Medium | Force password reset or implement gradual migration |
| Session loss during migration | All users logged out | High | Schedule maintenance window, notify users |
| Data inconsistency | Data corruption | Low | Use transactions, blue-green deployment |
| Broken file URLs | Missing images/videos | Medium | Update URLs in DB, temporary redirects |

### Medium Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RLS policy gaps | Security vulnerabilities | Medium | Implement API-level authorization |
| Third-party integration breaks | Stripe/Daily.co issues | Low | Thorough webhook testing |
| Performance regression | Slower queries | Low | Benchmark before/after, optimize |

### Low Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Environment variable issues | App won't start | Low | Checklist, staging testing |
| TypeScript type errors | Build failures | Medium | Fix incrementally |

---

## Implementation Phases

### Phase 1: Preparation (Days 1-2)

#### 1.1 Backup Everything

```bash
# Export Supabase schema
supabase db dump --file schema.sql

# Export data
pg_dump $SUPABASE_DB_URL > data_backup.sql

# Download storage files
# Use Supabase dashboard or API to download all files

# Document RLS policies
supabase db dump --role-only > rls_policies.sql
```

#### 1.2 Switch from npm to Bun

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install dependencies with Bun
bun install
```

**Why Bun?**
- Faster package installation (10-100x faster than npm)
- Faster runtime for scripts
- Built-in TypeScript support
- Drop-in replacement for npm

#### 1.3 Set Up Neon Database

```bash
# Sign up at neon.tech
# Create new project: dancehub-production
# Note connection string
```

#### 1.4 Install New Dependencies

```bash
# Remove Supabase packages (after migration)
bun remove @supabase/auth-helpers-nextjs @supabase/ssr @supabase/supabase-js

# Add new packages
bun add better-auth @neondatabase/serverless
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner  # For Backblaze B2 (S3-compatible)
```

### Phase 2: Database Migration (Days 3-5)

#### 2.1 Schema Migration

Review and consolidate 54 migration files into clean schema:

```sql
-- Core tables to migrate (priority order):
-- 1. profiles (users)
-- 2. communities
-- 3. members
-- 4. courses, chapters, lessons
-- 5. threads, comments
-- 6. private_lessons, lesson_bookings
-- 7. live_classes
-- 8. teacher_availability
-- 9. notifications, email_preferences
```

#### 2.2 Create Database Client

```typescript
// lib/db.ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Helper for typed queries
export async function query<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return sql(strings, ...values) as Promise<T[]>;
}
```

#### 2.3 Update Admin Client

```typescript
// lib/db/admin.ts
import { neon } from '@neondatabase/serverless';

export const createDbClient = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return neon(databaseUrl);
};
```

### Phase 3: Authentication Migration (Days 6-10)

#### 3.1 Better-Auth Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { neon } from "@neondatabase/serverless";

export const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      isAdmin: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

#### 3.2 API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

#### 3.3 Updated Auth Context

```typescript
// contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { User, Session } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await authClient.getSession();
    if (data) {
      setUser(data.user);
      setSession(data.session);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 3.4 Updated Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check admin status
    if (!session.user.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

### Phase 4: Storage Migration (Days 11-12)

#### 4.1 Backblaze B2 Setup

**Prerequisites:**
1. Create Backblaze B2 account (if not existing)
2. Create a new bucket: `dancehub-storage`
3. Generate Application Key with read/write access
4. Note: Bucket name, Key ID, Application Key, and Endpoint

**Optional: Cloudflare CDN Integration**
- Add bucket to Cloudflare for free egress
- Configure custom domain for file URLs

#### 4.2 Storage Client Implementation

```typescript
// lib/storage.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!, // https://s3.us-west-004.backblazeb2.com
  region: process.env.B2_REGION!, // us-west-004
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;
const CDN_URL = process.env.B2_CDN_URL; // Optional: Cloudflare CDN URL

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

  // Return CDN URL if configured, otherwise B2 URL
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  return `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

export async function listFiles(prefix: string) {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
  );
  return response.Contents || [];
}

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
```

#### 4.3 API Route for Uploads

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = formData.get('folder') as string || 'uploads';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder}/${Date.now()}-${file.name}`;

  const url = await uploadFile(buffer, key, file.type);

  return NextResponse.json({ url, key });
}
```

#### 4.4 Update Upload Components

Replace all `supabase.storage` calls with new storage functions.

#### 4.5 Migration Script for Existing Files

```typescript
// scripts/migrate-storage.ts
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '@/lib/storage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateStorage() {
  // List all buckets
  const { data: buckets } = await supabase.storage.listBuckets();

  for (const bucket of buckets || []) {
    console.log(`Migrating bucket: ${bucket.name}`);

    // List all files in bucket
    const { data: files } = await supabase.storage
      .from(bucket.name)
      .list('', { limit: 1000 });

    for (const file of files || []) {
      // Download from Supabase
      const { data } = await supabase.storage
        .from(bucket.name)
        .download(file.name);

      if (data) {
        // Upload to Backblaze B2
        const buffer = Buffer.from(await data.arrayBuffer());
        const key = `${bucket.name}/${file.name}`;
        await uploadFile(buffer, key, data.type);
        console.log(`Migrated: ${key}`);
      }
    }
  }

  console.log('Storage migration complete!');
}

migrateStorage();
```

### Phase 5: Code Updates (Days 13-15)

#### 5.1 Files to Update

**Priority 1 - Core Auth:**
- [ ] `contexts/AuthContext.tsx`
- [ ] `middleware.ts`
- [ ] `lib/supabase/client.ts` → `lib/auth-client.ts`
- [ ] `lib/supabase/admin.ts` → `lib/db.ts`
- [ ] `hooks/auth.ts`

**Priority 2 - API Routes:**
- [ ] All `/app/api/auth/*` routes
- [ ] All `/app/api/community/*` routes
- [ ] All `/app/api/admin/*` routes

**Priority 3 - Components:**
- [ ] Auth modals and forms
- [ ] User profile components
- [ ] Protected route wrappers

#### 5.2 Search and Replace Patterns

```typescript
// Pattern 1: Client creation
// Before:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// After:
import { sql } from '@/lib/db'
import { authClient } from '@/lib/auth-client'

// Pattern 2: Auth session check
// Before:
const { data: { session } } = await supabase.auth.getSession()

// After:
const { data: session } = await authClient.getSession()

// Pattern 3: Database queries
// Before:
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// After:
const [profile] = await sql`
  SELECT * FROM profiles WHERE id = ${userId}
`

// Pattern 4: Admin client
// Before:
const supabase = createAdminClient()
const { data } = await supabase.from('table').select()

// After:
const data = await sql`SELECT * FROM table`
```

### Phase 6: Testing (Days 16-18)

#### 6.1 Test Checklist

**Authentication:**
- [ ] Sign up with email/password
- [ ] Login with email/password
- [ ] Logout
- [ ] Password reset
- [ ] Email verification
- [ ] Session persistence
- [ ] Session refresh
- [ ] OAuth providers (if used)

**Authorization:**
- [ ] Admin route protection
- [ ] Community owner permissions
- [ ] Member-only content access
- [ ] Teacher vs student permissions

**Database Operations:**
- [ ] Create community
- [ ] Join community
- [ ] Create/edit courses
- [ ] Book private lessons
- [ ] Thread/comment operations
- [ ] Notification system

**Payments:**
- [ ] Stripe Connect still works
- [ ] Subscription creation
- [ ] Webhook processing
- [ ] Payout system

**Video:**
- [ ] Daily.co room creation
- [ ] Video token generation
- [ ] Live class functionality

**Storage:**
- [ ] Image upload
- [ ] Video upload
- [ ] File retrieval
- [ ] File deletion

---

## Technical Details

### Environment Variables

**Remove:**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Add:**
```env
# Neon Database
DATABASE_URL=postgresql://user:pass@host/db

# Better-Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://your-domain.com

# Backblaze B2 Storage
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
B2_KEY_ID=your-key-id
B2_APP_KEY=your-application-key
B2_BUCKET_NAME=dancehub-storage
B2_CDN_URL=https://cdn.yourdomain.com  # Optional: Cloudflare CDN
```

### Database Schema Changes

Better-Auth requires specific tables:

```sql
-- Better-Auth tables (auto-created)
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER
);

-- Keep existing profiles table, link to Better-Auth user
ALTER TABLE profiles ADD COLUMN auth_user_id TEXT REFERENCES "user"(id);
```

### Authorization Without RLS

Replace Supabase RLS with API-level checks:

```typescript
// utils/authorization.ts
import { sql } from '@/lib/db';
import type { Session } from '@/lib/auth';

export async function canAccessCommunity(
  session: Session | null,
  communitySlug: string
): Promise<boolean> {
  if (!session) return false;

  const [membership] = await sql`
    SELECT id FROM members
    WHERE user_id = ${session.user.id}
    AND community_id = (
      SELECT id FROM communities WHERE slug = ${communitySlug}
    )
  `;

  return !!membership;
}

export async function isCommunityOwner(
  session: Session | null,
  communitySlug: string
): Promise<boolean> {
  if (!session) return false;

  const [community] = await sql`
    SELECT id FROM communities
    WHERE slug = ${communitySlug}
    AND owner_id = ${session.user.id}
  `;

  return !!community;
}

export async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.isAdmin ?? false;
}
```

---

## Rollback Plan

### If Migration Fails

1. **Keep Supabase running** during migration
2. **DNS failover** to old system if needed
3. **Database restore** from backup
4. **Revert code** to last working commit

### Rollback Steps

```bash
# 1. Revert to previous deployment
vercel rollback

# 2. Restore database (if needed)
psql $SUPABASE_DB_URL < data_backup.sql

# 3. Update environment variables back to Supabase
# 4. Verify all systems operational
```

### Post-Migration Monitoring

- Monitor error rates for 48 hours
- Watch authentication success rates
- Check database query performance
- Verify all webhook deliveries
- Test critical user flows

---

## Checklist Summary

### Pre-Migration
- [ ] Complete database backup
- [ ] Export all storage files
- [ ] Document all environment variables
- [ ] Notify users of maintenance window
- [ ] Switch from npm to Bun
- [ ] Set up Neon database
- [ ] Set up Backblaze B2 bucket
- [ ] (Optional) Configure Cloudflare CDN for B2

### Migration
- [ ] Run schema migrations on Neon
- [ ] Migrate user data
- [ ] Install Better-Auth
- [ ] Update all 147 files
- [ ] Migrate storage files to Backblaze B2
- [ ] Update file URLs in database
- [ ] Update environment variables

### Post-Migration
- [ ] Full test suite passes
- [ ] Manual testing complete
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Decommission Supabase (after 30 days)

---

## Resources

### Documentation
- [Better-Auth Documentation](https://www.better-auth.com/docs)
- [Better-Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Neon Documentation](https://neon.tech/docs)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Backblaze B2 Documentation](https://www.backblaze.com/docs/cloud-storage)
- [Backblaze B2 S3-Compatible API](https://www.backblaze.com/docs/cloud-storage-s3-compatible-api)
- [Cloudflare + Backblaze B2 Integration](https://www.backblaze.com/docs/cloud-storage-deliver-public-backblaze-b2-content-through-cloudflare-cdn)

### Examples
- [Better-Auth Next.js Example](https://www.better-auth.com/docs/examples/next-js)
- [Neon + Next.js Example](https://github.com/neondatabase/examples)
- [AWS SDK S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)

---

*Document will be updated as migration progresses.*
