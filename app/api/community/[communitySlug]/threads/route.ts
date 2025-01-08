import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community
    const communitiesSnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", communitySlug)
      .limit(1)
      .get();

    if (communitiesSnapshot.empty) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    const communityDoc = communitiesSnapshot.docs[0];

    // Get threads
    const threadsSnapshot = await adminDb
      .collection("threads")
      .where("communityId", "==", communityDoc.id)
      .orderBy("createdAt", "desc")
      .get();

    // Get user data for each thread
    const threads = await Promise.all(
      threadsSnapshot.docs.map(async (doc) => {
        const threadData = doc.data();
        const userRecord = await adminAuth.getUser(threadData.userId);

        return {
          id: doc.id,
          ...threadData,
          author: {
            name: userRecord.displayName || "Anonymous",
            image: userRecord.photoURL || "",
          },
          createdAt: threadData.createdAt,
          likesCount: threadData.likes?.length || 0,
          commentsCount: threadData.comments?.length || 0,
        };
      })
    );

    return NextResponse.json(threads);
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
