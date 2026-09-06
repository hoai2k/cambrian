/**
 * What every sound in the game is, which files back it, and where it fires from.
 *
 * The `kind` of each entry is the name the game plays it by — `audio.play(kind, ...)` — and the
 * files are the samples in `public/assets/sfx`. Keep this in step with SAMPLES in
 * `src/audio/audio.ts` and the MANIFEST in `tools/gen-sfx.mjs`; the workbench flags any sound
 * that is in the audio module but missing here.
 */
export interface SoundEntry {
  /** Name the game plays it by. */
  kind: string;
  /** Human label for the workbench list. */
  label: string;
  /** How and when the game uses it — shown on hover. */
  usage: string;
  /** World sounds are placed and attenuated by distance; the rest play flat. */
  spatial: boolean;
  /**
   * Extra takes kept in the library but not wired into SAMPLES — an earlier version held on to
   * as a backup. Swapping one in is a rename; the workbench plays them so they can be compared.
   */
  alts?: string[];
}

export interface SoundGroup { title: string; blurb: string; sounds: SoundEntry[] }

export const GROUPS: SoundGroup[] = [
  {
    title: 'Combat',
    blurb: 'Fired from sim events as bodies meet. All placed in the world, so they fade with distance.',
    sounds: [
      { kind: 'hit', label: 'Hit (light)', spatial: true, usage: 'Every landed attack. Chosen for strength ≤ 1.1 — above that the same event plays “hit-heavy” instead. Rate-limited to one every 45 ms, and a nearer hit can still cut in.' },
      { kind: 'hit-heavy', label: 'Hit (heavy)', spatial: true, usage: 'The same hit event when the blow lands hard (strength above 1.1) — a big creature connecting, or a fully charged heavy.' },
      { kind: 'parry', label: 'Parry', spatial: true, usage: 'A guarding creature deflects an incoming attack inside the parry window. Also kicks a short controller rumble for the defender.' },
      { kind: 'guardBreak', label: 'Guard break', spatial: true, usage: 'A guard is overwhelmed — stamina spent, or a heavy attack through a raised guard.' },
      { kind: 'stagger', label: 'Stagger', spatial: true, usage: 'A creature is knocked into the stagger state, either by a hard hit or by a shockwave ability landing nearby.' },
      { kind: 'grab', label: 'Grab', spatial: true, usage: 'Appendages clamp onto prey — the grab ability connecting, and the start of a swallow.' },
      { kind: 'pounce', label: 'Pounce', spatial: true, usage: 'A creature launches its lunge at a locked target. Used to reuse the hit sample; it has its own sound now.' },
      { kind: 'kill', label: 'Kill', spatial: true, usage: 'A creature is killed. Plays alongside the death sound of the victim.' },
      { kind: 'death', label: 'Death', spatial: true, usage: 'A creature dies. Full volume and unattenuated when it is your own specimen; distance-faded for anyone else on the reef.' },
      { kind: 'swallow', label: 'Swallow', spatial: true, usage: 'A much larger predator engulfs prey whole rather than chewing it down. Used to reuse the grab sample.' },
      { kind: 'disintegrate', label: 'Disintegrate', spatial: true, usage: 'A body too small to matter dissolves into particles instead of leaving a corpse. Used to reuse the escape sample.' },
      { kind: 'routed', label: 'Routed', spatial: true, usage: 'An opponent loses its nerve and breaks off the fight. Used to reuse the escape sample.' },
    ],
  },
  {
    title: 'Feeding',
    blurb: 'The most frequent sounds in the game by far — every creature on the reef grazes.',
    sounds: [
      { kind: 'eat', label: 'Eat', spatial: true, usage: 'Snacks taken on the swim-through, grazing the microbial mat, and feeding inside a bloom — from every creature in the world, up to twice a second each. This is the sound distance attenuation exists for.' },
      { kind: 'crunch', label: 'Crunch', spatial: true, usage: 'The same eat event when the mouthful is substantial (strength above 0.5) — chewing down something with a shell.' },
    ],
  },
  {
    title: 'Movement & abilities',
    blurb: 'Placed in the world like combat sounds.',
    sounds: [
      { kind: 'dodge', label: 'Dodge', spatial: true, usage: 'A dodge roll or dart. Also covers the two extra dodge-flavoured moves in the sim.' },
      { kind: 'burst', label: 'Burst', spatial: true, usage: 'A player creature triggers a speed burst.' },
      { kind: 'silt', label: 'Silt', spatial: true, usage: 'A retreating dodge along the bottom, or a burrowing creature kicking up sediment.' },
      { kind: 'ability', label: 'Ability', spatial: true, usage: 'A creature’s special move fires — the generic whoosh under every ability.' },
      { kind: 'sense', label: 'Sense', spatial: true, usage: 'The sonar-style sense pulse. Flat and full volume for your own pulse; attenuated when another creature pings.' },
      { kind: 'respawn', label: 'Respawn / hatch', spatial: true, usage: 'A creature hatches back into a nursery after dying (the sim reuses the moult state for the hatch-in). This event had no sound at all before.' },
    ],
  },
  {
    title: 'Player stings',
    blurb: 'About you specifically. Never attenuated, and never played for an AI creature.',
    sounds: [
      { kind: 'tierUp', label: 'Tier up', spatial: false, usage: 'Your specimen moults into the next tier. Distance-faded and quieter when an AI creature tiers up instead.' },
      { kind: 'hunted', label: 'Hunted', spatial: false, usage: 'A predator has locked onto you and the hunted meter fills. Previously played for every AI creature that got hunted too — a big part of the noise.' },
      { kind: 'escape', label: 'Escape', spatial: false, alts: ['escape-alt'], usage: 'You shake a hunter off and the hunted meter drains. The previous take is kept alongside it as escape-alt.mp3.' },
      { kind: 'noticed', label: 'Noticed', spatial: false, usage: 'Something has just spotted you, before it commits to the hunt. Used to borrow the (much bigger) hunted sting.' },
      { kind: 'heartbeat', label: 'Heartbeat', spatial: false, usage: 'Not an event — the audio module pulses this on its own whenever tension is above 0.2, faster the higher it goes.' },
    ],
  },
  {
    title: 'Menus',
    blurb: 'Played from the React shell, flat and at a fixed low volume.',
    sounds: [
      { kind: 'ui-move', label: 'UI move', spatial: false, usage: 'Moving the selection in a menu, changing creature, or switching mode.' },
      { kind: 'ui-confirm', label: 'UI confirm', spatial: false, usage: 'Confirming, readying up, opening a dialog, and pausing.' },
      { kind: 'ui-back', label: 'UI back', spatial: false, usage: 'Backing out of a screen, un-readying, closing a dialog.' },
      { kind: 'ui-join', label: 'UI join', spatial: false, usage: 'A new player joins at the roster screen.' },
      { kind: 'ui-start', label: 'UI start', spatial: false, usage: 'Starting a match, from the title screen and from the roster.' },
      { kind: 'won', label: 'Won', spatial: false, usage: 'The victory fanfare on the results screen.' },
    ],
  },
];

/** The long-form beds. These are not `play()` kinds — the game runs them as loops on their own bus. */
export const BEDS = [
  { file: 'ambient-reef', label: 'Ambient reef', usage: 'The always-on reef loop, faded in once it has loaded and left running for the whole match. Its own prompt asks for “faint clicks of small creatures”, so it contributes some of the background ticking.' },
  { file: 'giant-drone', label: 'Giant drone', usage: 'The tension bed. Its volume follows the tension level — silent at rest, up to 0.7 when a giant has you cornered.' },
];
