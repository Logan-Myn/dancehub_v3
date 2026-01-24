import { NextResponse } from 'next/server';
import { sql, queryOne } from '@/lib/db';

interface CommentRow {
  id: string;
  likes: string[] | null;
  likes_count: number;
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string; commentId: string } }
) {
  try {
    const { userId } = await request.json();
    const { commentId } = params;

    // Get the comment from the comments table
    const comment = await queryOne<CommentRow>`
      SELECT id, likes, likes_count
      FROM comments
      WHERE id = ${commentId}
    `;

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const likes = comment.likes || [];
    const userLikeIndex = likes.indexOf(userId);
    let liked: boolean;
    let newLikes: string[];

    if (userLikeIndex === -1) {
      // Add like
      newLikes = [...likes, userId];
      liked = true;
    } else {
      // Remove like
      newLikes = likes.filter(id => id !== userId);
      liked = false;
    }

    // Update the comment likes in the comments table
    await sql`
      UPDATE comments
      SET
        likes = ${newLikes}::TEXT[],
        likes_count = ${newLikes.length}
      WHERE id = ${commentId}
    `;

    return NextResponse.json({
      likes_count: newLikes.length,
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
