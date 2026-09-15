import type { Scheme } from '../../shared/palettes';

/**
 * Triassic colour schemes: a first set drawn from the canonical poses in docs/triassic/canonical/
 * and the palaeoart survey behind them. Ordered grounded → naturalistic → bright; the first entry
 * is always the untouched model. These recolour the borrowed Devonian bodies until the era's own
 * models land, which is most of why they exist today.
 */
export const SCHEMES: readonly Scheme[] = [
  { id: 'default', name: 'Default (as authored)', note: 'The vertex colours baked into the model. No recolouring.', colors: null },
  { id: 'basin-slate', name: 'Basin Slate', note: 'Dark slate back over a pale belly with a paler throat: the big ichthyosaurs as countershaded open-water animals.',
    colors: { body: '#44525c', eyes: '#0c0e10', fins: '#38444c', legs: '#4c5a64', accent: '#2a3238', underside: '#d6dbd8' } },
  { id: 'reef-mottle', name: 'Reef Mottle', note: 'Olive-brown mottle over sand: a nothosaur lying on the bottom, and most of what waits there.',
    colors: { body: '#6b6444', eyes: '#0e0c08', fins: '#57503a', legs: '#7a7250', accent: '#3d3826', underside: '#b7ad8a' } },
  { id: 'gypsum-bone', name: 'Gypsum Bone', note: 'Bone-white plates edged in grey, the colour of the flats it lives on: Henodus, and any shell that wants to vanish there.',
    colors: { body: '#d8d2c2', eyes: '#141210', fins: '#b9b3a4', legs: '#c4bdac', accent: '#8a8478', underside: '#e8e3d6' } },
  { id: 'estuary-olive', name: 'Estuary Olive', note: 'Olive with dark dorsal banding and a pale throat — the shore lizards and the amphibian in the silt.',
    colors: { body: '#6a6b3f', eyes: '#12100a', fins: '#8a8a52', legs: '#5a5a34', accent: '#3a3a22', underside: '#a9a072' } },
  { id: 'needle-silver', name: 'Needle Silver', note: 'Silver flank, blue-grey back, a dark lateral line: the ray-finned fishes of a bright lagoon.',
    colors: { body: '#9aa8b0', eyes: '#0e1216', fins: '#7e8c94', legs: '#a4b0b8', accent: '#3a4a54', underside: '#d8e0e4' } },
  { id: 'ceratite-rib', name: 'Ceratite Rib', note: 'Cream shell with red-brown radial bands and a grey-pink body, the conventional Muschelkalk ammonoid.',
    colors: { body: '#d6c8a6', eyes: '#16100c', fins: '#b8a48a', legs: '#a48a7a', accent: '#8a3a24', underside: '#e4d8bc' } },
  { id: 'coleoid-glass', name: 'Coleoid Glass', note: 'Translucent grey-rose mantle with pale hooks and a dark eye: a squid before the ink.',
    colors: { body: '#b39aa4', eyes: '#0c0a0c', fins: '#c9b4bc', legs: '#d8c8cc', accent: '#e8e2dc', underside: '#e2d4d8' } },
  { id: 'hammerhead-moss', name: 'Hammerhead Moss', note: 'Moss green over a yellow belly for the grazer that lives in the meadow it eats.',
    colors: { body: '#5a7a3a', eyes: '#0c0e08', fins: '#4a6830', legs: '#6a8a48', accent: '#2c4020', underside: '#c8c070' } },
  { id: 'whorl-rust', name: 'Whorl Rust', note: 'Rust-brown back, cream belly, and ivory teeth the whorl has to show: the relict.',
    colors: { body: '#7a4a34', eyes: '#0e0a08', fins: '#5c3828', legs: '#8a5a44', accent: '#e8e0cc', underside: '#d4c4a8' } },
  { id: 'flipper-blue', name: 'Flipper Blue', note: 'Blue-grey with a white underside and dark flipper edges: the first plesiosaur as an open-water flyer.',
    colors: { body: '#4f6a8a', eyes: '#0a0e14', fins: '#34506c', legs: '#5c7898', accent: '#22364c', underside: '#dce6ee' } },
  { id: 'red-bed', name: 'Red Bed', note: 'Keuper red-brown with ochre bands — the colour of the shore, for anything that stands on it.',
    colors: { body: '#8a4a34', eyes: '#100c08', fins: '#a0603e', legs: '#7a4030', accent: '#d8a030', underside: '#c4926c' } },
];

/** Which scheme each creature is *proposed* in, for the viewer's dropdown and the borrowed bodies in play. */
/**
 * The scheme the game draws each animal in. **Empty but for one entry, on purpose.**
 *
 * Every Triassic animal used to name a scheme here, so nothing was ever drawn in the colours its
 * own builder gave it — the roster arrived pre-recoloured. An animal with no entry falls back to
 * its authored palette (`c.color`/`c.accent`, the fallback in `index.ts`), which is what a body
 * carries out of its own build, and that is the right default: the alternates are for a *player*
 * to choose and for the second seat on a shared creature to be told apart by, not for the animal
 * to wear before anyone has asked.
 *
 * Shonisaurus keeps `basin-slate` because it genuinely suits it and was chosen deliberately.
 */
export const CREATURE_SCHEMES: Record<string, string> = {
  shonisaurus: 'basin-slate',
};
