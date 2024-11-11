import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const { communitySlug, courseSlug } = params;
    const { title } = await request.json();

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

    // Create a new chapter document
    const newChapterRef = await courseRef.collection("chapters").add({
      title,
      lessons: [],
    });

    const newChapter = {
      id: newChapterRef.id,
      title,
      lessons: [],
    };

    return NextResponse.json(newChapter);
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    const { communitySlug, courseSlug, chapterId } = params;
    const { title } = await request.json();

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

    // Update the chapter document
    await courseRef.collection("chapters").doc(chapterId).update({
      title,
    });

    return NextResponse.json({ message: "Chapter updated successfully" });
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    const { communitySlug, courseSlug, chapterId } = params;

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

    // Delete the chapter document
    await courseRef.collection("chapters").doc(chapterId).delete();

    return NextResponse.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Failed to delete chapter" },
      { status: 500 }
    );
  }
} 