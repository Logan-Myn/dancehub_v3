import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get threads with all related data in a single query
    const { data: threads, error } = await supabase
      .from("threads")
      .select(`
        *,
        profiles!threads_user_id_fkey (
          id,
          full_name,
          avatar_url,
          display_name
        ),
        communities!threads_community_id_fkey (
          id,
          name,
          slug
        ),
        thread_likes (
          id,
          user_id
        ),
        thread_comments (
          id,
          user_id
        )
      `)
      .eq("communities.slug", communitySlug)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch threads" },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const formattedThreads = threads.map((thread: any) => {
      const profile = thread.profiles;
      return {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        createdAt: thread.created_at,
        userId: thread.user_id,
        author: {
          name: profile?.display_name || profile?.full_name || "Anonymous",
          image: profile?.avatar_url || "",
        },
        category: thread.category || "General",
        categoryId: thread.category_id,
        likesCount: thread.thread_likes?.length || 0,
        commentsCount: thread.thread_comments?.length || 0,
        likes: thread.thread_likes || [],
        comments: thread.thread_comments || [],
        pinned: thread.pinned || false,
      };
    });

    return NextResponse.json(formattedThreads);
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
