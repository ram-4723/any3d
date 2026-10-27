import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/public/objects');
let failed = false;
if (!fs.existsSync(root)) { console.error(`Missing packs directory: ${root}`); process.exit(1); }
for (const slug of fs.readdirSync(root)) {
  const dir = path.join(root, slug); if (!fs.statSync(dir).isDirectory()) continue;
  const errors = [];
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) { console.error(`${slug}: missing manifest.json`); failed = true; continue; }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { errors.push('invalid manifest JSON'); }
  if (manifest) {
    if (manifest.slug !== slug) errors.push(`slug mismatch (${manifest.slug})`);
    if (manifest.width !== 1600 || manifest.height !== 900) errors.push('manifest dimensions must be 1600x900');
    const posterPath=path.join(dir,'poster.webp');
    if (!fs.existsSync(posterPath)) errors.push('missing poster.webp');
    else { const b=fs.readFileSync(posterPath); if (b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP') errors.push('poster.webp is not WebP'); else { const header=b.toString('ascii',12,16); let w,h; if(header==='VP8X'){w=1+b.readUIntLE(24,3);h=1+b.readUIntLE(27,3)}else if(header==='VP8 '){w=b.readUInt16LE(26)&0x3fff;h=b.readUInt16LE(28)&0x3fff}else if(header==='VP8L'){const bits=b.readUInt32LE(21);w=(bits&0x3fff)+1;h=((bits>>14)&0x3fff)+1} if(w!==1600||h!==900)errors.push(`poster.webp is ${w??'unknown'}x${h??'unknown'}, expected 1600x900`); } }
    for (const sequence of ['rotate', ...(manifest.explode ? ['explode'] : [])]) {
      const config = manifest[sequence];
      if (!Number.isInteger(config?.count) || config.count < 1 || !config.pattern?.includes('{0000}')) { errors.push(`invalid ${sequence} configuration`); continue; }
      const folder = path.join(dir, sequence);
      if (fs.existsSync(folder) && fs.readdirSync(folder).filter(name=>name.endsWith('.webp')).length !== config.count) errors.push(`${sequence} frame count does not match manifest`);
      for (let n = 1; n <= config.count; n++) {
        const rel = config.pattern.replace('{0000}', String(n).padStart(4, '0'));
        const file = path.join(dir, rel);
        if (!fs.existsSync(file)) { errors.push(`missing ${rel}`); break; }
        // Read dimensions from WebP VP8/VP8L/VP8X headers without adding dependencies.
        const b = fs.readFileSync(file);
        if (b.toString('ascii',0,4) !== 'RIFF' || b.toString('ascii',8,12) !== 'WEBP') { errors.push(`${rel} is not WebP`); break; }
        let dims;
        if (b.toString('ascii',12,16)==='VP8X') dims=[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
        else if (b.toString('ascii',12,16)==='VP8 ') dims=[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
        else if (b.toString('ascii',12,16)==='VP8L') { const bits=b.readUInt32LE(21); dims=[(bits&0x3fff)+1,((bits>>14)&0x3fff)+1]; }
        if (!dims || dims[0]!==1600 || dims[1]!==900) { errors.push(`${rel} is ${dims?`${dims[0]}x${dims[1]}`:'an unsupported WebP variant'}, expected 1600x900`); break; }
      }
    }
  }
  if (errors.length) { failed=true; console.error(`${slug}:\n  - ${errors.join('\n  - ')}`); }
  else console.log(`${slug}: OK`);
}
if (failed) process.exit(1);
