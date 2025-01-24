import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { threadId } = params;

    // Delete the thread (comments will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from("threads")
      .delete()
      .eq("id", threadId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    );
  }
} 