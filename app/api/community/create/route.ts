import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, createdBy } = body;

    // Create a slug from the community name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Create the community using Supabase
    const { data: community, error } = await supabaseAdmin
      .from('communities')
      .insert({
        name,
        slug,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as a member
    const { error: memberError } = await supabaseAdmin
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: createdBy,
        role: 'admin',
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    return NextResponse.json({
      communityId: community.id,
      slug,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    );
  }
} 