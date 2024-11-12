import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { credential } from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    // Get the authorization token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];

    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getFirestore();

    // Check if user is the community creator
    const communityDoc = await db
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .get();

    if (communityDoc.empty || communityDoc.docs[0].data().createdBy !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete the chapter and all its lessons
    const chapterRef = db
      .collection("courses")
      .doc(params.courseSlug)
      .collection("chapters")
      .doc(params.chapterId);

    // Get all lessons in the chapter
    const lessonsSnapshot = await chapterRef.collection("lessons").get();
    
    // Delete all lessons in a batch
    const batch = db.batch();
    lessonsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete the chapter itself
    batch.delete(chapterRef);
    
    // Commit the batch
    await batch.commit();

    return NextResponse.json({ message: "Chapter and lessons deleted successfully" });
  } catch (error) {
    console.error("[CHAPTER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 