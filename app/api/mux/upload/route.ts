import { NextResponse } from 'next/server';
import { createMuxUploadUrl } from '@/lib/mux';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create upload URL
    const { uploadId, uploadUrl } = await createMuxUploadUrl();

    return NextResponse.json({ uploadId, uploadUrl });
  } catch (error) {
    console.error('Error creating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
} 