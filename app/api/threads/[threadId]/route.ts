import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { title, content } = await request.json();
    const { threadId } = params;

    await sql`
      UPDATE threads
      SET
        title = ${title},
        content = ${content},
        updated_at = NOW()
      WHERE id = ${threadId}
    `;

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

    await sql`
      DELETE FROM threads
      WHERE id = ${threadId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    );
  }
}
