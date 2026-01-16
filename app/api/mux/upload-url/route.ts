import { NextResponse } from 'next/server';
import { createMuxUploadUrl } from '@/lib/mux';
import { getSession } from '@/lib/auth-session';

export async function POST() {
  try {
    // Verify authentication using Better Auth session
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { uploadId, uploadUrl } = await createMuxUploadUrl();
    return NextResponse.json({ uploadId, uploadUrl });
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
