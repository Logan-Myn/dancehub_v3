import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;
    const updates = await request.json();

    // Get the community by slug
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

    // Update the community with all fields including customLinks
    await adminDb
      .collection('communities')
      .doc(communityDoc.id)
      .update({
        name: updates.name,
        description: updates.description,
        imageUrl: updates.imageUrl,
        customLinks: updates.customLinks || [],
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ 
      success: true,
      data: {
        name: updates.name,
        description: updates.description,
        imageUrl: updates.imageUrl,
        customLinks: updates.customLinks || [],
      }
    });
  } catch (error) {
    console.error('Error updating community:', error);
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    );
  }
} 