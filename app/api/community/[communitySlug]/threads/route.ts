import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

// Force dynamic - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CommunityId {
  id: string;
}

interface ThreadRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  category_name: string | null;
  category_id: string | null;
  pinned: boolean;
  profile_id: string | null;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
  profile_display_name: string | null;
  likes: string[] | null;
  likes_count: number;
  comments_count: number;
}

interface CommentRow {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author: { name: string; image: string } | null;
  likes: string[] | null;
  likes_count: number;
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
        t.category_name,
        t.category_id,
        t.pinned,
        p.id as profile_id,
        p.full_name as profile_full_name,
        p.avatar_url as profile_avatar_url,
        p.display_name as profile_display_name,
        COALESCE(t.likes, ARRAY[]::TEXT[]) as likes,
        COALESCE(array_length(t.likes, 1), 0)::int as likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.id)::int as comments_count
      FROM threads t
      LEFT JOIN profiles p ON p.auth_user_id = t.user_id
      WHERE t.community_id = ${community.id}
      ORDER BY t.created_at DESC
    `;

    // Get all thread IDs
    const threadIds = threads.map(t => t.id);

    // Fetch all comments for these threads in one query
    let allComments: CommentRow[] = [];
    if (threadIds.length > 0) {
      allComments = await query<CommentRow>`
        SELECT
          c.id,
          c.thread_id,
          c.user_id,
          c.content,
          c.created_at,
          c.parent_id,
          c.author,
          COALESCE(c.likes, ARRAY[]::TEXT[]) as likes,
          COALESCE(c.likes_count, 0) as likes_count
        FROM comments c
        WHERE c.thread_id = ANY(${threadIds}::uuid[])
        ORDER BY c.created_at ASC
      `;
    }

    // Group comments by thread_id
    const commentsByThread = new Map<string, CommentRow[]>();
    for (const comment of allComments) {
      const existing = commentsByThread.get(comment.thread_id) || [];
      existing.push(comment);
      commentsByThread.set(comment.thread_id, existing);
    }

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
      category: thread.category_name || "General",
      categoryId: thread.category_id,
      likesCount: thread.likes_count || 0,
      commentsCount: thread.comments_count || 0,
      likes: thread.likes || [],
      comments: (commentsByThread.get(thread.id) || []).map(c => ({
        id: c.id,
        thread_id: c.thread_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        parent_id: c.parent_id,
        author: c.author || { name: 'Anonymous', image: '' },
        likes: c.likes || [],
        likes_count: c.likes_count || 0,
      })),
      pinned: thread.pinned || false,
    }));

    const response = NextResponse.json(formattedThreads);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
