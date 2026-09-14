/**
 * The one value that turns visitor stats on, and the only one worth editing.
 *
 * The site is static — GitHub Pages serves `dist/` and runs nothing, so there is no request log to
 * read and no place to write one. Counting visits therefore has to happen in the visitor's browser,
 * against something that is not Pages. That something is GoatCounter
 * (https://www.goatcounter.com), an open-source counter with a free hosted tier.
 *
 * Setup, once, about five minutes:
 *
 *   1. Register a site at https://www.goatcounter.com/signup. The "code" you pick becomes the
 *      subdomain: code `ancientseas` gives you the dashboard https://ancientseas.goatcounter.com.
 *   2. Put that code below.
 *   3. In GoatCounter's Settings → "Sites that can embed GoatCounter", add `games.hoai.net` so
 *      /stats/ can show the dashboard inline.
 *   4. Push. The next deploy starts counting.
 *
 * Empty is the honest default: nothing is sent, /stats/ says so and repeats these steps, and nobody
 * has to trust a subdomain this repo does not own. Kept as a bare code rather than a full URL
 * because a full URL is the thing people paste by mistake, and half a URL glued to "/count" fails
 * silently — so `countEndpoint` refuses anything that is not a code.
 *
 * One site covers all four pages. GoatCounter records the *path* of every visit, so `/cambrian/`,
 * `/devonian/`, `/triassic/` and the trilogy page at `/` are told apart by filtering rather than by
 * keeping four separate counters, which is what lets /stats/ show the trilogy whole and then break
 * it down.
 */
export const GOATCOUNTER_SITE = 'hoai';

/**
 * Is a code shaped like one GoatCounter would have issued?
 *
 * Their codes are lowercase alphanumeric with hyphens. Anything else is a paste accident — most
 * often the whole `https://x.goatcounter.com/count` URL, which would otherwise be concatenated
 * into a nonsense endpoint that 404s once per pageview with nothing on screen to say why.
 */
export const isValidSite = (code: string): boolean =>
  typeof code === 'string' && /^[a-z0-9][a-z0-9-]{0,49}$/.test(code);

/** Where count.js sends a pageview. Null when unconfigured or malformed. */
export function countEndpoint(code: string = GOATCOUNTER_SITE): string | null {
  if (!code) return null;
  if (!isValidSite(code)) {
    console.error(
      `[stats] GOATCOUNTER_SITE is "${code}", which is not a GoatCounter code. `
      + 'Use the bare code — "ancientseas", not "https://ancientseas.goatcounter.com". '
      + 'See src/shared/config-stats.ts.');
    return null;
  }
  return `https://${code}.goatcounter.com/count`;
}

/** The dashboard for a code, for /stats/ to frame and link to. Null when unconfigured. */
export const dashboardUrl = (code: string = GOATCOUNTER_SITE): string | null =>
  isValidSite(code) ? `https://${code}.goatcounter.com` : null;

/**
 * A dashboard filter that means exactly one path, or exactly one directory.
 *
 * GoatCounter's `?filter=` is a `LIKE` against the path *and the title*, wrapped in `%` at both
 * ends unless told otherwise (`PathFilterFromQuery` in their filter.go). Left bare, `/cambrian/`
 * would therefore also match any page whose title happens to contain that text — and, more to the
 * point, it would not be anchored, so it is worth saying what is meant. Their parser takes
 * keywords out of the query: `in:path` drops the title half, `at:start` anchors the front, and
 * `at:end` the back. Prefix plus `in:path` is "this page and everything under it"; adding `at:end`
 * makes it that page and nothing else.
 */
export const pathFilter = (path: string, exact = false): string =>
  `${path} at:start${exact ? ' at:end' : ''} in:path`;

/**
 * The views /stats/ offers, in the order it offers them. `path` is the page or directory each one
 * means; `exact` marks the ones that are a single page rather than everything beneath it.
 *
 * Two things shape this list. The site is published under `/cambrian/`, so a visit to the Devonian
 * is recorded as `/cambrian/devonian/` and a filter that forgot the prefix would match nothing and
 * read as "nobody played it". And one GoatCounter site can hold more than one game — `hoai` counts
 * the whole of games.hoai.net — so *All of it* is `/cambrian/` and its contents rather than an
 * unfiltered dashboard, which would fold somebody else's game into this trilogy's total. The
 * unfiltered view is still one click away, on GoatCounter's own page.
 *
 * The trilogy page can have a view of its own because `at:end` exists: it sits at `/cambrian/`,
 * the directory the three games are nested in, so only an exactly-this-path filter tells it apart
 * from them.
 */
export const STATS_VIEWS: readonly {
  id: string; name: string; blurb: string; path: string; exact?: boolean;
}[] = [
  { id: 'all', name: 'All of it', blurb: 'Every counted Ancient Seas page together \u2014 the trilogy page and the three games.', path: '/cambrian/' },
  { id: 'trilogy', name: 'Trilogy page', blurb: 'The plate with the three games on it, and nothing under it \u00b7 the site root', path: '/cambrian/', exact: true },
  { id: 'cambrian', name: 'Cambrian Conquest', blurb: '508 million years ago \u00b7 /cambrian/', path: '/cambrian/cambrian/' },
  { id: 'devonian', name: 'Devonian Domination', blurb: '375 million years ago \u00b7 /devonian/', path: '/cambrian/devonian/' },
  { id: 'triassic', name: 'Triassic Triumph', blurb: '240 million years ago \u00b7 /triassic/', path: '/cambrian/triassic/' },
];
