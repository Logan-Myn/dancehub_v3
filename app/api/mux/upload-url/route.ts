import { NextResponse } from 'next/server';
import { createMuxUploadUrl } from '@/lib/mux';
import { createAdminClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function POST() {
  try {
    // Get the authorization header
    const headersList = headers();
    const authorization = headersList.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the token
    const token = authorization.split(' ')[1];
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
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