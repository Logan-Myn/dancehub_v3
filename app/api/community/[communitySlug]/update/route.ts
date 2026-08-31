import { NextResponse } from 'next/server';
import { queryOne, sql } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { userCanManageCommunity } from '@/lib/community-auth';

interface Community {
  id: string;
}

interface UpdatedCommunity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  custom_links: any[] | null;
  slug: string;
}

export async function PUT(request: Request, props: { params: Promise<{ communitySlug: string }> }) {
  const params = await props.params;
  try {
    const { communitySlug } = params;
    const updates = await request.json();

    // Get the community by slug
    const community = await queryOne<Community>`
      SELECT id
      FROM communities
      WHERE slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await userCanManageCommunity(session.user.id, community.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // This route PUTs every column unconditionally, so a blank name (or one that
    // slugifies to nothing) would wipe the community's name and move it to the
    // site root, where every link to it lands on the home page instead.
    const name = typeof updates.name === 'string' ? updates.name.trim() : '';
    const slug = typeof updates.slug === 'string' ? updates.slug.trim() : '';
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      );
    }

    // If slug is being updated, check if it's already taken
    if (slug !== communitySlug) {
      const existingCommunity = await queryOne<Community>`
        SELECT id
        FROM communities
        WHERE slug = ${slug}
          AND id != ${community.id}
      `;

      if (existingCommunity) {
        return NextResponse.json(
          { error: 'A community with this URL already exists' },
          { status: 400 }
        );
      }
    }

    // Update the community
    const updatedCommunity = await queryOne<UpdatedCommunity>`
      UPDATE communities
      SET
        name = ${name},
        description = ${updates.description},
        image_url = ${updates.imageUrl},
        custom_links = ${sql.json(Array.isArray(updates.customLinks) ? updates.customLinks : [])},
        slug = ${slug},
        status = ${updates.status},
        opening_date = ${updates.opening_date},
        updated_at = NOW()
      WHERE id = ${community.id}
      RETURNING *
    `;

    if (!updatedCommunity) {
      console.error('Error updating community: No rows returned');
      return NextResponse.json(
        { error: 'Failed to update community' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: updatedCommunity.name,
        description: updatedCommunity.description,
        imageUrl: updatedCommunity.image_url,
        customLinks: updatedCommunity.custom_links || [],
        slug: updatedCommunity.slug,
      }
    });
  } catch (error) {
    console.error('Error updating community:', error);
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    );
  }
}
