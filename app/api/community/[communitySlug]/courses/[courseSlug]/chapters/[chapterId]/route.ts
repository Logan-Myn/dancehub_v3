import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const communityDoc = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .get();

    if (communityDoc.empty || communityDoc.docs[0].data().createdBy !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapterRef = adminDb
      .collection("courses")
      .doc(params.courseSlug)
      .collection("chapters")
      .doc(params.chapterId);

    const lessonsSnapshot = await chapterRef.collection("lessons").get();
    
    const batch = adminDb.batch();
    lessonsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    batch.delete(chapterRef);
    
    await batch.commit();

    return NextResponse.json({ message: "Chapter and lessons deleted successfully" });
  } catch (error) {
    console.error("[CHAPTER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 