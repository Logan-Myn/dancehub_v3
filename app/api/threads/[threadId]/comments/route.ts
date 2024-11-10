import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { content, userId } = await request.json();
    const { threadId } = params;

    // Get user data
    const userRecord = await adminAuth.getUser(userId);

    const comment = {
      content,
      userId,
      author: {
        name: userRecord.displayName || 'Anonymous',
        image: userRecord.photoURL || '',
      },
      createdAt: new Date().toISOString(),
    };

    // Add comment to thread
    const threadRef = adminDb.collection('threads').doc(threadId);
    await threadRef.update({
      comments: FieldValue.arrayUnion(comment),
      commentsCount: FieldValue.increment(1),
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
} 