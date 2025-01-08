import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, createdBy } = body;

    // Create a slug from the community name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Create the community using admin SDK
    const communityRef = await adminDb.collection('communities').add({
      name,
      slug,
      createdBy,
      createdAt: new Date().toISOString(),
      members: [createdBy],
      isActive: true,
    });

    return NextResponse.json({
      communityId: communityRef.id,
      slug,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    );
  }
} 