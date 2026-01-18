import { NextResponse } from 'next/server';
import { queryOne, sql } from '@/lib/db';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Thread {
  id: string;
  comments: any[] | null;
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { content, userId, author } = await request.json();
    const { threadId } = params;

    // Get user data (userId is Better Auth user ID)
    const userData = await queryOne<Profile>`
      SELECT *
      FROM profiles
      WHERE auth_user_id = ${userId}
    `;

    const comment = {
      id: crypto.randomUUID(),
      content,
      user_id: userId,
      author: {
        name: author?.name || userData?.full_name || 'Anonymous',
        image: author?.avatar_url || userData?.avatar_url || '',
      },
      created_at: new Date().toISOString(),
      likes: [],
      likes_count: 0,
    };

    // Get current thread comments
    const thread = await queryOne<Thread>`
      SELECT id, comments
      FROM threads
      WHERE id = ${threadId}
    `;

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const comments = thread.comments || [];
    const updatedComments = [...comments, comment];

    // Update thread with new comment
    await sql`
      UPDATE threads
      SET
        comments = ${JSON.stringify(updatedComments)}::jsonb,
        comments_count = ${updatedComments.length}
      WHERE id = ${threadId}
    `;

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
