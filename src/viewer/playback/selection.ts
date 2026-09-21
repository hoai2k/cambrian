/**
 * What the Animations pane plays when a body arrives on stage.
 *
 * The pane is a way of comparing *one motion* across bodies — how six animals hold a `Heavy`, what
 * each of them does at the top of a `Crawl` — and that only works if picking an animal does not
 * also pick the animation again. So the selection is sticky: the clip, where in it the reviewer
 * was, whether they had it paused, and the *Base pose* (which is a selection like a clip is, and
 * the one a reviewer comparing rest poses across bodies most wants to keep).
 *
 * **The intent is kept apart from what is playing, and that distinction is the whole of this
 * module.** Not every body has every clip: ask for `Crawl` on an animal that has none and it falls
 * back to the body's resting clip. What must *not* happen then is the fall-back being written down
 * as the new selection, because the next animal along may well have a `Crawl` and the reviewer
 * never changed their mind — that is the naive version of this feature and it loses the intent at
 * the first animal that lacks the clip. So `ClipIntent` is what was asked for and `Selection` is
 * what this body can give; a fall-back reports itself (`fellBack`) and leaves the intent alone.
 *
 * Two decisions follow from the same rule:
 *
 * - **A position too far into a clip is clamped to that clip's end, and the clamp lands on what
 *   plays rather than on the intent.** Clamped rather than wrapped, because these clips are not
 *   phases of one cycle: Ottoia's `Crawl` is 1.4 s where Hallucigenia's is 2.0 s, and wrapping
 *   1.8 s onto 0.4 s would jump the reviewer back to the start of a stride when what they were
 *   looking at was the end of one. Clamping lands on the nearest thing the shorter clip has to
 *   as far through as you were, and it is the rule the scrubber already uses. Because the clamp
 *   is applied to what plays and not written back, going on to a body whose clip is long enough
 *   returns to the 1.8 s that was asked for.
 * - **A fall-back starts at zero.** A time is a position in one particular clip, and carrying
 *   1.8 s of a `Crawl` into an `Idle` that was never asked for means nothing at all.
 *
 * Pause is carried through every one of those cases, including the fall-back and a body with no
 * clips at all: a reviewer stepping through frames does not want the next animal to swim off.
 *
 * Pure, and `npm run playback` is its check. The session's copy lives in `./store`.
 */

/** A clip as this decision needs to know it: its name, and how long it runs. */
export interface ClipInfo {
  name: string;
  duration: number;
}

/**
 * What the reviewer asked for. `clip: null` is the Base pose — the rig at rest, which every rigged
 * body has, so it is the one selection that never falls back.
 *
 * `time` is what was asked for rather than what any body could give: it is never clamped here, so
 * a pass over a body with a short clip does not shorten it for the bodies after that one.
 */
export interface ClipIntent {
  clip: string | null;
  time: number;
  paused: boolean;
}

/**
 * What the body leaving the stage was showing. Only a *model* swap has one — the same specimen's
 * twin or reduced model, loaded without clearing the stage — and it is what keeps that swap's
 * promise that the view and the frame are held, even while an intent this body cannot honour is
 * standing behind it. A change of specimen clears the stage first and so has none.
 */
export interface Playing {
  name: string;
  time: number;
  paused: boolean;
}

/** What this body will actually play. `clip: null` is the base pose, or nothing at all. */
export interface Selection {
  clip: string | null;
  time: number;
  paused: boolean;
  /** The intent named a clip this body has not got, so what is playing is not what was asked for. */
  fellBack: boolean;
}

/** The base pose is `''` to the scene (no action) and `null` here; one spelling in, one out. */
const asked = (intent: ClipIntent) => (intent.clip === '' ? null : intent.clip);

/**
 * Where a body goes when nothing else decides: its `Idle` where it has one, and otherwise the
 * first clip it carries in play order. `names` arrives ordered, so "first" is the pane's own order
 * rather than the file's.
 */
export function restingClip(names: readonly string[]): string {
  return names.includes('Idle') ? 'Idle' : names[0] ?? '';
}

/** A position inside one clip: never past its end, never before its start, never a non-number. */
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) return 0;
  return Math.min(Math.max(time, 0), Math.max(duration, 0));
}

/**
 * What to play on a body that has just loaded, given what was asked for, the clips it turns out to
 * carry (in play order) and — on a model swap only — what the body going off stage was showing.
 */
export function resolveSelection(
  intent: ClipIntent | undefined,
  clips: readonly ClipInfo[],
  playing?: Playing,
): Selection {
  const paused = intent?.paused ?? playing?.paused ?? false;
  const wanted = intent ? asked(intent) : undefined;
  // A clip the intent named and this body has not got: everything below reports that, whether it
  // ends up on the body's resting clip or on nothing at all.
  const missing = () => wanted != null && !clips.some((c) => c.name === wanted);

  // A static specimen — a prop, a raw generation with no rig. There is nothing to play and nothing
  // to fall back to, and the intent is untouched: the next animal still gets what was asked for.
  if (!clips.length) return { clip: null, time: 0, paused, fellBack: missing() };

  if (intent) {
    // The base pose is asked for by name and every rigged body has one, so it never falls back.
    if (wanted === null) return { clip: null, time: 0, paused, fellBack: false };
    const hit = clips.find((c) => c.name === wanted);
    if (hit) return { clip: hit.name, time: clampTime(intent.time, hit.duration), paused, fellBack: false };
  }

  // The intent cannot be honoured here (or there is none yet). A model swap holds what it was
  // showing, so the twin stands at the frame the authored body stood at and the difference between
  // the two reads as movement rather than as a cut back to the start.
  if (playing) {
    if (playing.name === '') return { clip: null, time: 0, paused, fellBack: missing() };
    const held = clips.find((c) => c.name === playing.name);
    if (held) return { clip: held.name, time: clampTime(playing.time, held.duration), paused, fellBack: missing() };
  }

  return { clip: restingClip(clips.map((c) => c.name)), time: 0, paused, fellBack: missing() };
}

/** Whether the intent names a clip this body has not got — what the pane says out loud. */
export function intentMissing(intent: ClipIntent | undefined, names: readonly string[]): boolean {
  if (!intent) return false;
  const wanted = asked(intent);
  return wanted != null && !names.includes(wanted);
}

/**
 * Whether a live playback time is the *intended* clip's own time, and so may be written back onto
 * the intent as the reviewer's position.
 *
 * This is the intent/playing split said about the position rather than the clip. A fall-back's
 * clock belongs to a clip nobody asked for, so letting it write back would quietly replace the
 * position that was asked for with wherever some other animal's `Idle` happened to be.
 */
export function tracksIntent(intent: ClipIntent | undefined, playingClip: string | null): boolean {
  if (!intent) return false;
  const wanted = asked(intent);
  return wanted != null && wanted === (playingClip === '' ? null : playingClip);
}
