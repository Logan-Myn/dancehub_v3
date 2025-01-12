import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    console.log('Request body:', body);
    const { userId } = body;
    console.log('Extracted userId:', userId);

    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    console.log('Community data:', community);
    console.log('Community error:', communityError);

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      );
    }

    // Add member to community_members table
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        role: "member",
        status: "active"
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    // Update members_count in communities table
    const { error: updateError } = await supabase.rpc(
      'increment_members_count',
      { community_id: community.id }
    );

    if (updateError) {
      console.error("Error updating members count:", updateError);
      // Rollback the member addition
      await supabase
        .from("community_members")
        .delete()
        .eq("community_id", community.id)
        .eq("user_id", userId);

      return NextResponse.json(
        { error: "Failed to update members count" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining community:", error);
    return NextResponse.json(
      { error: "Failed to join community" },
      { status: 500 }
    );
  }
}
