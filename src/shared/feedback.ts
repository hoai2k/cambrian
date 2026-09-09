/**
 * Sending a piece of feedback. Nothing in here draws anything — `src/app/Feedback.tsx` is the
 * button and the dialog, and this is what it calls.
 *
 * IT IS OFF UNTIL AN ENDPOINT IS BUILT IN. With none configured `feedbackEnabled()` is false and
 * the button never renders, so `npm run dev`, the headless tools and any fork behave exactly as
 * they did before this existed. That is the same arrangement the invite gate uses in the other
 * repository, and for the same reason: switched off should be indistinguishable from absent, and
 * a deploy that loses its variable should publish a site without a button rather than one with a
 * button that fails.
 *
 * ONE ENDPOINT, EVERY GAME. `game` is a plain string that lands in a column in the sheet — the
 * era's own id, so the Cambrian and the Devonian are told apart without either knowing this file
 * exists. Nothing on the Apps Script side lists the games, so a third era, a stats page or another
 * project needs no change there at all: send a new string.
 *
 * NOTHING HERE IS A SECRET. The endpoint ships in the bundle, as the gate's does; anyone who opens
 * the site can read it. What stops it being abused is on the far side — see `tools/feedback/Code.gs`.
 */

/**
 * Where feedback goes. Compiled in at build time, empty everywhere else.
 *
 * Read defensively because `import.meta.env` only exists under Vite and the headless tools in
 * `tools/` bundle these modules for Node, where reading it directly would throw at import — the
 * same reason `base.ts` reads BASE_URL the way it does.
 */
const ENDPOINT: string =
  (import.meta as { env?: { VITE_FEEDBACK_ENDPOINT?: string } }).env?.VITE_FEEDBACK_ENDPOINT ?? '';

/**
 * The Turnstile site key, if the spam check is turned on. Empty is the normal state: the honeypot
 * and the clock below carry it, and the widget is only worth its weight once junk actually arrives.
 * Turning it on means setting this *and* `TURNSTILE_SECRET` in the Apps Script — a key here with no
 * secret there verifies nothing, and a secret there with no key here refuses everybody.
 */
export const TURNSTILE_KEY: string =
  (import.meta as { env?: { VITE_TURNSTILE_KEY?: string } }).env?.VITE_TURNSTILE_KEY ?? '';

export const feedbackEnabled = () => ENDPOINT !== '';

/** The floor the script enforces, mirrored here only so the dialog can hold the button until then. */
export const MIN_COMPOSE_MS = 3000;

export interface Feedback {
  /** Which game — the era id. Its own column in the sheet. */
  game: string;
  email: string;
  message: string;
  /** How long the dialog was open before they sent, in ms. Bots answer instantly. */
  elapsed: number;
  /** The honeypot. Always empty from a person; a hidden field a bot fills by walking the inputs. */
  hp: string;
  /** Turnstile's token, when the widget is configured. */
  turnstile?: string;
}

/**
 * What the browser can say about itself, so a report can be read against the machine it came from
 * — a rendering bug is a different bug on a phone and on a desktop, and nobody thinks to say which
 * they were on.
 *
 * ALL OF IT IS SELF-REPORTED. Apps Script hands its doPost the body and nothing else — no client
 * IP, no headers — so there is no server-side truth to check it against. Read it as "what the
 * browser said about itself". Same caveat, same shape, as the gate's `clientInfo`.
 */
function clientInfo() {
  const safe = <T>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };
  return {
    tz: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, ''),
    lang: safe(() => navigator.language, ''),
    screen: safe(() => `${screen.width}x${screen.height}`, ''),
    ua: safe(() => navigator.userAgent, '').slice(0, 300),
    ref: safe(() => document.referrer, '').slice(0, 300),
  };
}

/**
 * Who is writing, when that is already known.
 *
 * The games in the other repository sit behind an invite gate that stores a friend's name under
 * `gate.pass`, unnamespaced, so any page on the origin can read it. These two are not gated, so
 * this is empty today and will fill in by itself if they ever are — which is worth having for
 * nothing rather than asking a friend to type a name the site already knows.
 */
function who(): string {
  try {
    const raw = localStorage.getItem('gate.pass');
    return raw ? String((JSON.parse(raw) as { name?: string }).name ?? '') : '';
  } catch { return ''; }
}

/** The build this came from, so an old report can be told from a current one. */
function version(): string {
  return (import.meta as { env?: { VITE_BUILD?: string } }).env?.VITE_BUILD ?? '';
}

/**
 * Send it. Resolves true when the row landed.
 *
 * Posted as text/plain deliberately: a JSON content-type makes the browser send a CORS preflight
 * and an Apps Script web app cannot answer one. The body is JSON regardless — the header only
 * keeps the request "simple" so it goes straight through.
 */
export async function sendFeedback(f: Feedback): Promise<boolean> {
  if (!ENDPOINT) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        kind: 'feedback',
        game: f.game,
        email: f.email,
        message: f.message,
        elapsed: f.elapsed,
        hp: f.hp,
        turnstile: f.turnstile ?? '',
        who: who(),
        version: version(),
        client: clientInfo(),
      }),
    });
    return ((await res.json()) as { ok?: boolean }).ok === true;
  } catch {
    return false;
  }
}
