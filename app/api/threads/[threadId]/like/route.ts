import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await request.json();
    const { threadId } = params;

    const threadRef = adminDb.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    const likes = threadDoc.data()?.likes || [];
    const isLiked = likes.includes(userId);

    // Toggle like
    await threadRef.update({
      likes: isLiked 
        ? FieldValue.arrayRemove(userId)
        : FieldValue.arrayUnion(userId),
    });

    return NextResponse.json({
      liked: !isLiked,
      likesCount: isLiked ? likes.length - 1 : likes.length + 1,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
} 