import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: { communityId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { communityId } = params;

    // First, verify that the requester is an admin
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const {
      data: { user: requester },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify requester is an admin
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", requester.id)
      .single();

    if (!requesterProfile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use a raw SQL query to delete everything in the correct order
    const { error: deleteError } = await supabase.rpc('delete_community', {
      p_community_id: communityId
    });

    if (deleteError) {
      console.error("Error deleting community:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete community" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting community:", error);
    return NextResponse.json(
      { error: "Failed to delete community" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { communityId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { communityId } = params;

    // First, verify that the requester is an admin
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const {
      data: { user: requester },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify requester is an admin
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", requester.id)
      .single();

    if (!requesterProfile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the update data from the request body
    const updates = await request.json();

    // Validate the updates
    if (!updates.name || !updates.slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if the slug is already taken by another community
    const { data: existingCommunity } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", updates.slug)
      .neq("id", communityId)
      .single();

    if (existingCommunity) {
      return NextResponse.json(
        { error: "A community with this slug already exists" },
        { status: 400 }
      );
    }

    // Update the community
    const { error: updateError } = await supabase
      .from("communities")
      .update({
        name: updates.name,
        description: updates.description,
        slug: updates.slug,
      })
      .eq("id", communityId);

    if (updateError) {
      console.error("Error updating community:", updateError);
      return NextResponse.json(
        { error: "Failed to update community" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating community:", error);
    return NextResponse.json(
      { error: "Failed to update community" },
      { status: 500 }
    );
  }
} 