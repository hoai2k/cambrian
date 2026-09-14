/**
 * Keep the visitor counter out of a headless run.
 *
 * Every page of the site asks for GoatCounter's `count.js` (`src/shared/stats.ts`). In a browser
 * QA tool that is wrong twice over: it is a request to somebody else's server on every run, and on
 * a network that blocks it — a sandbox, CI, an offline machine — the browser logs "Failed to load
 * resource" as a *console error*, which is exactly what these tools watch for. One blocked counter
 * would then fail a check about creature meshes.
 *
 * Answered with an empty 200 rather than aborted: an abort is itself a console error, and what is
 * wanted is for the page to carry on as though the script were there and did nothing. Nothing is
 * counted either way — count.js skips localhost — so no dashboard notices.
 *
 * Call it on every page a browser tool opens, before navigating.
 */
export const silenceCounter = (page) => page.route('**gc.zgo.at/**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
