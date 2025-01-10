import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

type CommunityUpdate = {
  name: string;
  description: string;
  image_url: string;
  custom_links: any[];
};

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const supabase = createAdminClient();
    const { communitySlug } = params;
    const updates = await request.json();

    // Get the community by slug
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Update the community
    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update({
        name: updates.name,
        description: updates.description,
        image_url: updates.imageUrl,
        custom_links: updates.customLinks || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', community.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating community:', updateError);
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