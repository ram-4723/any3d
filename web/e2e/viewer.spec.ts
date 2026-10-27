import { test, expect } from '@playwright/test';
test('dragging the frame viewer changes its displayed frame', async ({ page }) => {
  await page.goto('/objects/tesla-roadster');
  const canvas = page.locator('canvas'); await expect(canvas).toBeVisible();
  await expect(page.locator('.viewer-loading')).toHaveCount(0, { timeout: 30000 });
  const before = await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  const box = await canvas.boundingBox(); if (!box) throw new Error('Viewer canvas has no bounding box');
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5); await page.mouse.down(); await page.mouse.move(box.x+box.width*.25,box.y+box.height*.5,{steps:8}); await page.mouse.up();
  await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL())).not.toBe(before);
});
