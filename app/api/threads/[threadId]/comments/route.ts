import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { content, userId } = await request.json();
    const { threadId } = params;
    const supabase = createServerClient();

    // Get user data
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const comment = {
      id: crypto.randomUUID(),
      content,
      user_id: userId,
      author: {
        name: userData?.full_name || 'Anonymous',
        image: userData?.avatar_url || '',
      },
      created_at: new Date().toISOString(),
      likes: [],
      likes_count: 0,
    };

    // Get current thread comments
    const { data: thread } = await supabase
      .from('threads')
      .select('comments')
      .eq('id', threadId)
      .single();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const comments = thread.comments || [];
    const updatedComments = [...comments, comment];

    // Update thread with new comment
    const { error } = await supabase
      .from('threads')
      .update({
        comments: updatedComments,
        comments_count: updatedComments.length,
      })
      .eq('id', threadId);

    if (error) throw error;

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
} 