import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await request.json();
    const { threadId } = params;
    const supabase = createServerClient();

    // Get current thread likes
    const { data: thread } = await supabase
      .from('threads')
      .select('likes')
      .eq('id', threadId)
      .single();

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    const likes = thread.likes || [];
    const isLiked = likes.includes(userId);
    const updatedLikes = isLiked
      ? likes.filter((id: string) => id !== userId)
      : [...likes, userId];

    // Update thread likes
    const { error } = await supabase
      .from('threads')
      .update({
        likes: updatedLikes,
      })
      .eq('id', threadId);

    if (error) throw error;

    return NextResponse.json({
      liked: !isLiked,
      likesCount: updatedLikes.length,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
} 