import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

interface CommunityId {
  id: string;
}

interface ThreadRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  category: string | null;
  category_id: string | null;
  pinned: boolean;
  profile_id: string | null;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
  profile_display_name: string | null;
  likes_count: number;
  comments_count: number;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // First get the community ID
    const community = await queryOne<CommunityId>`
      SELECT id
      FROM communities
      WHERE slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get threads with all related data
    const threads = await query<ThreadRow>`
      SELECT
        t.id,
        t.title,
        t.content,
        t.created_at,
        t.user_id,
        t.category,
        t.category_id,
        t.pinned,
        p.id as profile_id,
        p.full_name as profile_full_name,
        p.avatar_url as profile_avatar_url,
        p.display_name as profile_display_name,
        (SELECT COUNT(*) FROM thread_likes tl WHERE tl.thread_id = t.id)::int as likes_count,
        (SELECT COUNT(*) FROM thread_comments tc WHERE tc.thread_id = t.id)::int as comments_count
      FROM threads t
      LEFT JOIN profiles p ON p.auth_user_id = t.user_id
      WHERE t.community_id = ${community.id}
      ORDER BY t.created_at DESC
    `;

    // Transform the data to match the expected format
    const formattedThreads = threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      createdAt: thread.created_at,
      userId: thread.user_id,
      author: {
        name: thread.profile_display_name || thread.profile_full_name || "Anonymous",
        image: thread.profile_avatar_url || "",
      },
      category: thread.category || "General",
      categoryId: thread.category_id,
      likesCount: thread.likes_count || 0,
      commentsCount: thread.comments_count || 0,
      likes: [],
      comments: [],
      pinned: thread.pinned || false,
    }));

    return NextResponse.json(formattedThreads);
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
