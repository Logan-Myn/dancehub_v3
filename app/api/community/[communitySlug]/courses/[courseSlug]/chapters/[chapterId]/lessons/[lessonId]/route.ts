import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  try {
    console.log("Updating lesson with params:", params);
    const { title, content, videoAssetId } = await request.json();
    console.log("Update data received:", { title, content, videoAssetId });

    // Get the community document
    const communityQuery = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communityQuery.empty) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const communityDoc = communityQuery.docs[0];

    // Get the course document
    const courseQuery = await communityDoc.ref
      .collection("courses")
      .where("slug", "==", params.courseSlug)
      .limit(1)
      .get();

    if (courseQuery.empty) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseDoc = courseQuery.docs[0];

    // Get the chapter document
    const chapterRef = courseDoc.ref.collection("chapters").doc(params.chapterId);
    const chapterDoc = await chapterRef.get();

    if (!chapterDoc.exists) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Reference to the lesson document
    const lessonRef = chapterRef.collection("lessons").doc(params.lessonId);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (videoAssetId !== undefined) updateData.videoAssetId = videoAssetId;

    console.log("Final update data:", updateData);

    // Update the lesson
    await lessonRef.update(updateData);

    // Get the updated lesson data
    const updatedLesson = await lessonRef.get();
    const lessonData = {
      id: updatedLesson.id,
      ...updatedLesson.data()
    };

    console.log("Updated lesson data:", lessonData);

    return NextResponse.json(lessonData);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
} 