import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

interface Comment {
  id: string;
  likes?: string[];
  [key: string]: any;  // for other properties we don't need to type strictly
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string; commentId: string } }
) {
  try {
    const { userId } = await request.json();
    const { threadId, commentId } = params;

    // Verify user
    await adminAuth.getUser(userId);

    // Get the thread document
    const threadRef = adminDb.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const threadData = threadDoc.data();
    const comments = threadData?.comments || [];

    // Find the comment and update its likes
    const updatedComments = comments.map((comment: Comment) => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        const userLikeIndex = likes.indexOf(userId);
        
        if (userLikeIndex === -1) {
          // Add like
          likes.push(userId);
        } else {
          // Remove like
          likes.splice(userLikeIndex, 1);
        }
        
        return {
          ...comment,
          likes,
          likesCount: likes.length
        };
      }
      return comment;
    });

    // Update the thread with modified comments
    await threadRef.update({ comments: updatedComments });

    // Find the updated comment to return its new state
    const updatedComment = updatedComments.find((c: Comment) => c.id === commentId);
    const liked = updatedComment?.likes?.includes(userId) || false;

    return NextResponse.json({
      likesCount: updatedComment?.likes?.length || 0,
      liked
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json(
      { error: 'Failed to like comment' },
      { status: 500 }
    );
  }
} 