/**
 * Creature colour schemes.
 *
 * Nothing in the models is textured for colour: every creature's GLB carries a white
 * baseColorFactor and puts all of its colour in COLOR_0 vertex colours, with the only texture
 * being a normal map. That means a creature can be recoloured at runtime with no new art —
 * see src/render/recolor.ts, which keeps each vertex's luminance (all the mottling and baked
 * shading) and swaps the hue for the scheme colour of whichever slot the material belongs to.
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
 * Which slot a GLB material belongs to, decided from its name. The eight creatures share one
 * naming convention ("<id> Dorsal cuticle", "Compound eye", "Thin swimming membranes",
 * "Sclerotized tips", "Soft appendages", …), so this classifies all 33 shipped materials without
 * a per-creature table and gives a new creature sensible slots for free. Order matters: the
 * ventral and arthrodial tests run before the membrane test, which would otherwise claim them.
 * tools/palette-test.ts asserts the shipped materials still land where this file says they do.
 */
export function slotFor(materialName: string): Slot {
  const n = materialName.toLowerCase();
  if (/eye/.test(n)) return 'eyes';
  if (/ventral|arthrodial/.test(n)) return 'underside';
  if (/sclerotiz|oral plate|spine/.test(n)) return 'accent';
  if (/membrane|swimming/.test(n)) return 'fins';
  if (/bristle|appendage|endite|antenna|seta|leg/.test(n)) return 'legs';
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

/**
 * Ordered from grounded to loud, because that is how they are meant to be browsed. The first
 * entry is always the untouched model.
 */
export const SCHEMES: readonly Scheme[] = [
  {
    id: 'default',
    name: 'Default (as authored)',
    note: 'The vertex colours baked into the model. No recolouring.',
    colors: null,
  },

  // ---- grounded: melanin browns, greys and camouflage ----
  {
    id: 'burgess-umber',
    name: 'Burgess Umber',
    note: 'The authored palette, tidied: the warm umber most Burgess Shale art settles on.',
    colors: { body: '#4a2c15', eyes: '#0c0e0d', fins: '#6b4523', legs: '#5b3a1e', accent: '#2a1a0c', underside: '#33210f' },
  },
  {
    id: 'shale-rust',
    name: 'Shale Rust',
    note: 'Iron-oxide reds, the colour the fossils themselves weather to.',
    colors: { body: '#5e2f1c', eyes: '#120c0a', fins: '#7d452a', legs: '#6b3823', accent: '#331507', underside: '#40251a' },
  },
  {
    id: 'mudflat-sepia',
    name: 'Mudflat Sepia',
    note: 'Flat eumelanin browns — the least conspicuous thing on a mud seafloor.',
    colors: { body: '#40332a', eyes: '#0e0c0a', fins: '#5b4a3c', legs: '#4b3d32', accent: '#241c16', underside: '#514237' },
  },
  {
    id: 'silt-grey',
    name: 'Silt Grey',
    note: 'Grey eumelanin, matched to suspended silt.',
    colors: { body: '#4a4f4c', eyes: '#0d0f10', fins: '#666d68', legs: '#575d59', accent: '#2b2f2e', underside: '#626865' },
  },
  {
    id: 'sandflat-tan',
    name: 'Sandflat Tan',
    note: 'The pale sand morph modern stomatopods wear over rubble.',
    colors: { body: '#8a7350', eyes: '#16120c', fins: '#a08a63', legs: '#937c57', accent: '#55442c', underside: '#a1906d' },
  },
  {
    id: 'kelp-olive',
    name: 'Kelp Olive',
    note: 'The green morph of the same animals, for weed and algal cover.',
    colors: { body: '#4c4f2a', eyes: '#101208', fins: '#67693a', legs: '#565932', accent: '#2c2e17', underside: '#5d6038' },
  },
  {
    id: 'tidepool-ochre',
    name: 'Tidepool Ochre',
    note: 'Phaeomelanin ochre, warmer and a shade more visible.',
    colors: { body: '#7d5320', eyes: '#14100a', fins: '#9b6c2d', legs: '#8a5c25', accent: '#4a2f10', underside: '#906528' },
  },
  {
    id: 'bloodstone',
    name: 'Bloodstone',
    note: 'Deep red — the standard deep-water trick, since red light never gets down there.',
    colors: { body: '#61201f', eyes: '#140a0a', fins: '#7e2c2a', legs: '#6b2422', accent: '#33100f', underside: '#3c1615' },
  },
  {
    id: 'countershade',
    name: 'Countershade',
    note: 'Dark dorsal, pale ventral: the oldest camouflage there is, and a good look at the underside slot.',
    colors: { body: '#2f3a3d', eyes: '#0b0d0e', fins: '#8f9c99', legs: '#55635f', accent: '#1c2426', underside: '#b3bfba' },
  },
  {
    id: 'driftwood',
    name: 'Driftwood Pale',
    note: 'Low-pigment and bleached, the way cave and deep shelf animals go.',
    colors: { body: '#9a8f7e', eyes: '#1a1613', fins: '#b3a894', legs: '#a49883', accent: '#6b6153', underside: '#b9af9d' },
  },

  // ---- naturalistic, with a bit of signal in it ----
  {
    id: 'reef-copper',
    name: 'Reef Copper',
    note: 'Warm copper carapace over a lighter belly. Reads well against teal water.',
    colors: { body: '#8a4a22', eyes: '#150e09', fins: '#b4682f', legs: '#9c5626', accent: '#4e2610', underside: '#a76432' },
  },
  {
    id: 'horseshoe-bronze',
    name: 'Horseshoe Bronze',
    note: 'The muted bronze of a living horseshoe crab.',
    colors: { body: '#6a5326', eyes: '#14110a', fins: '#8a713a', legs: '#77602e', accent: '#3d2f13', underside: '#8d7a44' },
  },
  {
    id: 'mantis-green',
    name: 'Mantis Green',
    note: 'Camouflage green body, amber signal spines — straight off a mantis shrimp.',
    colors: { body: '#2f6b3c', eyes: '#0d1a10', fins: '#47935a', legs: '#397a48', accent: '#d08a2a', underside: '#58a06a' },
  },
  {
    id: 'seagrass-teal',
    name: 'Seagrass Teal',
    note: 'Cool blue-green, tuned to disappear into the water column.',
    colors: { body: '#235e58', eyes: '#0a1614', fins: '#3a827a', legs: '#2c6d66', accent: '#12403c', underside: '#468f86' },
  },
  {
    id: 'anemone-plum',
    name: 'Anemone Plum',
    note: 'Purple body with a brighter fringe, the way many anemones and flatworms go.',
    colors: { body: '#5b2f52', eyes: '#140a13', fins: '#7d4470', legs: '#6a3860', accent: '#a8618f', underside: '#6f4266' },
  },
  {
    id: 'coral-blush',
    name: 'Coral Blush',
    note: 'Soft pink-red, common in shallow-reef shrimp.',
    colors: { body: '#a85a53', eyes: '#1a0f0e', fins: '#cd7d72', legs: '#b96962', accent: '#6d3230', underside: '#c8817a' },
  },
  {
    id: 'amber-lantern',
    name: 'Amber Lantern',
    note: 'Translucent amber with brighter membranes, like a lit-up planktonic shrimp.',
    colors: { body: '#7a5a2e', eyes: '#120e08', fins: '#c79a4a', legs: '#8d6a37', accent: '#e0b45c', underside: '#a07f42' },
  },

  // ---- structural colour: the three with an actual fossil argument ----
  {
    id: 'marrella-sheen',
    name: 'Marrella Sheen',
    note: "The diffraction-grating reading of Marrella's striations: teal shield, magenta spines.",
    colors: { body: '#1f5f6b', eyes: '#0a1618', fins: '#2f8391', legs: '#2a7280', accent: '#b0499c', underside: '#3d94a2' },
  },
  {
    id: 'wiwaxia-nacre',
    name: 'Wiwaxia Nacre',
    note: "Pearl and opal, from the fine ridging on Wiwaxia's sclerites.",
    colors: { body: '#6d7b86', eyes: '#14181c', fins: '#93a3ad', legs: '#7d8c97', accent: '#cdb9d6', underside: '#9fadb6' },
  },
  {
    id: 'canadia-iridium',
    name: 'Canadia Iridium',
    note: 'Bronze-and-green shifting bristles, as modern polychaete chaetae do it.',
    colors: { body: '#37453a', eyes: '#0d120e', fins: '#5f7a5c', legs: '#b5924a', accent: '#7fb08a', underside: '#4c5c4d' },
  },

  // ---- game art: loud on purpose ----
  {
    id: 'lagoon-neon',
    name: 'Lagoon Neon',
    note: "The game's own palette: lagoon body, ember spines.",
    colors: { body: '#175d5a', eyes: '#061114', fins: '#61f2d5', legs: '#2a8f83', accent: '#ffb36b', underside: '#3fb5a4' },
  },
  {
    id: 'ember-bloom',
    name: 'Ember Bloom',
    note: 'Hot ember gradient, brightest at the edges.',
    colors: { body: '#8f2f14', eyes: '#170805', fins: '#ffb36b', legs: '#c05421', accent: '#ffd9a0', underside: '#d4762f' },
  },
  {
    id: 'coral-flare',
    name: 'Coral Flare',
    note: 'Coral and pink, the loudest reading of the brand palette.',
    colors: { body: '#b52f45', eyes: '#1a070c', fins: '#ff5b6e', legs: '#d63f56', accent: '#ff9ac2', underside: '#e8687d' },
  },
  {
    id: 'toxic-bloom',
    name: 'Toxic Bloom',
    note: 'Algal-bloom greens with a highlighter edge.',
    colors: { body: '#3f6b12', eyes: '#0f1505', fins: '#a8e02a', legs: '#5e9418', accent: '#e8ff6b', underside: '#7ab428' },
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    note: 'Deep violet with a lilac rim. Very legible against warm water.',
    colors: { body: '#3b2a7a', eyes: '#0d0a1c', fins: '#7d5cf0', legs: '#5240a8', accent: '#c8a2ff', underside: '#6a54c8' },
  },
  {
    id: 'magma',
    name: 'Magma',
    note: 'Charred body, molten fringe.',
    colors: { body: '#4a1206', eyes: '#180603', fins: '#ff7a1a', legs: '#a32d08', accent: '#ffe14a', underside: '#d2500f' },
  },
  {
    id: 'arctic-signal',
    name: 'Arctic Signal',
    note: 'Near-white body with a single coral warning colour.',
    colors: { body: '#cfe6ef', eyes: '#0d1a20', fins: '#7fd4ee', legs: '#a9d3e2', accent: '#ff5b6e', underside: '#e6f4f9' },
  },
  {
    id: 'prism-burst',
    name: 'Prism Burst',
    note: 'One hue per slot. Not subtle; useful for telling the slots apart.',
    colors: { body: '#2f7fd6', eyes: '#101828', fins: '#ff5b6e', legs: '#ffb36b', accent: '#61f2d5', underside: '#b06bff' },
  },
];

export const DEFAULT_SCHEME = SCHEMES[0].id;

export const scheme = (id: string): Scheme => SCHEMES.find((s) => s.id === id) ?? SCHEMES[0];
