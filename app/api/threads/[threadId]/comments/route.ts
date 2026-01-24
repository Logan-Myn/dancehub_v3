import { NextResponse } from 'next/server';
import { query, queryOne, sql } from '@/lib/db';

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Thread {
  id: string;
}

interface CommentRow {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author: {
    name: string;
    image: string;
  } | null;
  likes: string[];
  likes_count: number;
}

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;

    // Get all comments for this thread
    const comments = await query<CommentRow>`
      SELECT
        c.id,
        c.thread_id,
        c.user_id,
        c.content,
        c.created_at,
        c.parent_id,
        c.author,
        c.likes,
        c.likes_count
      FROM comments c
      WHERE c.thread_id = ${threadId}
      ORDER BY c.created_at ASC
    `;

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { content, userId, author } = await request.json();
    const { threadId } = params;

    // Verify thread exists
    const thread = await queryOne<Thread>`
      SELECT id
      FROM threads
      WHERE id = ${threadId}
    `;

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get user profile data
    const userData = await queryOne<Profile>`
      SELECT id, full_name, display_name, avatar_url
      FROM profiles
      WHERE auth_user_id = ${userId}
    `;

    const authorData = {
      name: author?.name || userData?.display_name || userData?.full_name || 'Anonymous',
      image: author?.avatar_url || userData?.avatar_url || '',
    };

    const commentId = crypto.randomUUID();

    // Insert into comments table
    await sql`
      INSERT INTO comments (id, thread_id, user_id, content, author, likes, likes_count)
      VALUES (
        ${commentId},
        ${threadId},
        ${userId},
        ${content},
        ${JSON.stringify(authorData)}::jsonb,
        ARRAY[]::TEXT[],
        0
      )
    `;

    // Return the created comment
    const comment = {
      id: commentId,
      thread_id: threadId,
      user_id: userId,
      content,
      author: authorData,
      created_at: new Date().toISOString(),
      likes: [],
      likes_count: 0,
    };

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
