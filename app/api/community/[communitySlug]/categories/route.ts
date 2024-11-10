import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { categories } = await request.json();
    const { communitySlug } = params;

    // Get community by slug
    const communitiesSnapshot = await adminDb
      .collection('communities')
      .where('slug', '==', communitySlug)
      .limit(1)
      .get();

    if (communitiesSnapshot.empty) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const communityDoc = communitiesSnapshot.docs[0];

    // Update categories
    await communityDoc.ref.update({
      threadCategories: categories,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error updating categories:', error);
    return NextResponse.json(
      { error: 'Failed to update categories' },
      { status: 500 }
    );
  }
} 