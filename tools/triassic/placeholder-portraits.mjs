#!/usr/bin/env node
// Placeholder portraits for the Triassic roster.
//
// The real portraits (see docs/creature-intake.md) are transparent cut-outs rendered from each
// creature's finished model: `<id>.select.png`, `<id>.card.png` and `<id>.thumb.png` under
// public/assets/triassic/creatures/. No Triassic model has landed yet, so this script stands in
// for that render step using the one asset that does exist per animal: its canonical pose
// (docs/triassic/canonical/<id>.png, a 1536x1024 studio render of the whole scene, not a
// cut-out). It is not a cut-out either — the source has no alpha to cut around — so the pose is
// simply fit onto each portrait's canvas, transparent only in the letterbox bars the aspect-ratio
// change adds, and cover-cropped for the thumbnail. Deterministic and idempotent: same inputs,
// same bytes, safe to rerun.
//
// Usage: node tools/triassic/placeholder-portraits.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TRIASSIC_CREATURES } from '../../src/content/triassic/creatures.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CANONICAL_DIR = path.join(ROOT, 'docs/triassic/canonical');
const OUT_DIR = path.join(ROOT, 'public/assets/triassic/creatures');

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// id -> canonical pose file (Keichousaurus has no plain `keichousaurus.png`; we use the male pose).
function canonicalFileFor(id) {
  if (id === 'keichousaurus') return 'keichousaurus-male.png';
  return `${id}.png`;
}

const SPECS = [
  // kind, width, height, fit, maxBytes (soft target, reported not enforced)
  { kind: 'select', width: 1600, height: 1200, fit: 'contain', maxBytes: 600_000 },
  { kind: 'card', width: 1000, height: 750, fit: 'contain', maxBytes: 600_000 },
  { kind: 'thumb', width: 256, height: 192, fit: 'cover', maxBytes: 60_000 },
];

// These are full photographic scenes, not flat UI art, so a high-fidelity palette blows well past
// the soft size budget (a naive quality:100 palette PNG runs 1-1.5 MB at 1600x1200). Quality 20,
// no dithering, and a shrinking colour count keeps every select and card under budget with the
// silhouette and colouring still clearly legible, which is all a placeholder owes. The colour
// count only drops as far as an image actually needs, checked in this fixed order, so the result
// is still deterministic for a given source.
const PALETTE_STEPS = [24, 16, 10];

async function makePortrait(srcPath, outPath, { width, height, fit, maxBytes }) {
  let pipeline = sharp(srcPath).resize(width, height, {
    fit,
    background: TRANSPARENT,
    position: 'centre',
  });
  if (fit === 'contain') pipeline = pipeline.ensureAlpha();

  let buf;
  for (const colors of PALETTE_STEPS) {
    buf = await pipeline
      .clone()
      .png({ compressionLevel: 9, palette: true, quality: 20, colors, dither: 0, effort: 10 })
      .toBuffer();
    if (buf.length <= maxBytes) break;
  }
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ids = TRIASSIC_CREATURES.map((c) => c.id);
  if (ids.length !== 25) throw new Error(`expected 25 Triassic creature ids, found ${ids.length}`);

  const results = [];
  for (const id of ids) {
    const canonicalFile = canonicalFileFor(id);
    const srcPath = path.join(CANONICAL_DIR, canonicalFile);
    if (!fs.existsSync(srcPath)) throw new Error(`missing canonical pose for ${id}: ${srcPath}`);

    for (const spec of SPECS) {
      const outPath = path.join(OUT_DIR, `${id}.${spec.kind}.png`);
      const size = await makePortrait(srcPath, outPath, spec);
      results.push({ id, kind: spec.kind, size, maxBytes: spec.maxBytes, outPath });
    }
  }

  const readmePath = path.join(OUT_DIR, 'README.md');
  fs.writeFileSync(
    readmePath,
    `# Placeholder portraits\n\n` +
      `These \`<id>.select.png\`, \`<id>.card.png\` and \`<id>.thumb.png\` files are placeholders: ` +
      `each is cut from that animal's canonical pose in \`docs/triassic/canonical/\` by ` +
      `\`tools/triassic/placeholder-portraits.mjs\`, not rendered from a model. Keichousaurus uses ` +
      `its male pose. They stand in until each creature's real model lands and is rendered into ` +
      `these same files per \`docs/creature-intake.md\`. Nothing in this directory is a model.\n`,
  );

  console.log(`Wrote ${results.length} portrait files to ${path.relative(ROOT, OUT_DIR)}/ and README.md`);
  const overBudget = results.filter((r) => r.size > r.maxBytes);
  const top = [...results].sort((a, b) => b.size - a.size).slice(0, 5);
  console.log('Largest files:');
  for (const r of top) {
    console.log(`  ${r.id}.${r.kind}.png  ${(r.size / 1024).toFixed(1)} KB`);
  }
  if (overBudget.length) {
    console.log(`Warning: ${overBudget.length} file(s) exceeded their soft size budget:`);
    for (const r of overBudget) console.log(`  ${r.id}.${r.kind}.png  ${(r.size / 1024).toFixed(1)} KB > ${(r.maxBytes / 1024).toFixed(0)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
