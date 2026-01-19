import { NextResponse } from 'next/server';
import { sql, queryOne } from '@/lib/db';

interface ThreadLikes {
  likes: string[] | null;
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await request.json();
    const { threadId } = params;

    // Get current thread likes
    const thread = await queryOne<ThreadLikes>`
      SELECT likes
      FROM threads
      WHERE id = ${threadId}
    `;

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
    await sql`
      UPDATE threads
      SET likes = ${updatedLikes}::text[]
      WHERE id = ${threadId}
    `;

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
