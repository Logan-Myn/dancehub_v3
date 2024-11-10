import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string; commentId: string } }
) {
  try {
    const { content, userId } = await request.json();
    const { threadId, commentId } = params;

    // Get user data
    const userRecord = await adminAuth.getUser(userId);

    const reply = {
      id: crypto.randomUUID(),
      content,
      userId,
      author: {
        name: userRecord.displayName || 'Anonymous',
        image: userRecord.photoURL || '',
      },
      createdAt: new Date().toISOString(),
      parentId: commentId,
    };

    // Get the thread document
    const threadRef = adminDb.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();
    
    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const threadData = threadDoc.data();
    const comments = threadData?.comments || [];
    
    // Add the reply to the comments array
    const updatedComments = comments.concat(reply);

    // Update the thread with the new comments array
    await threadRef.update({
      comments: updatedComments,
      commentsCount: FieldValue.increment(1),
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
} 