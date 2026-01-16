import { NextRequest, NextResponse } from "next/server";
import { sql, query } from "@/lib/db";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  slug: string;
  community_id: string;
  is_public: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");
    const visibility = searchParams.get("visibility");

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId is required" },
        { status: 400 }
      );
    }

    // Build query based on visibility parameter
    let courses: CourseRow[];

    if (visibility === "public") {
      courses = await query<CourseRow>`
        SELECT
          id,
          title,
          description,
          image_url,
          created_at,
          updated_at,
          slug,
          community_id,
          is_public
        FROM courses
        WHERE community_id = ${communityId}
          AND is_public = true
        ORDER BY created_at DESC
      `;
    } else {
      courses = await query<CourseRow>`
        SELECT
          id,
          title,
          description,
          image_url,
          created_at,
          updated_at,
          slug,
          community_id,
          is_public
        FROM courses
        WHERE community_id = ${communityId}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
