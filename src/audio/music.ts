/**
 * The soundtrack: which tracks exist, and what plays next.
 *
 * One track opens every session; when it runs out the game rotates through the rest at random.
 * A track can also name the biomes it was written for — entering one of those cues it — which is
 * how a location-driven score would work. No track names a biome yet, so today the rotation is
 * purely random, and `biomeHasTrack()` answers false for everything.
 *
 * To add a track: drop `<name>.mp3` into `public/music` and add a line here. Nothing else.
 */
import type { Biome } from '../sim/world';

export interface MusicTrack {
  /** File name in `public/music`, without the extension. Doubles as the display name. */
  name: string;
  /** Plays first, before the rotation starts. Exactly one track should be the opener. */
  opening?: boolean;
  /** Biomes this track belongs to. Entering one of them cues the track; see `pickNext`. */
  biomes?: Biome[];
}

export const MUSIC: MusicTrack[] = [
  { name: 'Tide of First Bones', opening: true },
  { name: 'First Tide' },
];

export const OPENING_TRACK = MUSIC.find((t) => t.opening) ?? MUSIC[0];

/** Seconds of overlap when one track hands over to the next. */
export const CROSSFADE = 5;
/** Seconds the music fades up on the very first track of a session. */
export const FIRST_FADE = 4;
/**
 * Shortest time between two biome-driven track changes. Biome edges are jagged and a player can
 * cross one several times a minute; without this the score would flip back and forth.
 */
export const BIOME_HOLD = 90;

/**
 * The track to play after `current`. A track written for `biome` wins if there is one; otherwise
 * it is a random pick from the whole soundtrack. The track just played is excluded whenever
 * there is anything else to choose, so nothing repeats back to back.
 */
export function pickNext(current?: MusicTrack, biome?: Biome, rng: () => number = Math.random): MusicTrack {
  const tagged = biome ? MUSIC.filter((t) => t.biomes?.includes(biome)) : [];
  const pool = tagged.length ? tagged : MUSIC;
  const choices = pool.length > 1 ? pool.filter((t) => t !== current) : pool;
  return choices[Math.floor(rng() * choices.length)] ?? MUSIC[0];
}

/** Whether entering `biome` should cue a track change — false while no track names a biome. */
export function biomeHasTrack(biome: Biome): boolean {
  return MUSIC.some((t) => t.biomes?.includes(biome));
}
