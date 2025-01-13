import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { price, enabled } = await request.json();
    const supabase = createAdminClient();

    // First get the community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Update the community with new price settings
    const { error: updateError } = await supabase
      .from('communities')
      .update({
        membership_enabled: enabled,
        membership_price: price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', community.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating community price:', error);
    return NextResponse.json(
      { error: 'Failed to update community price' },
      { status: 500 }
    );
  }
} 