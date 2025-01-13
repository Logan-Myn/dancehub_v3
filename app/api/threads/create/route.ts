import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { title, content, communityId, userId, categoryId, categoryName, author } = await request.json();

    // Get the community and check if user is creator
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('created_by, thread_categories')
      .eq('id', communityId)
      .single();

    if (communityError) throw communityError;

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

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
        author_image: profile?.avatar_url || author.avatar_url,
        category_id: categoryId,
        category_name: categoryName,
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