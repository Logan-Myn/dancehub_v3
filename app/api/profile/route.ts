import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { sql } from '@/lib/db';

// GET: Fetch profile (current user or by userId query param)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // If userId is provided, fetch that specific profile
    if (requestedUserId) {
      const profiles = await sql`
        SELECT id, full_name, display_name, avatar_url, email
        FROM profiles
        WHERE id = ${requestedUserId}
      `;

      if (profiles.length === 0) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(profiles[0]);
    }

    // Otherwise, fetch current user's profile (requires auth)
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profiles = await sql`
      SELECT id, full_name, display_name, avatar_url, email
      FROM profiles
      WHERE id = ${session.user.id}
    `;

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profiles[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT: Update current user's profile
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fullName, displayName, avatarUrl } = await request.json();

    // Check display name uniqueness if provided
    if (displayName) {
      const existing = await sql`
        SELECT id FROM profiles
        WHERE display_name = ${displayName} AND id != ${session.user.id}
        LIMIT 1
      `;

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'This display name is already taken' },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updates.full_name = fullName;
    if (displayName !== undefined) updates.display_name = displayName || null;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    await sql`
      UPDATE profiles
      SET
        full_name = COALESCE(${fullName}, full_name),
        display_name = ${displayName || null},
        avatar_url = COALESCE(${avatarUrl}, avatar_url),
        updated_at = NOW()
      WHERE id = ${session.user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
