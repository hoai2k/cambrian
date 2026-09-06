/**
 * Guards the colour-scheme data against the models it has to drive.
 *
 * 1. Every material in every shipped GLB must classify into a palette slot, and into the slot
 *    this file says it should. slotFor() reads material names, so a rename in Blender that
 *    quietly moved "Sclerotized tips" out of the accent slot would otherwise only show up as a
 *    creature that recolours wrong.
 * 2. Every scheme must give a colour for all six slots, so no creature can land on undefined.
 *
 * Usage: node tools/palette-test.mjs
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

// palettes.ts is TypeScript; the two pieces this check needs are simple enough to mirror here,
// and the mirror is asserted against the source below so it cannot drift.
const SLOTS = ['body', 'eyes', 'fins', 'legs', 'accent', 'underside'];
function slotFor(materialName) {
  const n = materialName.toLowerCase();
  if (/eye/.test(n)) return 'eyes';
  if (/ventral|arthrodial/.test(n)) return 'underside';
  if (/sclerotiz|oral plate|spine/.test(n)) return 'accent';
  if (/membrane|swimming/.test(n)) return 'fins';
  if (/bristle|appendage|endite|antenna|seta|leg/.test(n)) return 'legs';
  return 'body';
}

/** What each shipped material is expected to be. Update deliberately, never to silence a failure. */
const EXPECTED = {
  anomalocaris: {
    'Mottled umber cuticle': 'body', 'Compound eye': 'eyes', 'Thin swimming membranes': 'fins',
    'Amber endites': 'legs', 'Oral plates': 'accent', 'Dark arthrodial membrane': 'underside',
  },
  canadia: { 'canadia Cuticle': 'body', 'canadia Membrane': 'fins', 'canadia Bristles': 'legs' },
  hallucigenia: {
    'hallucigenia Dorsal cuticle': 'body', 'hallucigenia Dark eyes': 'eyes',
    'hallucigenia Soft appendages': 'legs', 'hallucigenia Sclerotized tips': 'accent',
  },
  marrella: {
    'marrella Dorsal cuticle': 'body', 'marrella Soft appendages': 'legs',
    'marrella Sclerotized tips': 'accent',
  },
  olenoides: {
    'olenoides Dorsal cuticle': 'body', 'olenoides Dark eyes': 'eyes',
    'olenoides Soft appendages': 'legs', 'olenoides Sclerotized tips': 'accent',
    'Olenoides continuous ventral body': 'underside',
  },
  opabinia: {
    'opabinia Cuticle': 'body', 'opabinia Eyes': 'eyes', 'opabinia Membrane': 'fins',
    'opabinia Sclerotized edges': 'accent',
  },
  waptia: {
    'waptia Cuticle': 'body', 'waptia Eyes': 'eyes', 'waptia Membrane': 'fins',
    'waptia Bristles': 'legs', 'waptia Sclerotized edges': 'accent',
  },
  wiwaxia: {
    'wiwaxia Dorsal cuticle': 'body', 'wiwaxia Soft appendages': 'legs',
    'wiwaxia Sclerotized tips': 'accent',
  },
};

const src = fs.readFileSync('src/shared/palettes.ts', 'utf8');
let failures = 0;
const fail = (m) => { console.log('FAIL  ' + m); failures++; };

// --- the mirror above must still match the classifier in palettes.ts ---
const body = src.slice(src.indexOf('export function slotFor'), src.indexOf('export interface Scheme'));
for (const rule of ['eye', 'ventral|arthrodial', 'sclerotiz|oral plate|spine', 'membrane|swimming', 'bristle|appendage|endite|antenna|seta|leg']) {
  if (!body.includes(rule)) fail(`slotFor() in palettes.ts no longer has the /${rule}/ rule this check mirrors`);
}

// --- every scheme covers every slot ---
const schemeIds = [...src.matchAll(/^\s*id: '([a-z-]+)',$/gm)].map((m) => m[1]);
const colorBlocks = [...src.matchAll(/colors: \{ ([^}]+) \}/g)].map((m) => m[1]);
for (const [i, blockText] of colorBlocks.entries()) {
  const keys = [...blockText.matchAll(/(\w+):/g)].map((m) => m[1]);
  const missing = SLOTS.filter((s) => !keys.includes(s));
  if (missing.length) fail(`scheme #${i + 1} is missing slot(s): ${missing.join(', ')}`);
}
const schemeCount = schemeIds.length;

// --- every shipped material classifies as expected ---
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
let materials = 0;
for (const [id, expected] of Object.entries(EXPECTED)) {
  for (const file of [`${id}.glb`, `${id}.lod1.glb`]) {
    const path = `public/assets/creatures/${file}`;
    if (!fs.existsSync(path)) { fail(`${file} is missing`); continue; }
    const doc = await io.read(path);
    const names = doc.getRoot().listMaterials().map((m) => m.getName());
    for (const name of names) {
      materials++;
      const want = expected[name];
      if (!want) { fail(`${file}: material "${name}" is not in this check's expected list`); continue; }
      const got = slotFor(name);
      if (got !== want) fail(`${file}: "${name}" classifies as ${got}, expected ${want}`);
    }
    for (const name of Object.keys(expected)) {
      if (!names.includes(name)) fail(`${file}: expected material "${name}" is gone`);
    }
  }
}

console.log(`\n${schemeCount} schemes · ${materials} materials checked · ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
