import { ACTIVE_ERA } from '../content';
/**
 * The soundtrack: which tracks exist, and what plays next.
 *
 * One track opens every session; when it runs out the game rotates through the rest at random.
 * A track can also name the biomes it was written for — entering one of those cues it — which is
 * how the biome themes work: the calm theme for the shallows and nurseries, the danger theme for
 * the channels, escarpment and basin. A track whose file is missing drops out of the rotation.
 *
 * To add a track: drop `<name>.mp3` into `public/music` and add a line to the selected content pack’s music.ts.
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

/**
 * The active era's soundtrack. Resolved per call rather than captured at import: an era entry page
 * selects its era before it loads the app, and this module is reachable from the audio library,
 * which loads earlier still. Captured at import it would hand a Devonian session the Cambrian
 * soundtrack, opener and all.
 */
export const music = () => ACTIVE_ERA.audio.music;

/** Tracks whose file failed to load this session. They leave the rotation and stop cueing areas. */
export const MISSING = new Set<string>();
const available = () => music().filter((t) => !MISSING.has(t.name));
/**
 * The rotation is the tracks that belong nowhere in particular. A track that names biomes is
 * *reserved* for them: shuffling an area theme in at random would undo the point of having one,
 * and would strand the player hearing the abyss out in the sunlit shallows.
 */
const roaming = () => available().filter((t) => !t.biomes?.length);

/** The track written for `biome`, if one is loaded. */
export const themeFor = (biome: Biome | undefined): MusicTrack | undefined =>
  biome ? available().find((t) => t.biomes?.includes(biome)) : undefined;

/** The track that opens a session. */
export const openingTrack = (): MusicTrack => music().find((t) => t.opening) ?? music()[0];

/** Seconds of overlap when one track hands over to the next. */
export const CROSSFADE = 5;
/** Seconds the music fades up on the very first track of a session. */
export const FIRST_FADE = 4;

/**
 * How the score follows the player around.
 *
 * This is horizontal re-sequencing with hysteresis — the ordinary way to score areas when the music
 * is finished tracks rather than stems, and what an exploration game normally does. Three numbers
 * do the work:
 *
 * - `AREA_FADE`: a long crossfade, so the change reads as the water changing rather than as a track
 *   ending. Slow enough that neither track is ever the obvious event.
 * - `AREA_ENTER`: how long you have to be somewhere before it counts. Biome edges here are jagged
 *   and a player can cross one several times a minute, so without this, clipping the corner of the
 *   basin would start a fade nobody asked for.
 * - `AREA_LEAVE`: and how long you have to be *away* before the score gives the area up. Longer
 *   than the entry on purpose — dipping out and back is common, and that asymmetry is what stops
 *   the music oscillating along a boundary you happen to be working.
 *
 * The fade reverses: leave and come back while it is still running and the same two voices ramp
 * back the other way instead of restarting. Every track also remembers where it had got to, so
 * coming back to one resumes it rather than replaying its opening — which is what makes a short
 * excursion sound like a passage rather than a mistake.
 */
export const AREA_FADE = 7, AREA_ENTER = 3, AREA_LEAVE = 5;

/**
 * The track to play after `current`: a random pick from the rotation, with the one that has just
 * played excluded whenever there is anything else to choose, so nothing repeats back to back. Area
 * themes are not in this pool — the area system plays those, and takes them back when you leave.
 */
export function pickNext(current?: MusicTrack, rng: () => number = Math.random): MusicTrack {
  const pool = roaming();
  const choices = pool.length > 1 ? pool.filter((t) => t !== current) : pool;
  return choices[Math.floor(rng() * choices.length)] ?? pool[0] ?? music()[0];
}
