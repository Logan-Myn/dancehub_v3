import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = createAdminClient();
    const { threadId } = params;

    // Get the current session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the thread and community info
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('*, communities!inner(created_by)')
      .eq('id', threadId)
      .single();

    if (threadError) {
      console.error('Error fetching thread:', threadError);
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Verify the user is the community creator
    if (user.id !== thread.communities.created_by) {
      return NextResponse.json(
        { error: 'Only community creators can pin threads' },
        { status: 403 }
      );
    }

    // Toggle the pinned status
    const { data: updatedThread, error: updateError } = await supabase
      .from('threads')
      .update({ pinned: !thread.pinned })
      .eq('id', threadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating thread:', updateError);
      return NextResponse.json(
        { error: 'Failed to update thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pinned: updatedThread.pinned,
    });
  } catch (error) {
    console.error('Error pinning thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 