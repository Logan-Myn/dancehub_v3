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

    // Create the community using Supabase
    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name,
        slug,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as a member with admin role
    const { error: memberError } = await supabase
      .from('members')
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