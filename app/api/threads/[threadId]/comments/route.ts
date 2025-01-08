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
      id: crypto.randomUUID(),
      content,
      userId,
      author: {
        name: userRecord.displayName || 'Anonymous',
        image: userRecord.photoURL || '',
      },
      createdAt: new Date().toISOString(),
    };

    // Get the thread document
    const threadRef = adminDb.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Initialize comments array if it doesn't exist
    const threadData = threadDoc.data();
    const comments = threadData?.comments || [];

    // Add new comment to the array
    const updatedComments = [...comments, comment];

    // Update the thread with the new comment
    await threadRef.update({
      comments: updatedComments,
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