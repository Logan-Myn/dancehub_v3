import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { storage } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils";

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

    // Get courses for the community
    const coursesSnapshot = await adminDb
      .collection("communities")
      .doc(communityDoc.id)
      .collection("courses")
      .orderBy("createdAt", "desc")
      .get();

    const courses = coursesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get the community document
    const communitySnapshot = await adminDb
      .collection('communities')
      .where('slug', '==', communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const communityDoc = communitySnapshot.docs[0];

    // Parse the form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const imageFile = formData.get('image') as File;

    // Generate the slug from the title
    const slug = slugify(title);

    // Upload the image to Firebase Storage
    const imageName = `${uuidv4()}.${imageFile.name.split('.').pop()}`;
    const bucket = storage.bucket();
    const blob = bucket.file(`course-images/${imageName}`);
    const blobWriter = blob.createWriteStream({
      metadata: {
        contentType: imageFile.type,
      },
    });

    // Convert ArrayBuffer to Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    blobWriter.end(imageBuffer);

    await new Promise((resolve, reject) => {
      blobWriter.on('error', (err) => {
        reject(err);
      });
      blobWriter.on('finish', resolve);
    });

    // Get the public URL of the uploaded image
    const [imageUrl] = await blob.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    // Create a new course document
    const newCourseRef = await adminDb
      .collection('communities')
      .doc(communityDoc.id)
      .collection('courses')
      .add({
        title,
        description,
        imageUrl,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    // Fetch the newly created course
    const newCourse = await newCourseRef.get();

    return NextResponse.json({
      id: newCourse.id,
      ...newCourse.data(),
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
} 