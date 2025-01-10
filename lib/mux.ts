import Mux from '@mux/mux-node';

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function createMuxUploadUrl() {
  const upload = await muxClient.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'standard',
    },
    cors_origin: '*',
  });

  return {
    uploadId: upload.asset_id,
    uploadUrl: upload.url,
  };
}

export async function getMuxAssetStatus(assetId: string) {
  const asset = await muxClient.video.assets.retrieve(assetId);
  return {
    status: asset.status,
    playbackId: asset.playback_ids?.[0]?.id,
  };
}

export async function getMuxAsset(assetId: string) {
  try {
    const asset = await muxClient.video.assets.retrieve(assetId);
    return {
      id: asset.id,
      status: asset.status,
      playbackId: asset.playback_ids?.[0]?.id,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      maxResolution: asset.max_stored_resolution,
      createdAt: asset.created_at
    };
  } catch (error) {
    console.error('Error fetching Mux asset:', error);
    return null;
  }
} 