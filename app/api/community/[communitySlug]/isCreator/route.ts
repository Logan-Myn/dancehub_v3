import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const token = request.headers.get("Authorization")?.split(" ")[1] || "";

  try {
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ isCreator: false });
    }

    // Check if user is the community creator
    const { data: community, error: communityError } = await supabaseAdmin
      .from("communities")
      .select("created_by")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ isCreator: false });
    }

    const isCreator = community.created_by === user.id;

    return NextResponse.json({ isCreator });
  } catch (error) {
    console.error("Error checking if user is creator:", error);
    return NextResponse.json({ isCreator: false });
  }
}
