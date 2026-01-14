import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const slug = searchParams.get('slug');

    if (!name && !slug) {
      return NextResponse.json(
        { error: 'Name or slug is required' },
        { status: 400 }
      );
    }

    // Check for existing communities with matching name or slug
    const communities = await sql`
      SELECT name, slug FROM communities
      WHERE name ILIKE ${name || ''} OR slug = ${slug || ''}
      LIMIT 1
    `;

    if (communities.length > 0) {
      const community = communities[0];
      const matchedName = community.name.toLowerCase() === (name || '').toLowerCase();

      return NextResponse.json({
        available: false,
        reason: matchedName
          ? 'A community with this name already exists'
          : 'This name would create a URL that is already taken'
      });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
