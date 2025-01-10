import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface Comment {
  id: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  created_at: string;
  replies?: Comment[];
  parent_id?: string;
  likes?: string[];
  likes_count?: number;
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string; commentId: string } }
) {
  try {
    const { userId } = await request.json();
    const { threadId, commentId } = params;
    const supabase = createServerClient();

    // Get the thread document
    const { data: thread } = await supabase
      .from('threads')
      .select('comments')
      .eq('id', threadId)
      .single();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const comments = thread.comments || [];

    // Find the comment and update its likes
    const updatedComments = comments.map((comment: Comment) => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        const userLikeIndex = likes.indexOf(userId);
        
        if (userLikeIndex === -1) {
          // Add like
          likes.push(userId);
        } else {
          // Remove like
          likes.splice(userLikeIndex, 1);
        }
        
        return {
          ...comment,
          likes,
          likes_count: likes.length
        };
      }
      return comment;
    });

    // Update the thread with modified comments
    const { error } = await supabase
      .from('threads')
      .update({ comments: updatedComments })
      .eq('id', threadId);

    if (error) throw error;

    // Find the updated comment to return its new state
    const updatedComment = updatedComments.find((c: Comment) => c.id === commentId);
    const liked = updatedComment?.likes?.includes(userId) || false;

    return NextResponse.json({
      likes_count: updatedComment?.likes?.length || 0,
      liked
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json(
      { error: 'Failed to like comment' },
      { status: 500 }
    );
  }
} 