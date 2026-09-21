import type { ClipIntent } from './selection';

/**
 * The session's playback selection: the clip a reviewer chose, where in it they were and whether
 * they had it paused. One for the page rather than one per specimen — the whole point of it is
 * that it crosses from one animal to the next.
 *
 * In memory only, like the sculpt, mark, mouth and bend stores: reloading the page is how you get
 * back to each body opening on its own `Idle`, and nothing here is a saved decision. It is
 * deliberately not `localStorage` — a viewer coming back tomorrow should not find the page paused
 * two thirds of the way through somebody's `Heavy`.
 *
 * What is stored is the *intent*, never the fall-back a body without that clip is given; see
 * `./selection` for why those have to be two different things.
 */
let intent: ClipIntent | undefined;

export const getIntent = () => intent;
export const setIntent = (next: ClipIntent) => { intent = next; };
