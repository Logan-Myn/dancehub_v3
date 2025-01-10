import { NextResponse } from 'next/server';
import { createMuxUploadUrl } from '@/lib/mux';

export async function GET() {
  try {
    const { uploadUrl, uploadId } = await createMuxUploadUrl();
    return NextResponse.json({
      uploadUrl,
      assetId: uploadId,
    });
  } catch (error) {
    console.error('Error creating Mux upload:', error);
    return NextResponse.json(
      { error: 'Failed to create upload' },
      { status: 500 }
    );
  }
} 