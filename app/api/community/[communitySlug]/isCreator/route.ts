import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, cert, getApps } from "firebase-admin/app";

const serviceAccount = require("../../../../../serviceAccountKey.json");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const token = request.headers.get("Authorization")?.split(" ")[1] || "";

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const communitySnapshot = await db
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json({ isCreator: false });
    }

    const community = communitySnapshot.docs[0].data();
    const isCreator = community.createdBy === userId;

    return NextResponse.json({ isCreator });
  } catch (error) {
    console.error("Error checking if user is creator:", error);
    return NextResponse.json({ isCreator: false });
  }
} 