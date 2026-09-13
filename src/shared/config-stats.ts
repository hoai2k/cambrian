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
export const GOATCOUNTER_SITE = '';

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
 * The pages worth drilling into, in the order /stats/ offers them. `path` is what goes to
 * GoatCounter's dashboard as `?filter=`, which its handler reads and applies to the whole view.
 *
 * The site is published under /cambrian/, so a visit to the Devonian is recorded as
 * `/cambrian/devonian/` and the filter has to say so. The trilogy page is not in this list: it
 * sits at `/cambrian/` itself, so every path a filter could name for it also matches the three
 * games underneath. It is not missing — it is a row in the dashboard's own Pages list, which is
 * where the unfiltered view already breaks every page out separately.
 */
export const STATS_VIEWS: readonly { id: string; name: string; blurb: string; path: string }[] = [
  { id: 'all', name: 'All of it', blurb: 'Every page together, broken out by path in the dashboard\u2019s own Pages list.', path: '' },
  { id: 'cambrian', name: 'Cambrian Conquest', blurb: '508 million years ago \u00b7 /cambrian/', path: '/cambrian/cambrian/' },
  { id: 'devonian', name: 'Devonian Domination', blurb: '375 million years ago \u00b7 /devonian/', path: '/cambrian/devonian/' },
  { id: 'triassic', name: 'Triassic Triumph', blurb: '240 million years ago \u00b7 /triassic/', path: '/cambrian/triassic/' },
  { id: 'viewer', name: 'Specimen viewer', blurb: 'The models, out of the game \u00b7 /viewer/', path: '/cambrian/viewer/' },
];
