import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const supabase = createAdminClient();
    const { categories } = await request.json();
    const { communitySlug } = params;

    // Update community categories
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .update({
        thread_categories: categories,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', communitySlug)
      .select()
      .single();

    if (communityError) {
      console.error('Error updating community:', communityError);
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error updating categories:', error);
    return NextResponse.json(
      { error: 'Failed to update categories' },
      { status: 500 }
    );
  }
} 