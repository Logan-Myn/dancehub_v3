import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface Community {
  created_by: string;
  thread_categories: any[] | null;
}

interface Profile {
  avatar_url: string | null;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  community_id: string;
  user_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_image: string | null;
  category_id: string | null;
  category_name: string | null;
  pinned: boolean;
}

export async function POST(request: Request) {
  try {
    const { title, content, communityId, userId, categoryId, categoryName, author, pinned } = await request.json();

    // Get the community and check if user is creator
    const community = await queryOne<Community>`
      SELECT created_by, thread_categories
      FROM communities
      WHERE id = ${communityId}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if the selected category exists and if user has permission
    const category = community.thread_categories?.find((cat: any) => cat.id === categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is creator-only and user is not the creator
    if (category.creatorOnly && userId !== community.created_by) {
      return NextResponse.json(
        { error: 'Only the community creator can post in this category' },
        { status: 403 }
      );
    }

    // Get user's profile to ensure we have the correct avatar URL
    const profile = await queryOne<Profile>`
      SELECT avatar_url
      FROM profiles
      WHERE id = ${userId}
    `;

    // Create the thread with author info included
    const thread = await queryOne<Thread>`
      INSERT INTO threads (
        title,
        content,
        community_id,
        user_id,
        created_by,
        created_at,
        updated_at,
        author_name,
        author_image,
        category_id,
        category_name,
        pinned
      ) VALUES (
        ${title},
        ${content},
        ${communityId},
        ${userId},
        ${userId},
        NOW(),
        NOW(),
        ${author.name},
        ${profile?.avatar_url || author.avatar_url || null},
        ${categoryId},
        ${categoryName},
        ${pinned && userId === community.created_by ? pinned : false}
      )
      RETURNING *
    `;

    if (!thread) {
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

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
