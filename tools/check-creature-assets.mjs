/**
 * Intake check for creatures. For every creature in src/sim/creatures.ts it verifies the GLB, LOD,
 * hero card, thumbnail and transparent select render exist, and that the images were generated
 * from the current model appearance. Missing files fail; stale images warn (or fail with --strict).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fingerprint } from './creature-fingerprint.mjs';

const strict = process.argv.includes('--strict');
const dir = 'public/assets/creatures';
const src = fs.readFileSync('src/sim/creatures.ts', 'utf8');
const ids = [...src.matchAll(/^\s*id: '([a-z]+)'/gm)].map((m) => m[1]);
const manifest = fs.existsSync(`${dir}/images.json`) ? JSON.parse(fs.readFileSync(`${dir}/images.json`, 'utf8')) : {};
let errors = 0, warnings = 0;
const err = (m) => { console.log('ERROR   ' + m); errors++; };
const warn = (m) => { console.log('STALE   ' + m); warnings++; };
for (const id of ids) {
  for (const f of [`${id}.glb`, `${id}.lod1.glb`, `${id}.png`, `${id}.card.png`, `${id}.thumb.png`, `${id}.select.png`]) if (!fs.existsSync(`${dir}/${f}`)) err(`${id}: missing ${f} (select renders: Blender -b --python tools/art/render-creatures.py)`);
  if (!fs.existsSync(`${dir}/${id}.glb`)) continue;
  const fp = fingerprint(`${dir}/${id}.glb`);
  const m = manifest[id];
  if (!m) { err(`${id}: no entry in images.json (run: node tools/make-cards.mjs ${id})`); continue; }
  if (m.appearanceSha256 !== fp.appearanceSha256) warn(`${id}: model appearance (materials/textures) changed since its images were made -> re-render ${id}.png, then node tools/make-cards.mjs ${id}`);
  else if (m.glbSha256 !== fp.glbSha256) console.log(`note    ${id}: model changed but appearance did not (clips/geometry); images still valid`);
  const required = ['Idle', 'Attack', 'Hit', 'Death', 'Bite', 'Heavy', 'Dodge', 'Eat', 'Stagger', 'Ability'];
  const missing = required.filter((c) => !fp.clips.includes(c));
  if (missing.length) warn(`${id}: clips missing: ${missing.join(', ')} (stand-ins will play)`);
  if (fs.existsSync(`${dir}/${id}.lod1.glb`) && fs.statSync(`${dir}/${id}.lod1.glb`).mtimeMs < fs.statSync(`${dir}/${id}.glb`).mtimeMs) warn(`${id}: lod1 is older than the model -> node tools/make-lods.mjs`);
  // the select screen shows <id>.select.png, so a refreshed studio render must bring one with it
  const selectPath = `${dir}/${id}.select.png`;
  if (fs.existsSync(selectPath)) {
    const selectSha256 = crypto.createHash('sha256').update(fs.readFileSync(selectPath)).digest('hex');
    if (m.selectSha256 !== selectSha256) warn(`${id}: ${id}.select.png does not match the one recorded with the other images -> re-render it (Blender -b --python tools/art/render-creatures.py), then node tools/make-cards.mjs ${id}`);
  }
}
console.log(`\n${ids.length} creatures · ${errors} error(s) · ${warnings} warning(s)`);
process.exit(errors || (strict && warnings) ? 1 : 0);
