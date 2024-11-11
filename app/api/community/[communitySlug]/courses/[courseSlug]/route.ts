import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const { communitySlug, courseSlug } = params;

    // Get the community document
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    const communityDoc = communitySnapshot.docs[0];

    // Get the course document by slug
    const courseDoc = await adminDb
      .collection("communities")
      .doc(communityDoc.id)
      .collection("courses")
      .where("slug", "==", courseSlug)
      .limit(1)
      .get();

    if (courseDoc.empty) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const courseRef = courseDoc.docs[0].ref;

    // Get the chapters subcollection
    const chaptersSnapshot = await courseRef.collection("chapters").get();

    const chapters = await Promise.all(
      chaptersSnapshot.docs.map(async (chapterDoc) => {
        const chapterData = chapterDoc.data();

        // Get the lessons subcollection for each chapter
        const lessonsSnapshot = await chapterDoc.ref.collection("lessons").get();

        const lessons = lessonsSnapshot.docs.map((lessonDoc) => ({
          id: lessonDoc.id,
          ...lessonDoc.data(),
        }));

        return {
          id: chapterDoc.id,
          ...chapterData,
          lessons,
        };
      })
    );

    const course = {
      id: courseDoc.docs[0].id,
      ...courseDoc.docs[0].data(),
      chapters,
    };

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 