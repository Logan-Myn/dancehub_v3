import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function PUT(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, videoAssetId } = await req.json();

    // Get reference to the lesson document
    const lessonRef = adminDb
      .collection("communities")
      .doc(params.communitySlug)
      .collection("courses")
      .doc(params.courseSlug)
      .collection("chapters")
      .doc(params.chapterId)
      .collection("lessons")
      .doc(params.lessonId);

    // Check if document exists
    const lessonDoc = await lessonRef.get();
    
    if (!lessonDoc.exists) {
      // Create the document if it doesn't exist
      await lessonRef.set({
        title: title || "",
        content: content || "",
        videoAssetId: videoAssetId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update existing document
      await lessonRef.update({
        title,
        content,
        videoAssetId,
        updatedAt: new Date().toISOString(),
      });
    }

    const updatedLesson = await lessonRef.get();
    
    return NextResponse.json({
      id: updatedLesson.id,
      ...updatedLesson.data(),
    });
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
} 