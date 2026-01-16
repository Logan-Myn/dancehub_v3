import { NextResponse } from "next/server";
import { query, queryOne, sql } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

interface Community {
  id: string;
  created_by: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  lesson_position: number;
  chapter_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  video_asset_id: string | null;
  playback_id: string | null;
}

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string; chapterId: string };
  }
) {
  try {
    const { lessons } = await req.json();
    console.log('Received lessons to reorder:', lessons);

    // Verify authentication using Better Auth session
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is the community creator
    const community = await queryOne<Community>`
      SELECT id, created_by
      FROM communities
      WHERE slug = ${params.communitySlug}
    `;

    if (!community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    if (community.created_by !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update each lesson's position
    for (const [index, lesson] of lessons.entries()) {
      console.log(`Updating lesson ${lesson.id} to position ${index}`);

      await sql`
        UPDATE lessons
        SET lesson_position = ${index}
        WHERE id = ${lesson.id}
          AND chapter_id = ${params.chapterId}
      `;
    }

    // Fetch the updated lessons
    const updatedLessons = await query<Lesson>`
      SELECT *
      FROM lessons
      WHERE chapter_id = ${params.chapterId}
      ORDER BY lesson_position ASC
    `;

    console.log('Updated lessons from database:', updatedLessons);

    // Transform lessons for frontend compatibility
    const transformedLessons = updatedLessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      lesson_position: lesson.lesson_position,
      chapter_id: lesson.chapter_id,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      created_by: lesson.created_by,
      videoAssetId: lesson.video_asset_id,
      playbackId: lesson.playback_id
    }));

    return NextResponse.json(transformedLessons);
  } catch (error) {
    console.error("Error in reorder lessons:", error);
    return new NextResponse("Failed to update lessons order", { status: 500 });
  }
}
