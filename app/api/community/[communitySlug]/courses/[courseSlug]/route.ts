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

    // Get all chapters with their lessons
    const chaptersSnapshot = await courseDoc.ref
      .collection("chapters")
      .orderBy("order")
      .get();

    const chapters = await Promise.all(
      chaptersSnapshot.docs.map(async (chapterDoc) => {
        // Get lessons for each chapter
        const lessonsSnapshot = await chapterDoc.ref
          .collection("lessons")
          .orderBy("order")
          .get();

        // Make sure to include all lesson data, including videoAssetId
        const lessons = lessonsSnapshot.docs.map((lessonDoc) => {
          const lessonData = lessonDoc.data();
          console.log("Raw lesson data from Firestore:", lessonData);
          return {
            id: lessonDoc.id,
            title: lessonData.title,
            content: lessonData.content,
            videoAssetId: lessonData.videoAssetId || null,
            order: lessonData.order,
            createdAt: lessonData.createdAt,
            updatedAt: lessonData.updatedAt,
            createdBy: lessonData.createdBy,
          };
        });

        return {
          id: chapterDoc.id,
          title: chapterDoc.data().title,
          order: chapterDoc.data().order,
          lessons,
        };
      })
    );

    courseData.chapters = chapters;

    console.log("API: Successfully fetched course data with lessons:", {
      chaptersCount: chapters.length,
      lessonsCount: chapters.reduce((acc, chapter) => acc + chapter.lessons.length, 0),
    });

    return NextResponse.json(courseData);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 