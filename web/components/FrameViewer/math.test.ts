import { describe, expect, it } from 'vitest';
import { frameIndex, hotspotVisible } from './math';
describe('frameIndex',()=>{it('wraps rotations in either direction',()=>{expect(frameIndex(144,144)).toBe(0);expect(frameIndex(-1,144)).toBe(143);expect(frameIndex(5.8,144)).toBe(5)});it('handles empty sequences',()=>expect(frameIndex(4,0)).toBe(0))});
describe('hotspotVisible',()=>{it('shows a hotspot within six frames, including across the loop',()=>{expect(hotspotVisible(5,0,144)).toBe(true);expect(hotspotVisible(7,0,144)).toBe(false);expect(hotspotVisible(143,0,144)).toBe(true)})});
