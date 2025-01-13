import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

type Thread = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  community_id: string;
  profiles: {
    display_name: string | null;
    image_url: string | null;
  };
  thread_likes: { id: string }[];
  thread_comments: { id: string }[];
};

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get threads with community, author, likes, and comments
    const { data: threads, error } = await supabase
      .from("threads")
      .select(`
        *,
        communities!inner(slug),
        profiles!inner(
          display_name,
          image_url
        ),
        thread_likes(id),
        thread_comments(id)
      `)
      .eq("communities.slug", communitySlug)
      .order("created_at", { ascending: false })
      .returns<Thread[]>();

    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch threads" },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      createdAt: thread.created_at,
      author: {
        name: thread.profiles.display_name || "Anonymous",
        image: thread.profiles.image_url || "",
      },
      likesCount: thread.thread_likes?.length || 0,
      commentsCount: thread.thread_comments?.length || 0,
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
