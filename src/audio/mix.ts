/**
 * The mix rules: how loud a world sound is at a distance, and how often the same kind of sound
 * may retrigger. Shared by the audio module, the render engine, the audio workbench and
 * `tools/audio-mix-test.ts`, so all four agree on what the player actually hears.
 *
 * ## Distance
 *
 * Distances are measured in units of the listening view's own camera distance (`ref`), so a bite
 * sounds equally near-or-far at every magnification tier: a larva and a colossal predator both
 * hear "one screen away" as the same volume. The render engine feeds the result to
 * `audio.play(..., atten)`, which also uses it to roll off the highs — water eats high
 * frequencies over distance, so far-off snapping reads as a soft thud rather than a click.
 */
export const AUDIO_NEAR = 1.25;      // inside this much of the camera distance, full volume
export const AUDIO_RANGE = 9;        // beyond this many "near" radii, nothing is heard at all
export const AUDIO_ROLLOFF = 1.8;    // how steeply volume drops between near and range

/** Below this attenuation an event is dropped outright rather than played very quietly. */
export const AUDIBLE_FLOOR = 0.02;

/** Volume multiplier for a sound `d` world units away, heard by a view framed at `ref` units. */
export function distanceAtten(d: number, ref: number): number {
  const near = Math.max(0.5, ref * AUDIO_NEAR);
  const far = near * AUDIO_RANGE;
  if (d >= far) return 0;
  const roll = d <= near ? 1 : near / (near + AUDIO_ROLLOFF * (d - near));
  return roll * Math.min(1, (far - d) / (far * 0.6));   // linear tail so it truly reaches zero
}

/**
 * Shortest gap (ms) between two plays of the same kind. These are the events the sim can push
 * many times a second — grazing, trading blows, a burst re-triggering on every stick flick —
 * where a second copy inside the window adds noise rather than information. A louder (nearer)
 * sound still gets through the window; see `play()` in audio.ts.
 */
export const MIN_GAP: Record<string, number> = {
  eat: 90, crunch: 90, hit: 45, 'hit-heavy': 45, burst: 220, dodge: 120, silt: 200, stagger: 120,
};
