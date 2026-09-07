import type { Scheme } from '../../shared/palettes';

/**
 * Devonian colour schemes. PLACEHOLDER: this file is replaced by the schemes distilled from the
 * palaeoart survey in docs/art/devonian-colour-research.md as soon as that lands. Until then two
 * grounded schemes keep the pack valid.
 */
export const SCHEMES: readonly Scheme[] = [
  { id: 'default', name: 'Default (as authored)', note: 'The vertex colours baked into the model. No recolouring.', colors: null },
  { id: 'placoderm-slate', name: 'Placoderm Slate', note: 'Blue-grey armour over a pale belly.', colors: { body: '#3f4f5b', eyes: '#0b0d10', fins: '#6a7a84', legs: '#55636c', accent: '#8c9aa2', underside: '#b9c1c3' } },
  { id: 'shelf-khaki', name: 'Shelf Khaki', note: 'Olive-khaki mottle for the shallows.', colors: { body: '#6b6b45', eyes: '#0e0f0a', fins: '#8d8c5f', legs: '#767552', accent: '#3e3f2a', underside: '#a9a77c' } },
];

export const CREATURE_SCHEMES: Record<string, string> = Object.fromEntries([
  'dunkleosteus', 'titanichthys', 'coccosteus', 'bothriolepis', 'gemuendina', 'doryaspis', 'michelinoceras', 'manticoceras',
].map((id) => [id, 'placoderm-slate']).concat([
  'cladoselache', 'stethacanthus', 'cheirolepis', 'rhinodipterus', 'onychodus', 'tiktaalik', 'acanthostega',
  'eldredgeops', 'walliserops', 'jaekelopterus', 'nahecaris', 'furcaster', 'palaeoisopus',
].map((id) => [id, 'shelf-khaki'])));
