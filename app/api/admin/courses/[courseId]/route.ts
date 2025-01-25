import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Video } from '@/lib/mux';
import { createAdminClient } from '@/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const adminClient = createAdminClient();

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

    // Get all chapters for this course
    const { data: chapters } = await adminClient
      .from('chapters')
      .select('id')
      .eq('course_id', params.courseId);

    if (chapters && chapters.length > 0) {
      // Get all lessons for these chapters
      const { data: lessons } = await adminClient
        .from('lessons')
        .select('id, mux_playback_id')
        .in('chapter_id', chapters.map(chapter => chapter.id));

      // Delete Mux videos
      if (lessons) {
        await Promise.all(
          lessons
            .filter(lesson => lesson.mux_playback_id)
            .map(async (lesson) => {
              try {
                await Video.assets.delete(lesson.mux_playback_id);
              } catch (error) {
                console.error('Error deleting Mux video:', error);
              }
            })
        );
      }

      // Delete lessons
      if (lessons && lessons.length > 0) {
        const { error: lessonsError } = await adminClient
          .from('lessons')
          .delete()
          .in('id', lessons.map(lesson => lesson.id));

        if (lessonsError) {
          console.error('Error deleting lessons:', lessonsError);
        }
      }

      // Delete chapters
      const { error: chaptersError } = await adminClient
        .from('chapters')
        .delete()
        .in('id', chapters.map(chapter => chapter.id));

      if (chaptersError) {
        console.error('Error deleting chapters:', chaptersError);
      }
    }

    // Finally delete the course
    const { error: courseError } = await adminClient
      .from('courses')
      .delete()
      .eq('id', params.courseId);

    if (courseError) {
      console.error('Error deleting course:', courseError);
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
    const adminClient = createAdminClient();

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

    // Update course using admin client
    const { data: updatedCourse, error: updateError } = await adminClient
      .from('courses')
      .update({
        title,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course:', updateError);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    if (!updatedCourse) {
      return new NextResponse('Course not found', { status: 404 });
    }

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Error in PATCH /api/admin/courses/[courseId]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 