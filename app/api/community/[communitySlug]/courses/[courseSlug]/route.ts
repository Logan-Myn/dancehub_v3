import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    console.log("API: Fetching course with params:", params);

    // First get the community document
    const communityQuery = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communityQuery.empty) {
      console.log("Community not found");
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const communityDoc = communityQuery.docs[0];

    // Then get the course using the community document reference
    const courseQuery = await communityDoc.ref
      .collection("courses")
      .where("slug", "==", params.courseSlug)
      .limit(1)
      .get();

    if (courseQuery.empty) {
      console.log("Course not found");
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseDoc = courseQuery.docs[0];
    const courseData: any = {
      id: courseDoc.id,
      ...courseDoc.data()
    };

    // Get all chapters
    const chaptersSnapshot = await courseDoc.ref
      .collection("chapters")
      .orderBy("order")
      .get();

    const chapters = await Promise.all(
      chaptersSnapshot.docs.map(async (chapterDoc) => {
        const lessonsSnapshot = await chapterDoc.ref
          .collection("lessons")
          .orderBy("order")
          .get();

        const lessons = lessonsSnapshot.docs.map(lessonDoc => ({
          id: lessonDoc.id,
          ...lessonDoc.data()
        }));

        return {
          id: chapterDoc.id,
          ...chapterDoc.data(),
          lessons
        };
      })
    );

    courseData.chapters = chapters;

    console.log("API: Successfully fetched course data");
    return NextResponse.json(courseData);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 