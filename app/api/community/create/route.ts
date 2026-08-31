import { NextResponse } from 'next/server';
import { sql, query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth-session';

interface ExistingCommunity {
  name: string;
  slug: string;
}

interface NewCommunity {
  id: string;
  slug: string;
}

export async function POST(request: Request) {
  try {
    // Never trust `createdBy` from the body — anyone could create a community
    // in someone else's name.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'You must be signed in to create a community' }, { status: 401 });
    }
    const createdBy = session.user.id;

    const body = await request.json();
    const { description, imageUrl, focalX, focalY, zoom } = body;
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        { error: 'Please enter a community name' },
        { status: 400 }
      );
    }

    const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, Math.round(n)));
    };
    const clampFloat = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    const safeFocalX = clampInt(focalX, 0, 100, 50);
    const safeFocalY = clampInt(focalY, 0, 100, 50);
    const safeZoom = Number(clampFloat(zoom, 1, 5, 1).toFixed(2));

    // Create a slug from the community name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // A name made only of characters the slug rule strips (accents, emoji, a
    // non-Latin script) would produce an empty slug, and an empty slug makes the
    // community live at the site root — every link to it lands on the home page.
    if (!slug) {
      return NextResponse.json(
        { error: 'Please use at least one letter or number in the community name' },
        { status: 400 }
      );
    }

    // Check if name or slug already exists
    const existingCommunities = await query<ExistingCommunity>`
      SELECT name, slug
      FROM communities
      WHERE LOWER(name) = LOWER(${name})
         OR slug = ${slug}
      LIMIT 1
    `;

    if (existingCommunities && existingCommunities.length > 0) {
      const community = existingCommunities[0];
      if (community.name.toLowerCase() === name.toLowerCase()) {
        return NextResponse.json(
          { error: 'A community with this name already exists' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'This name would create a URL that is already taken' },
          { status: 400 }
        );
      }
    }

    // Create the community
    const community = await queryOne<NewCommunity>`
      INSERT INTO communities (
        name,
        slug,
        description,
        image_url,
        image_focal_x,
        image_focal_y,
        image_zoom,
        created_by
      ) VALUES (
        ${name},
        ${slug},
        ${description},
        ${imageUrl},
        ${safeFocalX},
        ${safeFocalY},
        ${safeZoom},
        ${createdBy}
      )
      RETURNING id, slug
    `;

    if (!community) {
      console.error('Community creation error');
      return NextResponse.json(
        { error: 'Failed to create community' },
        { status: 400 }
      );
    }

    // Add creator as a member with admin role
    try {
      await sql`
        INSERT INTO community_members (
          user_id,
          community_id,
          role,
          status,
          joined_at
        ) VALUES (
          ${createdBy},
          ${community.id},
          'admin',
          'active',
          NOW()
        )
      `;
    } catch (memberError) {
      // If member creation fails, delete the community
      await sql`
        DELETE FROM communities
        WHERE id = ${community.id}
      `;

      console.error('Member creation error:', memberError);
      return NextResponse.json(
        { error: 'Failed to assign admin role. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Community created successfully',
      slug: community.slug
    });

  } catch (error) {
    console.error('Error creating community:', error);
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    );
  }
}
