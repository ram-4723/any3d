export function frameIndex(position: number, count: number) { return count > 0 ? ((Math.floor(position) % count) + count) % count : 0; }
export function hotspotVisible(current: number, target: number, count: number, radius = 6) { const delta = Math.abs(current - target); return Math.min(delta, count - delta) <= radius; }
