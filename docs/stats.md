# Visitor stats

**The page:** `/stats/` — <https://games.hoai.net/cambrian/stats/> once deployed.
**The switch:** `GOATCOUNTER_SITE` in `src/shared/config-stats.ts`, currently empty.
**The check:** `npm run stats`, plus `node tools/stats-smoke.mjs <outdir>` in a browser.

## The question this answers

Only one: *is anyone I don't know playing these, and where did they come from?* Three facts per
visit answer it — roughly where it came from, what linked it, what it was played on — and there is
no fourth. Nothing about how a game was played is recorded: not the creature picked, not the biome
reached, not how long a match lasted. That would need a collector of our own, a place to put it and
a reason to keep it, and none of those exist.

## Why a third-party counter

The site is static. GitHub Pages serves `dist/` and runs nothing, so there is no request log to
read and nowhere to write one. Counting therefore has to happen in the visitor's browser against
something that is not Pages. That is [GoatCounter](https://www.goatcounter.com): open source, a
free hosted tier, no cookies, no IP addresses stored, no tracker ID — which is why there is no
consent banner on any of the four pages, and why there does not need to be one.

## Switching it on

Five minutes, once:

1. Register a site at <https://www.goatcounter.com/signup>. The **code** you pick becomes the
   dashboard subdomain: `ancientseas` gives you `https://ancientseas.goatcounter.com`.
2. Put that code — the bare code, not a URL — in `src/shared/config-stats.ts`.
3. In GoatCounter, *Settings → Sites that can embed GoatCounter*, add `games.hoai.net`, so the
   dashboard can appear inside `/stats/` rather than only on theirs.
4. Push. The next deploy starts counting.

Empty is the honest default. Nothing is sent, `/stats/` says so and repeats these steps, and nobody
has to trust a subdomain this repository does not own. A code that is not a code — most often the
whole dashboard URL, pasted — is refused loudly by `countEndpoint` rather than glued to `/count`
and 404'd once per pageview with nothing on screen to say why; `npm run stats` covers that case.

## The page

Two pages in one, because the honest answer differs before and after setup.

**Off:** the setup steps above, and no dashboard. This matters more than it looks. An empty
dashboard for a counter that was never switched on reads as *nobody has ever played these*, which
is a different and much more interesting claim than *we have not been counting*. The page is not
allowed to make the first one by accident.

**On:** one dashboard frame and a row of chips. The chips are `STATS_VIEWS`, and each one points
the frame at the same dashboard with a different `?filter=` — which GoatCounter's own dashboard
handler reads and applies to the whole view, so "Triassic Triumph" is every panel of the dashboard
about that game rather than a single number. One frame and not four: the question is *which of
them, and where from*, and four dashboards side by side answer it worse than one that can be
pointed. Beside the frame, every view also has a plain link out to GoatCounter, because the frame
is a convenience and their page is the record.

The filters carry the published prefix — the games sit at `/cambrian/cambrian/`,
`/cambrian/devonian/` and `/cambrian/triassic/`, because the whole site is published under
`/cambrian/`. A filter that forgot the prefix would match nothing and read as *nobody played the
Devonian*, so `npm run stats` asserts the shape of every one.

The trilogy page has no chip, deliberately. It sits at `/cambrian/` itself, the directory the three
games are nested in, so every path a filter could name for it also sweeps them in. It is not
missing: it is a row in the dashboard's own *Pages* list, which already breaks each path out
separately in the unfiltered view.

## What is counted

The five pages a link from outside can land on: the trilogy page, the three games, and the specimen
viewer. `installStats()` is called from each one's entry (`src/*/main.tsx`) — after `selectEra` on
the three game pages, so the page reads the same way everywhere, though the module reads neither
the era nor the asset base and so has nothing to be too early for. The dev workbench is not
counted, and neither is `/stats/` itself.

Local play is not counted either: `count.js` skips `localhost`, `127.x`, private ranges and
`file://` on its own. That is what you want — the dashboard should be strangers, not you testing a
biome forty times.

Failure costs nothing. The script is appended `async` and its errors are swallowed: an ad blocker
eating `gc.zgo.at` is the common case, the visit goes uncounted, and the player never learns that
anything was meant to happen.

## Reading it honestly

- **Counting starts when it is switched on.** There is no backfill; Pages kept no log.
- **The numbers are a floor.** Ad blockers block GoatCounter, and a fair share of the people most
  likely to find a browser game about Cambrian arthropods run one. Treat a rise as real and an
  absolute count as "at least this many".
- **A pageview is not a player.** It is a page load. One person opening the Triassic four times to
  try four creatures is four pageviews, and the counter cannot tell that from four people.
- **Referrers are partial.** Plenty of traffic arrives with none — pasted links, apps, and any
  browser configured to send none. "Direct" mostly means "we don't know".

## Files

| File | What it is |
| --- | --- |
| `src/shared/config-stats.ts` | The site code, the validators, and `STATS_VIEWS`. The one file to edit. |
| `src/shared/stats.ts` | `installStats()` — attaches the counter, and nothing else. |
| `stats/index.html` | The page. Its own small stylesheet, tokens copied from the game's. |
| `tools/stats-test.ts` | `npm run stats` — the config, the views, and that every entry installs the counter. |
| `tools/stats-smoke.mjs` | The same two states in a real browser, with `gc.zgo.at` intercepted so a smoke run never puts a pageview in anyone's dashboard. |
