import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  
  try {
    const body = await request.json();
    const { name, description, imageUrl, createdBy } = body;

    // Create a slug from the community name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Check if name or slug already exists
    const { data: existingCommunities, error: checkError } = await supabase
      .from('communities')
      .select('name, slug')
      .or(`name.ilike.${name},slug.eq.${slug}`)
      .limit(1);

    if (checkError) {
      console.error('Error checking community existence:', checkError);
      return NextResponse.json(
        { error: 'Failed to validate community name' },
        { status: 500 }
      );
    }

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

    // Start a transaction
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name,
        slug,
        description,
        image_url: imageUrl,
        created_by: createdBy,
      })
      .select()
      .single();

    if (communityError) {
      console.error('Community creation error:', communityError);
      return NextResponse.json(
        { error: communityError.message },
        { status: 400 }
      );
    }

    // Add creator as a member with admin role
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        user_id: createdBy,
        community_id: community.id,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      // If member creation fails, delete the community
      const { error: deleteError } = await supabase
        .from('communities')
        .delete()
        .eq('id', community.id);

      if (deleteError) {
        console.error('Failed to rollback community creation:', deleteError);
      }

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