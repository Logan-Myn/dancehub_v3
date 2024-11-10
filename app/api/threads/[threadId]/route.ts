import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PATCH(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { title, content } = await request.json();
    const { threadId } = params;

    const threadRef = adminDb.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    await threadRef.update({
      title,
      content,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;

    // Delete the thread
    await adminDb.collection('threads').doc(threadId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
} 