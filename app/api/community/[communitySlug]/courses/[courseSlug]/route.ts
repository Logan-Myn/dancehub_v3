import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const { communitySlug, courseSlug } = params;

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

    // Get the course document by slug
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

    const course = courseDoc.docs[0].data();

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 