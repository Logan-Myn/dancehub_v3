# Mux upload: attach on asset creation, not on encode completion

Date: 2026-07-16
Branch: `fix/mux-upload-attach`

## Problem

Course videos upload to Mux successfully but never get attached to the lesson. The
video sits in Mux, fully encoded and `ready`, while the lesson keeps `video_asset_id
= NULL` and the teacher sees a timeout error.

Reported by Marcela (community `bachata-online-by-marcela`), who re-uploaded one
187-second clip seven times between 2026-07-02 and 2026-07-16. All seven copies
reached Mux intact.

## Root cause

`components/VideoUpload.tsx` polls `/api/mux/assets/{uploadId}` after the file PUT
completes, and waits for `status === 'ready'`. The poll is capped at 60 attempts,
1 second apart (`maxAttempts = 60`). Mux encodes at roughly half of realtime for
4K source, so any 4K clip longer than about 2.5 minutes needs more than 60 seconds
and the client gives up with `"Timeout waiting for asset to be ready"`.

The lesson is only written in `onUploadComplete`, which never fires on that path,
so the upload is silently discarded from the app's point of view.

Evidence, measured against the Mux API and prod DB for her July uploads (all 4K,
so resolution is held constant):

| 4K clip length | attached | orphaned | failure rate |
| --- | --- | --- | --- |
| under 150s | 38 | 2 | 5% |
| 150s and over | 5 | 38 | 88% |

Corroborating: the one HD clip in the same session was the longest video she
uploaded that day (323.9s) and attached fine, because HD encodes fast enough to
fit the budget. Successful long uploads cluster at waits of 60-77 seconds, right
against the cap.

The 60s cap has been in the code since 2025-01. Nothing regressed; her footage
changed. She moved to 4K in June 2026 (July: 59 UHD vs 1 HD).

### Secondary defect

The poll aborts on any non-200 response:

```ts
if (!assetResponse.ok) throw new Error("Failed to check asset status");
```

`getMuxAsset` returns `null` for *any* failure, including the normal window right
after a PUT where Mux has not yet linked `asset_id` to the upload. The route maps
that `null` to 404. So a transient, expected state aborts the whole upload with no
retry. This likely explains the residual 5% failure rate on short clips.

## Design

Attach the video as soon as the asset **exists**, rather than when it finishes
encoding. Encoding time then stops being load-bearing, for any clip length or
resolution.

### 1. `lib/mux.ts` — `getMuxAsset`

Return a discriminated result instead of collapsing everything to `null`:

- `{ state: 'pending' }` — upload exists, `asset_id` not linked yet (normal, seconds)
- `{ state: 'found', id, playbackId, status }` — asset exists; `status` may be `'preparing'`
- throw — genuine failure (bad credentials, unknown upload, network)

Callers can then distinguish "wait" from "fail". `getMuxAsset` has exactly one
caller, `app/api/mux/assets/[assetId]/route.ts`, so this signature change is
contained. (`resolve-asset-id` uses a different helper,
`resolveAssetIdFromPlaybackId`, and is untouched.)

### 2. `app/api/mux/assets/[assetId]/route.ts`

Map the result honestly:

- `pending` -> `202` with `{ state: 'pending' }`
- `found` -> `200` with `{ id, playbackId, status }`
- thrown error -> `500`
- genuine unknown upload -> `404`

Today pending and missing both return 404, which is what makes the client abort.

### 3. `components/VideoUpload.tsx`

- Resolve the poll as soon as the asset exists with a `playbackId`. Do not require
  `status === 'ready'`. **This is the fix.**
- Treat `202` as "keep waiting", with exponential backoff, instead of aborting.
- The polling budget now covers only asset *creation* (seconds), not encoding
  (minutes). Cap at ~2 minutes of backoff, which is generous for asset creation
  and no longer scales with clip length.
- Only a thrown error or a real 404/500 calls `onUploadError`.

The lesson is written within seconds of the PUT finishing, so closing the tab or
dropping wifi during encoding can no longer lose the video.

## Trade-off accepted

After attach, the lesson holds a `playback_id` that is not playable for roughly a
minute, and `CourseDetailClient` renders `MuxPlayer` immediately. The teacher may
see a brief loading state on a video that works on reload. Keep the existing
"Processing..." indicator up until the asset reports `ready`; the row is already
saved by then, so this is cosmetic, not load-bearing.

## Out of scope

- Webhook-driven attach via `passthrough` (considered; more surface, and the
  attach window this design leaves open is seconds). The existing
  `video.asset.ready` handler only serves `live_class_recordings` and is untouched.
- The 500MB client-side cap. Not implicated: size was never the discriminator.
- The 39 orphaned July assets already in Mux. Marcela's three affected lessons
  were repaired by hand on 2026-07-16; the rest are duplicate retries of clips
  that eventually attached.

## Tests

`__tests__/components/VideoUpload.test.tsx`, each written to fail against current
code:

1. An asset that stays `preparing` well past 60 polls still attaches.
   Reproduces Marcela's bug directly.
2. A `202` window followed by the asset appearing attaches cleanly, rather than
   aborting on the first non-200.
3. A genuine error still surfaces through `onUploadError`.

## Verification

- `bun run test` green (Jest; never `bun test`).
- Drive a real upload of a 4K clip longer than 2.5 minutes against preprod and
  confirm the lesson row gets `video_asset_id` and `playback_id` without waiting
  for encode.
