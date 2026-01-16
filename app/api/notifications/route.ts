import { NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

// GET: Fetch notifications for the current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const notifications = await query<Notification>`
      SELECT id, user_id, title, message, link, type, read, created_at
      FROM notifications
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read for the current user
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${session.user.id} AND read = false
      `;
    } else if (notificationId) {
      // Mark a specific notification as read
      await sql`
        UPDATE notifications
        SET read = true
        WHERE id = ${notificationId} AND user_id = ${session.user.id}
      `;
    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllRead is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
