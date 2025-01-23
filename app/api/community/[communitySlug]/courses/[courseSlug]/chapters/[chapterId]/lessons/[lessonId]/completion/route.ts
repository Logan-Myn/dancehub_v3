import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { lessonId: string } }
) {
  try {
    // Get the authorization header
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the lesson is already completed
    const { data: existingCompletion, error: completionError } = await supabase
      .from('lesson_completions')
      .select()
      .eq('user_id', user.id)
      .eq('lesson_id', params.lessonId)
      .maybeSingle();

    if (completionError) {
      return NextResponse.json(
        { error: 'Failed to check completion status' },
        { status: 500 }
      );
    }

    if (existingCompletion) {
      // If already completed, remove the completion
      const { error: deleteError } = await supabase
        .from('lesson_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_id', params.lessonId);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to remove completion' },
          { status: 500 }
        );
      }

      return NextResponse.json({ completed: false });
    } else {
      // If not completed, add completion
      const { error: insertError } = await supabase
        .from('lesson_completions')
        .insert({
          user_id: user.id,
          lesson_id: params.lessonId,
        });

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to mark as completed' },
          { status: 500 }
        );
      }

      return NextResponse.json({ completed: true });
    }
  } catch (error) {
    console.error('Error toggling lesson completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { lessonId: string } }
) {
  try {
    // Get the authorization header
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check completion status
    const { data: completion, error: completionError } = await supabase
      .from('lesson_completions')
      .select()
      .eq('user_id', user.id)
      .eq('lesson_id', params.lessonId)
      .maybeSingle();

    if (completionError) {
      return NextResponse.json(
        { error: 'Failed to check completion status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ completed: !!completion });
  } catch (error) {
    console.error('Error checking lesson completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 