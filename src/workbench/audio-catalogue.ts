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
    title: 'Big bodies',
    blurb: 'The same events again, for a body over HUGE_LENGTH (6 m). The Devonian roster runs 4–11.5 m '
      + 'against the Cambrian\u2019s 1–3.9 m, and giants in either era are scaled well past it; without these '
      + 'a Titanichthys lands exactly like a larva. `heavy()` in the engine swaps them in by body length.',
    sounds: [
      { kind: 'hit-huge', label: 'Hit (huge)', spatial: true, usage: 'A landed blow where the attacker is over 6 m. Sits above hit-heavy, which is chosen by damage rather than size.' },
      { kind: 'crunch-huge', label: 'Crunch (huge)', spatial: true, usage: 'A substantial mouthful (strength above 0.5) taken by a body over 6 m — bony jaw plates rather than mouthparts.' },
      { kind: 'burst-huge', label: 'Surge (huge)', spatial: true, usage: 'A speed burst from a body over 6 m: displaced water rolling past rather than a whoosh.' },
      { kind: 'dodge-huge', label: 'Tail sweep (huge)', spatial: true, usage: 'A dodge by a body over 6 m — one heavy whump of water instead of a flick.' },
      { kind: 'death-huge', label: 'Death (huge)', spatial: true, usage: 'A body over 6 m going limp and sinking. Flat and unattenuated when it is your own specimen.' },
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

/**
 * Devonian Domination's own sounds. They live in `public/assets/devonian/sfx/` and are registered
 * over the shared table by the `/devonian/` entry (`src/content/devonian/sfx.ts`); the workbench
 * registers them too, so both eras are auditionable here. Everything not listed there — hits,
 * feeding, the surface, the menus — still comes from the shared library above.
 */
export const DEVONIAN_GROUPS: SoundGroup[] = [
  {
    title: 'Devonian · Domination',
    blurb: 'The era\u2019s mechanics: bone armour with a soft side, air breathing, dead water, territory and the standings. See docs/redesign/08-devonian-domination.md.',
    sounds: [
      { kind: 'armour', label: 'Armour deflect', spatial: true, usage: 'A bite lands on thick bony plate and does not get through. Replaces the parry sound when the era rules say the hit was turned by armour rather than timing.' },
      { kind: 'armourPierce', label: 'Armour pierce', spatial: true, usage: 'The same block, but the jaws shear through the plate — the parry event with enough strength behind it.' },
      { kind: 'gulp', label: 'Air gulp', spatial: false, usage: 'An air breather reaches the surface and refills. Fires the moment air returns to full, and hands the creature a short burst.' },
      { kind: 'airLow', label: 'Air low', spatial: false, usage: 'The uneasy pulse while an air breather is running out. A warning, so it is deliberately quiet.' },
      { kind: 'anoxia', label: 'Anoxia warning', spatial: false, usage: 'Dead water has drifted within 160 m of you. Played for each player near it, not placed in the world.' },
      { kind: 'jet', label: 'Shell jet', spatial: true, usage: 'A chambered-shell creature bursting: it jets rather than swims, so it replaces the burst sound for those bodies.' },
      { kind: 'withdraw', label: 'Withdraw', spatial: true, usage: 'A soft body pulling back into its shell. Registered but nothing emits it yet — the shells\u2019 guard is still to be wired.' },
      { kind: 'moult', label: 'Moult', spatial: false, usage: 'An arthropod splitting its shell to grow. Replaces the hatch sound on the moult event when the era rules are active.' },
      { kind: 'shoalJoin', label: 'Shoal join', spatial: false, usage: 'A small fish falls in beside you and joins your shoal.' },
      { kind: 'rangeClaim', label: 'Range claimed', spatial: false, usage: 'You take a stretch of water as your territory.' },
      { kind: 'rangeLost', label: 'Range lost', spatial: false, usage: 'Territory slips back to someone else.' },
      { kind: 'standingUp', label: 'Standing up', spatial: false, usage: 'A tick as your place in the standings improves. Registered but nothing emits it yet.' },
      { kind: 'dominant', label: 'Dominant', spatial: false, usage: 'You reach the top of the standings — the era\u2019s win sting.' },
      { kind: 'beach', label: 'Beach', spatial: false, usage: 'A limbed creature hauls itself into the shallows. Fires on the transition into beached, not out of it.' },
      { kind: 'shellCrush', label: 'Shell crush', spatial: true, usage: 'A crushing bite cracks a thick shell open.' },
      { kind: 'breach', label: 'Breach', spatial: true, usage: 'A fish driving hard at the surface leaves the water altogether — `canBreach` in the era rules, above BREACH_MIN_RISE and near full speed. The body then flies on gravity alone until it comes down.' },
      { kind: 'splash', label: 'Splash', spatial: true, usage: 'The landing at the end of a breach: back through the surface, which takes most of the fall out of the body. Strength follows how hard it came down.' },
    ],
  },
  {
    title: 'Devonian · Creature specials',
    blurb: 'One per special in `src/sim/devonian/specials.ts`. The engine plays `ability:<abilityId>` when a sample '
      + 'is registered for it and falls back to the shared ability sound otherwise, so a new special is silent-safe.',
    sounds: [
      { kind: 'ability:jawShear', label: 'Jaw shear', spatial: true, usage: 'Dunkleosteus. Enormous bony jaws slamming shut with a cutting shear.' },
      { kind: 'ability:runThrough', label: 'Run through', spatial: true, usage: 'Cladoselache. A hard acceleration straight past its target.' },
      { kind: 'ability:tuskLunge', label: 'Tusk lunge', spatial: true, usage: 'Onychodus. A long committed lunge ending in a jab.' },
      { kind: 'ability:crushBite', label: 'Crush bite', spatial: true, usage: 'Heavy tooth plates closing on something hard.' },
      { kind: 'ability:neckSnap', label: 'Neck snap', spatial: true, usage: 'A quick snapping bite with a fast turn of the head.' },
      { kind: 'ability:cheliceraeGrab', label: 'Chelicerae grab', spatial: true, usage: 'Jaekelopterus. Two large clawed appendages closing on prey.' },
      { kind: 'ability:tridentShove', label: 'Trident shove', spatial: true, usage: 'A blunt shove with a forked spine.' },
      { kind: 'ability:shieldPush', label: 'Shield push', spatial: true, usage: 'An armoured head butting forward.' },
      { kind: 'ability:armourFlank', label: 'Armour flank', spatial: true, usage: 'A small armoured fish biting at a rival\u2019s soft side.' },
      { kind: 'ability:brushDisplay', label: 'Brush display', spatial: true, usage: 'A bundle of spines snapping open as a threat display.' },
      { kind: 'ability:shoalDart', label: 'Shoal dart', spatial: true, usage: 'A small fish darting forward with its shoal.' },
      { kind: 'ability:limbHaul', label: 'Limb haul', spatial: true, usage: 'Tiktaalik. Heaving itself forward on its limbs in the shallows.' },
      { kind: 'ability:shellHover', label: 'Shell hover', spatial: true, usage: 'Water pushed steadily out of a siphon to hold position.' },
      { kind: 'ability:floorSweep', label: 'Floor sweep', spatial: true, usage: 'A flat fish sweeping its mouth through sediment.' },
      { kind: 'ability:filterGulp', label: 'Filter gulp', spatial: true, usage: 'Titanichthys. A huge slow mouth straining the water.' },
      { kind: 'ability:shellJet', label: 'Shell jet (special)', spatial: true, usage: 'The jet used as a special rather than a burst; shares the burst\u2019s two takes.' },
    ],
  },
];

/** Devonian long-form beds. */
export const DEVONIAN_BEDS = [
  { file: 'devonian/ambient-open-sea', label: 'Open sea', usage: 'The era\u2019s ambience: cold open water far from shore. Generated as a 22 s loop, but the loop table in `src/audio/audio.ts` is still shared, so the Devonian currently plays the Cambrian reef bed instead.' },
  { file: 'devonian/anoxia-drone', label: 'Anoxia drone', usage: 'A 12 s loop for the inside of a dead zone. Same story: generated and registered, not yet on a per-era loop bus.' },
];

/** The long-form beds. These are not `play()` kinds — the game runs them as loops on their own bus. */
export const BEDS = [
  { file: 'ambient-reef', label: 'Ambient reef', usage: 'The always-on reef loop, faded in once it has loaded and left running for the whole match. Its own prompt asks for “faint clicks of small creatures”, so it contributes some of the background ticking.' },
  { file: 'giant-drone', label: 'Giant drone', usage: 'The tension bed. Its volume follows the tension level — silent at rest, up to 0.7 when a giant has you cornered.' },
];
