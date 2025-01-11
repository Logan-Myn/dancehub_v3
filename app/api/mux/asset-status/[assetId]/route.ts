import { NextResponse } from 'next/server';
import { getMuxAsset } from '@/lib/mux';

export async function GET(
  request: Request,
  { params }: { params: { assetId: string } }
) {
  try {
    const status = await getMuxAsset(params.assetId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking Mux asset status:', error);
    return NextResponse.json(
      { error: 'Failed to check asset status' },
      { status: 500 }
    );
  }
} 