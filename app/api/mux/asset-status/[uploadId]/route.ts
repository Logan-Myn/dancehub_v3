import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(
  request: Request,
  { params }: { params: { uploadId: string } }
) {
  try {
    const { uploadId } = params;
    const asset = await muxClient.video.assets.retrieve(uploadId);

    return NextResponse.json({
      status: asset.status,
      playbackId: asset.playback_ids?.[0]?.id,
    });
  } catch (error) {
    console.error('Error checking asset status:', error);
    return NextResponse.json(
      { error: 'Failed to check asset status' },
      { status: 500 }
    );
  }
} 