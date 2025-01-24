import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { userId } = params;

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

    // Delete user's profile first (this will cascade delete community_members)
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError);
      return NextResponse.json(
        { error: "Failed to delete user profile" },
        { status: 500 }
      );
    }

    // Delete the user from auth.users
    const { error: userDeleteError } = await supabase.auth.admin.deleteUser(
      userId
    );

    if (userDeleteError) {
      console.error("Error deleting user:", userDeleteError);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
} 