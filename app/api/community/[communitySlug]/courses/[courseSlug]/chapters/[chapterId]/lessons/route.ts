import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    // Verify auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();

    // Get community doc
    const communityQuery = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communityQuery.empty) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const communityDoc = communityQuery.docs[0];

    // Get course doc
    const courseQuery = await communityDoc.ref
      .collection("courses")
      .where("slug", "==", params.courseSlug)
      .limit(1)
      .get();

    if (courseQuery.empty) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseDoc = courseQuery.docs[0];

    // Get chapter doc
    const chapterRef = courseDoc.ref
      .collection("chapters")
      .doc(params.chapterId);

    const chapterDoc = await chapterRef.get();
    if (!chapterDoc.exists) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Get current lessons to determine the order
    const lessonsSnapshot = await chapterRef.collection("lessons").get();
    const order = lessonsSnapshot.size; // New lesson will be last in order

    // Create the new lesson
    const lessonRef = await chapterRef.collection("lessons").add({
      title,
      content: "",
      videoAssetId: null,
      order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: decodedToken.uid,
    });

    const lessonDoc = await lessonRef.get();
    const lessonData = {
      id: lessonDoc.id,
      ...lessonDoc.data()
    };

    return NextResponse.json(lessonData);
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
  {
    params,
  }: {
    params: {
      communitySlug: string;
      courseSlug: string;
      chapterId: string;
      lessonId: string;
    };
  }
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
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseRef = courseDoc.docs[0].ref;

    // Get the chapter document
    const chapterDoc = await courseRef
      .collection("chapters")
      .doc(chapterId)
      .get();

    if (!chapterDoc.exists) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
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
  {
    params,
  }: {
    params: {
      communitySlug: string;
      courseSlug: string;
      chapterId: string;
      lessonId: string;
    };
  }
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
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseRef = courseDoc.docs[0].ref;

    // Get the chapter document
    const chapterDoc = await courseRef
      .collection("chapters")
      .doc(chapterId)
      .get();

    if (!chapterDoc.exists) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
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
