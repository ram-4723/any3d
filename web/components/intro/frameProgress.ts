/**
 * Helpers that mirror the existing 3D Anything frame loader:
 * poster first, then every Nth frame (default 8), then the rest.
 * Wire these to the viewer's real loaded-count so the intro progress
 * bar is honest.
 */
export interface FrameLoadState {
  /** Total rotate frames (144 for the Raptor). */
  total: number;
  /** How many rotate frames have actually loaded so far. */
  loaded: number;
  /** Whether the poster image has loaded. */
  posterLoaded: boolean;
  /** Stride used for the coarse first pass. */
  stride?: number;
}

export interface FrameProgress {
  /** 0–1 display progress, weighted toward the coarse pass. */
  fraction: number;
  /** True once the poster + every `stride`-th frame is in. */
  coarseReady: boolean;
  /** True once every frame has loaded. */
  complete: boolean;
}

export function computeFrameProgress(state: FrameLoadState): FrameProgress {
  const total = Math.max(1, state.total);
  const stride = state.stride ?? 8;
  const coarseNeeded = Math.ceil(total / stride);
  const loaded = Math.max(0, Math.min(total, state.loaded));
  const coarseLoaded = Math.min(coarseNeeded, Math.ceil(loaded / stride) ? countCoarse(loaded, total, stride) : 0);

  // Weight: poster 8%, coarse pass 72%, remaining frames 20%.
  let fraction = state.posterLoaded ? 0.08 : 0;
  fraction += (coarseLoaded / coarseNeeded) * 0.72;
  const restNeeded = Math.max(1, total - coarseNeeded);
  const restLoaded = Math.max(0, loaded - coarseLoaded);
  fraction += Math.min(1, restLoaded / restNeeded) * 0.2;
  if (!state.posterLoaded) fraction = Math.min(fraction, 0.07);
  fraction = Math.max(0, Math.min(1, fraction));

  return {
    fraction,
    coarseReady: state.posterLoaded && coarseLoaded >= coarseNeeded,
    complete: state.posterLoaded && loaded >= total,
  };
}

function countCoarse(loaded: number, total: number, stride: number): number {
  // The coarse set is frames 1, 1+stride, 1+2*stride... (1-based files).
  // If the loader reports a raw count, assume those arrive first.
  // Prefer an explicit loadedCoarse if the parent tracks it; this fallback
  // treats the first `ceil(total/stride)` arrivals as the coarse set when
  // the parent only exposes a single counter.
  return Math.min(Math.ceil(total / stride), loaded);
}

/**
 * If your loader already has a Set/array of loaded frame indices
 * (0-based or 1-based), use this instead of a raw count.
 */
export function computeFrameProgressFromIndices(
  loadedFrames: Iterable<number>,
  total: number,
  opts: { posterLoaded: boolean; stride?: number; oneBased?: boolean } ,
): FrameProgress {
  const stride = opts.stride ?? 8;
  const oneBased = opts.oneBased ?? true;
  const set = new Set(
    [...loadedFrames].map((n) => (oneBased ? n : n + 1)),
  );
  let coarseLoaded = 0;
  const coarseNeeded = Math.ceil(total / stride);
  for (let i = 1; i <= total; i += stride) {
    if (set.has(i)) coarseLoaded += 1;
  }
  const loaded = set.size;
  const restNeeded = Math.max(1, total - coarseNeeded);
  const restLoaded = Math.max(0, loaded - coarseLoaded);
  let fraction = opts.posterLoaded ? 0.08 : 0;
  fraction += (coarseLoaded / coarseNeeded) * 0.72;
  fraction += Math.min(1, restLoaded / restNeeded) * 0.2;
  if (!opts.posterLoaded) fraction = Math.min(fraction, 0.07);
  return {
    fraction: Math.max(0, Math.min(1, fraction)),
    coarseReady: opts.posterLoaded && coarseLoaded >= coarseNeeded,
    complete: opts.posterLoaded && loaded >= total,
  };
}
