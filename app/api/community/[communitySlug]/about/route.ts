import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PageData } from "@/types/page-builder";

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;
    const { aboutPage } = await request.json();

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

    // Update the about page data
    await communityDoc.ref.update({
      aboutPage: {
        ...aboutPage,
        meta: {
          lastUpdated: new Date().toISOString(),
          publishedVersion: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      message: "About page updated successfully",
      data: aboutPage,
    });
  } catch (error) {
    console.error("Error updating about page:", error);
    return NextResponse.json(
      { error: "Failed to update about page" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

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
    const communityData = communityDoc.data();

    // Return the about page data if it exists
    return NextResponse.json({
      aboutPage: communityData.aboutPage || {
        sections: [],
        meta: {
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching about page:", error);
    return NextResponse.json(
      { error: "Failed to fetch about page" },
      { status: 500 }
    );
  }
} 