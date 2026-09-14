import type { Biome } from '../../sim/world';

export const BIOME_NAMES: Record<Biome, string> = {
  shallows: 'Sunlit Shallows', nursery: 'Nursery Reef', shelf: 'Open Shelf', forest: 'Sponge Forest', boulders: 'Boulder Field',
  flats: 'Microbial Flats', channel: 'The Channels', escarpment: 'The Escarpment', basin: 'Deep Basin',
};
/**
 * How dangerous each biome is meant to feel, 0 (relaxing) to 1 (deadly). Drives the music mood and
 * is the brief for the art: the calm end reads small and rounded, the deadly end large and angular;
 * everything in between is the standard reef look. See docs/redesign/04-infinite-ocean.md.
 */
export const BIOME_DANGER: Record<Biome, number> = {
  shallows: 0.08, nursery: 0.04, shelf: 0.4, forest: 0.5, boulders: 0.5, flats: 0.32, channel: 0.72, escarpment: 0.8, basin: 0.92,
};

/**
 * How deep the water is over each biome. The floor is the surface (40) less this, blended by the
 * biome weights, so leaving one biome for another is a slope you can feel (`depthProfile` in
 * src/sim/world.ts).
 *
 * Gentler than the other two on purpose. The Devonian runs a hatchling's thirty-four units to a
 * hundred and eleven and the Triassic is wider still, because in both of them depth is a cost the
 * player is spending — the climb for air. Nothing in the Cambrian breathes, so depth here is not a
 * price, it is a *reading*: enough of a step between neighbours that crossing into a biome shows
 * in the water over your head before the fog and the sand have finished changing. The whole column
 * goes from twenty-four to seventy-two, under three times over, where the Devonian's is nearly five.
 *
 * The shallows are the shallowest thing in the sea, as in every era. The rest was already varying
 * before this table — but incoherently, because the old profile carved and heaped by *distance*
 * while the biomes are a mosaic: the boulder fields averaged fifty-two units of water against the
 * escarpment's forty-six, so the drop at the reef front read as shallower than the rocks behind it
 * and depth told a player nothing about where they were. The shelf and the sponge forest keep the
 * depths they have always had, so the water most of a match is played in is unchanged.
 */
export const FLOOR_DEPTH: Record<Biome, number> = {
  nursery: 24, shallows: 28, boulders: 34, flats: 37, shelf: 41, forest: 45, channel: 52, escarpment: 58, basin: 72,
};

export const ATMOS: Record<Biome, { fog: string; density: number; sky: number; sun: number; sand: string }> = {
  shallows: { fog: '#1f8994', density: 0.82, sky: 2.1, sun: 3.5, sand: '#c8c3a0' },
  nursery: { fog: '#106572', density: 1.0, sky: 1.8, sun: 3.0, sand: '#a3a682' },
  shelf: { fog: '#0d5563', density: 1.0, sky: 1.7, sun: 3.0, sand: '#a3a682' },
  forest: { fog: '#0a4c52', density: 1.12, sky: 1.5, sun: 2.6, sand: '#8d8f6c' },
  boulders: { fog: '#0f5260', density: 1.0, sky: 1.7, sun: 3.0, sand: '#9a9a86' },
  flats: { fog: '#146470', density: 0.95, sky: 1.8, sun: 3.1, sand: '#8fa07a' },
  channel: { fog: '#08404f', density: 1.1, sky: 1.4, sun: 2.4, sand: '#7f8878' },
  escarpment: { fog: '#093c4b', density: 1.15, sky: 1.3, sun: 2.2, sand: '#7c8078' },
  basin: { fog: '#041d2b', density: 1.4, sky: 0.9, sun: 1.5, sand: '#5e6a70' },
};

export const SAND_COLORS:Record<Biome,string>={shallows:'#c8c3a0',nursery:'#a3a682',shelf:'#a3a682',forest:'#8d8f6c',boulders:'#9a9a86',flats:'#8fa07a',channel:'#7f8878',escarpment:'#7c8078',basin:'#5e6a70'};
export const FLORA_BASE:Record<string,string>={vauxia:'#c9a468',sac:'#c9a468',choia:'#b8a97c',thalli:'#7a6040',tuft:'#5d7a43'};
