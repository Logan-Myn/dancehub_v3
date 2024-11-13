import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { credential } from "firebase-admin";

if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const { chapters } = await req.json();

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

    // First, verify that all chapters exist
    const batch = db.batch();
    for (const [index, chapter] of chapters.entries()) {
      const chapterRef = db
        .collection("courses")
        .doc(params.courseSlug)
        .collection("chapters")
        .doc(chapter.id);

      // Get the current chapter data
      const chapterDoc = await chapterRef.get();
      
      if (chapterDoc.exists) {
        // Merge the new order with existing data
        batch.set(
          chapterRef, 
          { 
            order: index,
            // Preserve existing data
            ...chapterDoc.data(),
          },
          { merge: true } // This ensures we don't overwrite other fields
        );
      } else {
        console.warn(`Chapter ${chapter.id} not found, skipping reorder`);
      }
    }

    await batch.commit();

    return NextResponse.json({ message: "Chapters order updated successfully" });
  } catch (error) {
    console.error("[CHAPTERS_REORDER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 