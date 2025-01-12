import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { title, content, communityId, userId, author } = await request.json();

    // Create the thread with author info included
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        title,
        content,
        community_id: communityId,
        user_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author_name: author.name,
        author_image: author.avatar_url,
      })
      .select()
      .single();

    if (threadError) throw threadError;

    // Format the response to match the expected structure
    const formattedThread = {
      ...thread,
      createdAt: thread.created_at,
      userId: thread.user_id,
      author: {
        name: thread.author_name,
        image: thread.author_image,
      },
      likesCount: 0,
      commentsCount: 0,
      likes: [],
      comments: [],
    };

    return NextResponse.json(formattedThread);
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
} 