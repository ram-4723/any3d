import type { ObjectEntry } from '@/types/object';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
async function staticObjects(): Promise<ObjectEntry[]> {
  const dir=path.join(process.cwd(),'data','objects');
  try { const files=(await readdir(dir)).filter(file=>file.endsWith('.json')); return await Promise.all(files.map(async file=>JSON.parse(await readFile(path.join(dir,file),'utf8')) as ObjectEntry)); }
  catch { return []; }
}
export async function getObjects(): Promise<ObjectEntry[]> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base) try { const response = await fetch(`${base}/api/objects`, { next: { revalidate: 60 } }); if (response.ok) return await response.json(); } catch { /* Static fallback keeps Vercel usable. */ }
  return staticObjects();
}
export async function getObject(slug: string) { return (await getObjects()).find(item => item.slug === slug); }
