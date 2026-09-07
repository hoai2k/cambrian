import { ACTIVE_ERA } from '../content';
/**
 * Creature colour schemes.
 *
 * The Cambrian roster uses vertex pigment. Newer Devonian models also carry UV albedo;
 * the renderer measures the combined texture and vertex pigment before applying a scheme.
 * Normal maps, roughness and regional luminance remain intact when the hue changes.
 *
 * This file is deliberately free of Three.js so the schemes can be listed, exported and diffed
 * as plain data.
 *
 * On the colours themselves: no Burgess Shale animal preserves any pigment, so every scheme
 * here is interpretation, not evidence. The grounded end leans on what palaeoart normally
 * reasons from — melanin browns and greys, phaeomelanin red-browns, and the camouflage of
 * modern marine analogues (sandy and green stomatopod morphs, deep-water reds, countershading).
 * The three "structural colour" schemes are the exception with a fossil argument behind them:
 * Marrella's diffraction-grating striations and Wiwaxia's finely ridged sclerites have both been
 * read as iridescent, and Canadia is conventionally drawn with iridescent chaetae like a modern
 * polychaete. The bright end is unapologetically game art.
 */

/** The material families every creature's GLB is authored in. Not all creatures use all of them. */
export type Slot = 'body' | 'eyes' | 'fins' | 'legs' | 'accent' | 'underside';

export const SLOTS: readonly Slot[] = ['body', 'eyes', 'fins', 'legs', 'accent', 'underside'];

export const SLOT_LABEL: Record<Slot, string> = {
  body: 'Body',
  eyes: 'Eyes',
  fins: 'Fins & membranes',
  legs: 'Legs & bristles',
  accent: 'Spines & plates',
  underside: 'Underside',
};

/**
 * Which slot a GLB material belongs to, decided from its name. The roster shares one naming
 * convention ("<id> Dorsal cuticle", "Compound eye", "Thin swimming membranes", "Sclerotized
 * tips", "Soft appendages", "Gill filaments", …), so this classifies every shipped material
 * without a per-creature table and gives a new creature sensible slots for free.
 *
 * The slots are colour roles, not anatomy: gill filaments join the legs because they are the
 * same filamentous soft tissue to paint, and a soft-bodied animal's marginal tissue joins the
 * fins because that fringe is what a fin fold is. Order matters — the ventral and arthrodial
 * tests run before the membrane test, which would otherwise claim them, and the oral test runs
 * before the fallback, which would otherwise read "Oral cuticle" as body.
 *
 * tools/palette-test.mjs asserts the shipped materials still land where this file says they do.
 */
export function slotFor(materialName: string): Slot {
  const n = materialName.toLowerCase();
  if (/eye/.test(n)) return 'eyes';
  if (/ventral|arthrodial/.test(n)) return 'underside';
  if (/sclerotiz|oral|spine/.test(n)) return 'accent';
  if (/membrane|swimming|marginal/.test(n)) return 'fins';
  if (/bristle|appendage|endite|antenna|seta|gill|leg/.test(n)) return 'legs';
  return 'body';
}

export interface Scheme {
  id: string;
  name: string;
  /** One line for the dropdown's title text: where the colours come from. */
  note: string;
  /** null means "leave the authored vertex colours alone". */
  colors: Record<Slot, string> | null;
}

export const SCHEMES = ACTIVE_ERA.presentation.schemes;
export const CREATURE_SCHEMES = ACTIVE_ERA.presentation.creatureSchemes;

export const DEFAULT_SCHEME = SCHEMES[0].id;

/** The scheme a creature should be drawn in unless something overrides it. */
export const schemeForCreature = (creatureId: string): string => CREATURE_SCHEMES[creatureId] ?? DEFAULT_SCHEME;

/**
 * Schemes from an era other than the active one. The game never needs these — it only ever names
 * ids from its own pack — but the specimen viewer shows both eras' creatures on one page, and a
 * page is only ever "in" one era, so it registers the other era's list here. Ids are unique
 * across the packs apart from `default`, which means the same thing in both.
 */
const EXTRA: Scheme[] = [];
export function registerSchemes(list: readonly Scheme[]) {
  for (const s of list) if (!SCHEMES.some((a) => a.id === s.id) && !EXTRA.some((a) => a.id === s.id)) EXTRA.push(s);
}

export const scheme = (id: string): Scheme =>
  SCHEMES.find((s) => s.id === id) ?? EXTRA.find((s) => s.id === id) ?? SCHEMES[0];
