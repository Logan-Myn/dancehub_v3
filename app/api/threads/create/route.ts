import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { 
      content, 
      communityId, 
      userId, 
      title,
      categoryId,
      categoryName 
    } = await request.json();

    const supabase = createServerClient();

    // Get user data
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Create thread
    const { data: thread, error } = await supabase
      .from('threads')
      .insert({
        title,
        content,
        community_id: communityId,
        user_id: userId,
        category_id: categoryId,
        category: categoryName,
        created_at: new Date().toISOString(),
      })
      .select('*, author:profiles(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...thread,
      likesCount: 0,
      commentsCount: 0,
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
} 