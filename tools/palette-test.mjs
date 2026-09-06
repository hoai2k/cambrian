/**
 * Guards the colour-scheme data against the models it has to drive.
 *
 * 1. Every material in every shipped GLB must classify into a palette slot, and into the slot
 *    this file says it should. slotFor() reads material names, so a rename in Blender that
 *    quietly moved "Sclerotized tips" out of the accent slot would otherwise only show up as a
 *    creature that recolours wrong.
 * 2. Every scheme must give a colour for all six slots, so no creature can land on undefined.
 * 3. Every creature's default scheme in CREATURE_SCHEMES must name a scheme that exists, and must
 *    name a creature that exists — a typo either way would silently fall back to the authored
 *    colours, which looks exactly like a deliberate "Default (as authored)" choice.
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
  if (/sclerotiz|oral|spine/.test(n)) return 'accent';
  if (/membrane|swimming|marginal/.test(n)) return 'fins';
  if (/bristle|appendage|endite|antenna|seta|gill|leg/.test(n)) return 'legs';
  return 'body';
}

/**
 * What each material name means, with the creature-id prefix stripped ("waptia Cuticle" ->
 * "cuticle"). Keyed by name rather than per creature because the roster reuses one naming
 * convention, so this covers all 21 creatures and any that follow. A material whose name is not
 * listed fails the check: a new name must be classified deliberately, not silently absorbed by
 * the body fallback.
 */
const EXPECTED = {
  'cuticle': 'body',
  'dorsal cuticle': 'body',
  'mottled umber cuticle': 'body',
  'living integument': 'body',
  'eyes': 'eyes',
  'dark eyes': 'eyes',
  'compound eye': 'eyes',
  'membrane': 'fins',
  'fin membrane': 'fins',
  'thin swimming membranes': 'fins',
  'marginal tissue': 'fins',
  'bristles': 'legs',
  'soft appendages': 'legs',
  'amber endites': 'legs',
  'gill filaments': 'legs',
  'sclerotized tips': 'accent',
  'sclerotized edges': 'accent',
  'oral plates': 'accent',
  'oral cuticle': 'accent',
  'dark arthrodial membrane': 'underside',
  'continuous ventral body': 'underside',
};

/** The whole roster: the base eight in creatures.ts plus the expansion in expansion.ts. */
function rosterIds() {
  const text = ['src/sim/creatures.ts', 'src/sim/expansion.ts']
    .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  return [...new Set([...text.matchAll(/\bid: '([a-z]+)'/g)].map((m) => m[1]))];
}

const src = fs.readFileSync('src/shared/palettes.ts', 'utf8');
let failures = 0;
const fail = (m) => { console.log('FAIL  ' + m); failures++; };

// --- the mirror above must still match the classifier in palettes.ts ---
const body = src.slice(src.indexOf('export function slotFor'), src.indexOf('export interface Scheme'));
for (const rule of ['eye', 'ventral|arthrodial', 'sclerotiz|oral|spine', 'membrane|swimming|marginal', 'bristle|appendage|endite|antenna|seta|gill|leg']) {
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

// --- CREATURE_SCHEMES names real creatures and real schemes ---
const mapBlock = src.slice(src.indexOf('export const CREATURE_SCHEMES'), src.indexOf('export const DEFAULT_SCHEME'));
const assigned = [...mapBlock.matchAll(/^\s*([a-z]+): '([a-z-]+)',$/gm)].map((m) => [m[1], m[2]]);
const knownSchemes = new Set(schemeIds);
const knownIds = new Set(rosterIds());
for (const [creatureId, schemeName] of assigned) {
  if (!knownIds.has(creatureId)) fail(`CREATURE_SCHEMES names "${creatureId}", which is not in the roster`);
  if (!knownSchemes.has(schemeName)) fail(`CREATURE_SCHEMES gives ${creatureId} the scheme "${schemeName}", which does not exist`);
  if (schemeName === 'default') fail(`CREATURE_SCHEMES gives ${creatureId} the scheme "default"; leave it out of the map instead`);
}

// --- every shipped material, on every creature, classifies as expected ---
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const ids = rosterIds();
let materials = 0;
for (const id of ids) {
  const slotsUsed = new Set();
  for (const file of [`${id}.glb`, `${id}.lod1.glb`]) {
    const path = `public/assets/creatures/${file}`;
    if (!fs.existsSync(path)) { fail(`${file} is missing`); continue; }
    const doc = await io.read(path);
    for (const name of doc.getRoot().listMaterials().map((m) => m.getName())) {
      materials++;
      // "waptia Cuticle" and "Olenoides continuous ventral body" both reduce to their suffix.
      const key = name.toLowerCase().startsWith(id) ? name.slice(id.length).trim().toLowerCase() : name.toLowerCase();
      const want = EXPECTED[key];
      if (!want) { fail(`${file}: material "${name}" is not classified by this check — add it to EXPECTED`); continue; }
      const got = slotFor(name);
      if (got !== want) fail(`${file}: "${name}" classifies as ${got}, expected ${want}`);
      slotsUsed.add(got);
    }
  }
  // A creature with one slot cannot show a scheme at all: every material would take one colour.
  if (slotsUsed.size === 1) fail(`${id}: every material lands in the "${[...slotsUsed][0]}" slot, so schemes cannot vary it`);
}

console.log(`\n${ids.length} creatures (${assigned.length} with a scheme, ${ids.length - assigned.length} as authored) · ${schemeCount} schemes · ${materials} materials checked · ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
