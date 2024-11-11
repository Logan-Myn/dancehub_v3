import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    const { communitySlug, courseSlug, chapterId } = params;
    const { title, content } = await request.json();

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

    // Get the course document
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

    // Get the chapter document
    const chapterDoc = await courseRef
      .collection("chapters")
      .doc(chapterId)
      .get();

    if (!chapterDoc.exists) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Create a new lesson document
    const newLessonRef = await chapterDoc.ref.collection("lessons").add({
      title,
      content,
    });

    const newLesson = {
      id: newLessonRef.id,
      title,
      content,
    };

    return NextResponse.json(newLesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  try {
    const { communitySlug, courseSlug, chapterId, lessonId } = params;
    const { title, content } = await request.json();

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

    // Get the course document
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

    // Get the chapter document
    const chapterDoc = await courseRef
      .collection("chapters")
      .doc(chapterId)
      .get();

    if (!chapterDoc.exists) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Update the lesson document
    await chapterDoc.ref.collection("lessons").doc(lessonId).update({
      title,
      content,
    });

    return NextResponse.json({ message: "Lesson updated successfully" });
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  try {
    const { communitySlug, courseSlug, chapterId, lessonId } = params;

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

    // Get the course document
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

    // Get the chapter document
    const chapterDoc = await courseRef
      .collection("chapters")
      .doc(chapterId)
      .get();

    if (!chapterDoc.exists) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Delete the lesson document
    await chapterDoc.ref.collection("lessons").doc(lessonId).delete();

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
} 