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
  { params }: { params: { threadId: string; commentId: string } }
) {
  try {
    const { content, userId } = await request.json();
    const { threadId, commentId } = params;

    // Get user data (userId is Better Auth user ID)
    const userData = await queryOne<Profile>`
      SELECT *
      FROM profiles
      WHERE auth_user_id = ${userId}
    `;

    const reply = {
      id: crypto.randomUUID(),
      content,
      user_id: userId,
      author: {
        name: userData?.full_name || 'Anonymous',
        image: userData?.avatar_url || '',
      },
      created_at: new Date().toISOString(),
      parent_id: commentId,
      likes: [],
      likes_count: 0,
    };

    // Get current thread comments
    const thread = await queryOne<Thread>`
      SELECT comments
      FROM threads
      WHERE id = ${threadId}
    `;

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const comments = thread.comments || [];
    const updatedComments = [...comments, reply];

    // Update thread with new reply
    await sql`
      UPDATE threads
      SET
        comments = ${JSON.stringify(updatedComments)}::jsonb,
        comments_count = ${updatedComments.length}
      WHERE id = ${threadId}
    `;

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
