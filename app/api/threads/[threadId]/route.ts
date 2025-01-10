import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { title, content } = await request.json();
    const { threadId } = params;

    const supabase = createServerClient();

    const { error } = await supabase
      .from("threads")
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating thread:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;
    const supabase = createServerClient();

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
