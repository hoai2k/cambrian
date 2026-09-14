# Visitor stats

**The page:** `/stats/` — <https://games.hoai.net/cambrian/stats/> once deployed.
**The switch:** `GOATCOUNTER_SITE` in `src/shared/config-stats.ts`, set to `hoai` —
<https://hoai.goatcounter.com>.
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

The code is set (`hoai`), so counting starts on the next deploy. Two settings on GoatCounter's side
are worth doing, and neither affects whether visits are counted — only whether the dashboard can be
read from inside `/stats/`:

- *Settings → Sites that can embed GoatCounter* must list this site, or the frame is refused
  outright. On `hoai` it already does: the dashboard's `frame-ancestors` names `games.hoai.net`
  and `hoai2k.github.io`.
- *Settings → Dashboard viewable by* decides whether anything shows inside that frame. The frame
  carries no login — a browser will not send the GoatCounter session cookie to a frame on another
  domain, so on *Only logged in users* (the default, and where `hoai` stands) the frame shows a
  sign-in page however you are logged in on their site. *Anyone* makes it show. The third option,
  *Logged in users or with secret token*, works via `?access-token=…`, but the token would then sit
  in this public repository, which is only half a private dashboard.
- Either way the *Open this view in GoatCounter* link beside the frame carries the same filter and
  is the record. If the dashboard stays private, that link is the whole of `/stats/` that works,
  and the chips are still doing their job — they build the filtered URL.

To move to a different site, or to stop counting, change the one string. Empty is a supported
state, not a broken one: nothing is sent, and `/stats/` prints the setup steps instead of an empty
dashboard. A code that is not a code — most often the whole dashboard URL, pasted — is refused
loudly by `countEndpoint` rather than glued to `/count` and 404'd once per pageview with nothing on
screen to say why; `npm run stats` covers that case.

## The page

Two pages in one, because the honest answer differs before and after setup.

**Off:** the setup steps above, and no dashboard. This matters more than it looks. An empty
dashboard for a counter that was never switched on reads as *nobody has ever played these*, which
is a different and much more interesting claim than *we have not been counting*. The page is not
allowed to make the first one by accident.

**On:** one dashboard frame and a row of chips. The chips are `STATS_VIEWS`, and each one points
the frame at the same dashboard with a different `?filter=` — which GoatCounter's own dashboard
handler reads and applies to the whole view, so "Triassic Triumph" is every panel of the dashboard
about that game rather than a single number. One frame and not six: the question is *which of them,
and where from*, and six dashboards side by side answer it worse than one that can be pointed.
Beside the frame, every view also has a plain link out to GoatCounter, because the frame is a
convenience and their page is the record.

## The filters

Worth knowing exactly what `?filter=` does, because the obvious reading is wrong. GoatCounter turns
it into a `LIKE` and wraps it in `%` at *both* ends, matching the path **or the title**
(`PathFilterFromQuery`, their `filter.go`). Bare `/cambrian/devonian/` would therefore be a
substring search across titles as well as paths. Their parser also takes keywords out of the query,
and `pathFilter()` in `src/shared/config-stats.ts` always adds them:

| Filter | Means |
| --- | --- |
| `/cambrian/ at:start in:path` | that directory and everything under it — every Ancient Seas page |
| `/cambrian/ at:start at:end in:path` | that path and nothing else — the trilogy page alone |

So every chip is anchored to the front of the path and matched on the path alone. That is what lets
the trilogy page have a view of its own: it sits at `/cambrian/`, the directory the three games are
nested in, and only an `at:end` filter tells it apart from them.

The prefix is not optional. The whole site is published under `/cambrian/`, so the games are
recorded at `/cambrian/cambrian/`, `/cambrian/devonian/` and `/cambrian/triassic/`; a filter that
forgot it would match nothing and read as *nobody played the Devonian*.

**"All of it" is filtered too**, to `/cambrian/`. One GoatCounter site counts a whole domain, and
`hoai` counts all of `games.hoai.net` — so an unfiltered dashboard would quietly fold another game
into this trilogy's total. `npm run stats` models the matching and asserts that each view counts
what it claims and leaves out everything else, the other games on the domain included. The
unfiltered view is still one click away on GoatCounter's own page.

## What is counted

The games, and only the games: the trilogy page and the three eras. `installStats()` is called from
each one's entry (`src/*/main.tsx`) — after `selectEra` on the three game pages, so the page reads
the same way everywhere, though the module reads neither the era nor the asset base and so has
nothing to be too early for.

Nothing else counts. The specimen viewer, the dev workbench and `/stats/` itself are all secondary
pages, and a secondary page in the total makes it worse rather than fuller: the question here is
"is anyone I don't know playing these?", and a viewer visit is almost always mine. The viewer did
count briefly, and `npm run stats` now asserts that it does not, so it cannot drift back in.

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
| `src/shared/config-stats.ts` | The site code, the validators, `pathFilter()` and `STATS_VIEWS`. The one file to edit. |
| `src/shared/stats.ts` | `installStats()` — attaches the counter, and nothing else. |
| `stats/index.html` | The page. Its own small stylesheet, tokens copied from the game's. |
| `tools/stats-test.ts` | `npm run stats` — the config, the views, and that every entry installs the counter. |
| `tools/stats-smoke.mjs` | The same two states in a real browser, with `gc.zgo.at` intercepted so a smoke run never puts a pageview in anyone's dashboard. |
