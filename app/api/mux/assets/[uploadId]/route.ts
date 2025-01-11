import { NextResponse } from 'next/server';
import { getMuxAsset } from '@/lib/mux';
import { createAdminClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { uploadId: string } }
) {
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

    const { uploadId } = params;
    const asset = await getMuxAsset(uploadId);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or not ready' },
        { status: 404 }
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error getting Mux asset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get asset' },
      { status: 500 }
    );
  }
} 