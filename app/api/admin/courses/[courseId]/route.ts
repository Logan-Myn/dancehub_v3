import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Delete course and related content
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', params.courseId);

    if (error) {
      console.error('Error deleting course:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/admin/courses/[courseId]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return new NextResponse('Title is required', { status: 400 });
    }

    // Update course
    const { error } = await supabase
      .from('courses')
      .update({
        title,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.courseId);

    if (error) {
      console.error('Error updating course:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in PATCH /api/admin/courses/[courseId]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 