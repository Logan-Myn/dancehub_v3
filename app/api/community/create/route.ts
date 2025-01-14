import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  
  try {
    const body = await request.json();
    const { name, createdBy } = body;

    // Create a slug from the community name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Start a transaction
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name,
        slug,
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
      communityId: community.id,
      slug,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 