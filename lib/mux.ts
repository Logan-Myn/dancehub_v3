import Mux from '@mux/mux-node';

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Missing Mux API credentials');
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error('Missing NEXT_PUBLIC_APP_URL environment variable');
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export const Video = mux.video;

export async function createMuxUploadUrl() {
  const upload = await Video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
    },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

export async function getMuxAsset(uploadId: string) {
  try {
    // First get the upload to find the asset ID
    const upload = await Video.uploads.retrieve(uploadId);
    if (!upload.asset_id) {
      throw new Error('Asset not yet created');
    }

    // Then get the asset details
    const asset = await Video.assets.retrieve(upload.asset_id);

    // Get the first playback ID
    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) {
      throw new Error('No playback ID found');
    }

    return {
      id: upload.asset_id,
      playbackId,
      status: asset.status,
    };
  } catch (error) {
    console.error('Error getting Mux asset:', error);
    return null;
  }
} 