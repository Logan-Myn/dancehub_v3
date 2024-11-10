import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { content, communityId, userId, title } = await request.json();

    // Get user data
    const userRecord = await adminAuth.getUser(userId);

    const threadData = {
      content,
      communityId,
      userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
      comments: [],
    };

    const threadRef = await adminDb.collection('threads').add(threadData);

    // Return the complete thread data
    return NextResponse.json({
      id: threadRef.id,
      ...threadData,
      author: {
        name: userRecord.displayName || 'Anonymous',
        image: userRecord.photoURL || '',
      },
      likesCount: 0,
      commentsCount: 0,
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
} 