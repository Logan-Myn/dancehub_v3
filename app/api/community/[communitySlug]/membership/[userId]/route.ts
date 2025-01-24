import { NextResponse } from 'next/server';
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; userId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { communitySlug, userId } = params;

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    // Admins have access to all communities
    if (profile?.is_admin) {
      return NextResponse.json({ isMember: true });
    }

    // Get community and check if user is creator
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, created_by")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is creator
    if (community.created_by === userId) {
      return NextResponse.json({ isMember: true });
    }

    // Check membership
    const { data: membership, error: membershipError } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      console.error('Error checking membership:', membershipError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ isMember: !!membership });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 