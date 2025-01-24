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

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { userId } = params;
    const updates = await request.json();

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

    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        full_name: updates.full_name,
        display_name: updates.display_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error("Error updating profile:", profileUpdateError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    // Update user email if changed
    if (updates.email) {
      // Get current user email
      const { data: currentUser } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      // Only update if email has changed
      if (currentUser && currentUser.email !== updates.email) {
        const { error: emailUpdateError } = await supabase.rpc(
          'update_user_email',
          { 
            user_id: userId,
            new_email: updates.email
          }
        );

        if (emailUpdateError) {
          console.error("Error updating email:", emailUpdateError);
          return NextResponse.json(
            { error: "Failed to update email" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
} 