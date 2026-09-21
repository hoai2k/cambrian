# 11 · Touch and small screens

*Built. `src/shared/touch-play.ts` and `src/shared/small-screen.ts` are the rules, `npm run touch`
is the guard, `node tools/touch-browser.mjs` is the proof.*

Three games that ran only on a desktop. Not because anything in them needed one — the simulation is
renderer-free, the HUD is drawn in `em` off a single font size, and the shell is React — but because
there were exactly two ways to play, a controller and a mouse with a keyboard, and both of them are
hardware a phone does not have. This document is the third way, and what a small window changes.

The two halves are deliberately separate, and keyed on two separate classes on the shell. `.is-touch`
is set when a **finger** is what is working the page; `.layout-compact` when the **window** is small.
A desktop window dragged narrow is compact and gets no thumb pads; a tablet held upright is roomy and
still gets them. Answering the two questions together would have been wrong in both directions.

## The scheme

The mouse scheme already answered the hard question, so this is written the way that one is written
rather than invented from scratch. `MousePlay` reads *one* button three ways — a click is the bite, a
hold is the heavy, a travel is the camera — and tells them apart by what the press **did**, not by
which button it was on. A finger is the same problem with better hands: there are several of them,
they arrive and leave, and none of them hovers.

### Where a touch starts is what it is for

A touch is classified at its **down**, from the zone it landed in, and keeps that job until it lifts.
That one decision is what makes the multi-touch promise cost nothing: holding both pads while swiping
with another hand and tapping with a third finger compose with no special handling anywhere, because
each finger was answered when it arrived.

| Zone | What a finger there is |
| --- | --- |
| `water` — everything that is not a control | The game. Tap, double-tap, swipe, pinch. |
| `swim` — the pad, bottom left | Held, the animal swims forward. |
| `secondary` — the pad beside it | Held, one of four actions; swiped sideways, it becomes another. |
| the drawn buttons | Pause, travel, scores, and the four that walk the travel menu. |

### Over the water

**A tap is the bite**, and it fires on the **lift** — for the mouse's own reason, that until the
finger comes up it is not yet known to have stayed still. It bites wherever it lands, because biting
at the water ahead of you is a real move and is how you attack something you have not pointed at.

**A double-tap** is a second touch going down within `DOUBLE` of a tap lifting, and what it means
depends on what the first tap was over — which is the mouse's rule for its own held button, that a
pounce needs something to pounce *at*:

- over an animal it is the **heavy**: the pounce, the lunge, whatever that animal's heavy is;
- over open water it is the **dash**, aimed at that water and running for as long as the finger stays
  down, because the dash is as long as it is held and a finger is a thing you can hold. Moving that
  finger re-aims the dash rather than turning the camera, which is the right button's rule verbatim.

The first tap of a double-tap **still bites**, and that is a decision rather than a concession. The
alternative is to sit on every bite for `DOUBLE` seconds to find out whether a second tap is coming,
which taxes the common move to pay for the rare one; a bite a quarter of a second late is a bite that
missed. So a double-tap is strictly *additive* — bite, then pounce — which is a combination a player
would want anyway.

**A swipe** past `DRAG` of travel is the camera, and from then on that finger is only the camera.
Vertical as well as horizontal, and the vertical is load-bearing: forward is camera-relative, so a
lifted view and a held swim pad are the climb. That is why there is no up or down pad.

**A pinch** is the one gesture about a *pair* of fingers rather than either of them, and it exists
because zoom is otherwise unreachable — the mouse has a wheel, the pad has a stick click, a finger has
neither. Their separation is the zoom and their **centroid** is the camera, so a pair moving together
pans the view once rather than twice as fast as one finger would. Two fingers merely resting are not a
pinch; they are two taps that have not happened yet.

There is deliberately **no hold-to-heavy**, though the mouse has one. The mouse needs it: it has no
double-click in its vocabulary and a cursor sits exactly still when nobody is moving it. A finger has
neither property — it always drifts, and a slow deliberate swipe begins as a press that has not
travelled yet — so a hold threshold here would turn the start of every careful look into a pounce.
Touch gets its heavy from the double-tap instead.

### The secondary pad

One pad holding one of four things — **aim, guard, hide, sense** — chosen by swiping the pad itself
sideways. Four separate buttons would have taken four times the glass for a choice a player makes once
and keeps; and a swipe on a pad is the same rule as everywhere else in the scheme, that travel changes
what a touch means.

The ring is the **same four on every animal**. Filtering it by what the creature in hand actually does
is tempting and would be wrong: all four mean something for every body in all three games — what
*changes* is the guard and the hide, which is the point of them — and a ring whose length depends on
the animal is a ring whose muscle memory resets every time you pick a different one.

The choice is remembered (`Settings.secondary`), because a player who plays as a hider should not have
to swipe back to it every time they hatch. The pad carries arrows as part of its drawing rather than a
hint that goes away, and a one-off line says it can be swiped for the first couple of matches
(`Settings.touchMatches`) — a control that can be changed and never says so is a control nobody
changes.

### Where a touch is aiming

There is no cursor, so nothing hovers to aim along — but a *live* finger is a perfectly good
crosshair, and "whatever the crosshair is on is the target" is the rule the game already plays by. So
the last water touch's position is the aim point, and it **outlives the finger** by `AIM_HOLD`: the
bite fires on the lift, when the finger is already gone, so an aim point that vanished with it would
aim every tap at nothing. Past `AIM_HOLD` it lapses and aiming goes back to the middle of the screen.

Which is why **the reticle stays on in touch play** where it is off in mouse play, and why it moves:
the mouse has a cursor doing that job and so draws no reticle, a pad has no pointer at all and so
draws it dead centre where its aim axis is, and touch is the third case — it needs a mark to aim by,
standing where the player last pointed, and back in the middle once that has lapsed.

### Gestures and buttons are two channels

A **gesture** may never reach a menu action. That is the rule `tools/menu-bindings-test.ts` already
holds for the mouse and the reason for it is the same here: a tap aimed at the sea must not also answer
whatever a menu is asking.

But a handful of things in the game are reached by a button and cannot sensibly be reached by anything
else — travel opens a *menu*, which then has to be walked and taken; the scoreboard is a hold. So
those are **drawn buttons** (`ButtonZone`), which is a separate and explicitly enumerated channel: a
thing the player deliberately put a finger on, only drawn when it applies, with what it does written on
it. A menu that opened and could not be walked would be worse than no menu, so the four buttons that
walk the travel menu appear with it and go away with it.

Where the two channels differ from the mouse's rules is `ability`, `guard` and `sense`. The mouse may
not reach those because a mouse plays *beside* a keyboard and they have keys on it; a finger has no
keyboard to fall back on, so the ring reaches all three, one at a time. `rise` and `sink` are out of
reach for a different reason — the camera covers them, exactly as it does on a mouse.

### What the camera does

Touch takes the **follow camera**, for the same reason the mouse has it: with no second stick nothing
is steering the view frame to frame, so left alone it would stay pointing wherever the animal last
turned away from. It eases round behind the body and stands aside for `FOLLOW_HOLD` after a swipe.

It does **not** take the cursor's edge tilt (`edgePitch`). A hovering cursor is idle information — it
is somewhere whether or not the player is doing anything with it — and a finger is the opposite: it is
only on the glass while it is being used, and while it is, its travel is *already* the camera. Reading
its height as a tilt as well would have one gesture pulling the pitch two ways. Nor does it take the
pad's pitch drift, which would fight the hand.

### A gesture is timed by when it happened

`TouchPlay` reads each event's own `timeStamp` rather than the clock at the moment the handler runs,
and this is not a nicety. A tap is measured against `TAP_TIME` and a double-tap against `DOUBLE`, both
a few hundred milliseconds — so timing from the handler means any frame that took longer than that is
a frame in which the player's taps are silently reclassified as fingers resting. A main thread
stalling for half a second is not hypothetical on a phone (a chunk streaming in, a shader compiling),
and under a software renderer it is the normal case: a tap dispatched into one of those frames
measured **2.4 seconds** long and was thrown away. It was found by the browser harness and it would
have been a real dropped-input bug on a real slow device.

## The small-window layout

`layoutFor(w, h)` is compact below `COMPACT_W` (760) across or `COMPACT_H` (540) down, and each axis
catches a different shape. A phone **held up** is caught by its width; a phone **on its side** is 780
across, over the line, and is caught by its *height* at 360. Between them that is every phone, without
the width creeping up past a small tablet. Both figures sit clear of the breakpoints the stylesheet
already used (900 and 1000 across, 640 down), so the two reflows never fight.

It is a question about the **window and not the device**, which is what makes it checkable and is also
simply true: a desktop window pulled to that size wants the same layout for the same reasons.

The single cheapest correct lever is that the whole in-match HUD is drawn in `em` off one font size
(`.hud`, plus the two split-screen variants), so one number brings every panel, gauge, marker and menu
down together with its proportions intact. What is left is the handful of things that have to *move*
rather than shrink: the pads own the bottom-left corner, so the ability chips, the grip panel, the hint
and the death note go above them; the small buttons own the top-right, so the radar comes down.

The menus reflow in CSS at the same two figures, and the media query has to keep matching the
constants — the React side sets the class from them, and a query at a different number would give a
window one half of the compact layout and not the other. It is written as a query *as well as* a class
because the standalone pages have no React shell to set one, and because a stylesheet that only
reflows once JavaScript says so flashes the wide layout first.

### The roster's columns

`gridColumns` packs the whole roster into three rows, which is right on a laptop and absurd on a
phone: the Triassic's 26 animals come to nine columns, and nine columns of a 390-pixel window is a
36-pixel tile — a smudge under an ellipsis. `rosterCap` caps them instead, so the overflow becomes
**rows**, which a phone can scroll and a three-row grid cannot.

A cap and never a count: it only takes columns away, so a short roster lays out exactly as it always
did and a roomy window gets `Infinity`. And it is threaded through the pure grid model rather than
done in CSS, because three places have to agree about the number — the screen that draws the grid,
the cursor that walks it and the loader that guesses which portraits are wanted next. That
equivalence is the whole reason `roster-grid.ts` is a model in the first place.

### Things that only showed on a narrow window

Two of these were not touch bugs at all; a phone is just the first place anyone could see them.

**Every centred HUD panel was off-centre.** `.hint`, `.grip-panel`, `.notice`, `.threat-alert` and
`.death-note` are positioned `left: 50%` with `transform: translateX(-50%)`, and they animate in with
`rise-in`, whose last keyframe is `transform: none` — under `fill-mode: both` that keyframe keeps
applying after the animation ends, and the centring is gone for good. Every one of them has been
sitting with its *left edge* on the middle of the screen since it was written. On a wide window a
300-pixel hint half a screen to the right still looks vaguely central; on a 390-pixel phone it runs
straight off the edge. The fix is `rise-in-centred`, keyframes that carry the static transform too:
animating a property an element also sets statically means the keyframes have to include it.

**The picker stacked when it should have columned.** Every rule under 1000px read "not wide" as
"stack the picker into a column and scroll it", which is right at 900×1200 and wrong at 780×360 —
360 pixels of height is not something scrolling fixes, and the crew card ended up laid over the
roster. That case is keyed on the **aspect ratio**, because it is the shape that decides and no
single width tells 780×360 apart from 820×1180.

And one that was a touch bug: `.crew` is a **sticky** block at the bottom of the scrolling picker in
portrait. Stacked, it is simply the second thing in the column, so the name of what you picked and
the Lock In that is the only way on both sit below the fold — a player tapped a creature and nothing
they could see changed.

One case the old breakpoints got backwards is worth naming, because it was a real overlap rather than
a tightness: every rule below 1000px treated "not wide" as "stack the picker into a column and scroll
it", which is right at 900×1200 and wrong at 780×360 — there the window has 360 pixels of height and
no amount of scrolling makes a stacked roster and a stacked crew card fit, so the card ended up laid
over the roster. Keyed on the **aspect ratio** rather than a width, because it is the shape that
decides: 780×360 and 1400×420 want the same thing and no single width tells them apart from 820×1180.

### Portrait

The game runs in portrait and is not stopped from doing so — a screen that refused to draw until it
was rotated would be worse than a narrow one. `rotateHint` asks once, over the sea, and only past 3:2:
a phone held up is 2.16 and every tablet in portrait is 1.33, so it catches the shape that is actually
a problem and leaves alone the one that is merely taller than it is wide.

Two players on a tall window are now cut **top and bottom** rather than side by side (`splitAxis`,
read by `layoutRects`): two views 400 across and 1100 down are two slots, not two views, and every HUD
panel in them hangs off a corner a long way from the middle. The HUD follows the rects by percentage,
so it needed no telling.

### The viewport meta

The four game entry pages gained `viewport-fit=cover`, without which `env(safe-area-inset-*)` is
always zero and the pads and HUD would sit under a notch; the stylesheet was already using those
insets.

They also gained `maximum-scale=1, user-scalable=no`, and that one is a real accessibility cost taken
knowingly: **double-tap is a move in this game** — it is the pounce and the dash — so a browser that
answered it with its own zoom would take the move away. It is paid on the game pages only. The trilogy
page, the viewer and the stats page stay pinchable, and inside the game the view has its own
pinch-to-zoom on the camera.

## Where it lives

| File | What |
| --- | --- |
| `src/shared/touch-play.ts` | The whole scheme as a state machine over touch events. Pure: no DOM, no clock of its own. |
| `src/shared/small-screen.ts` | How small the window is, whether a finger is working it, the rotate hint, the split axis. Pure. |
| `src/input/touch.ts` | `TouchPlay`, the DOM adapter, and `applyTouch` beside `applyMouse`. |
| `src/app/TouchPads.tsx` | The pads, the drawn buttons and the rotate line. |
| `src/app/use-small-screen.ts` | The one place in `src/app` that measures the window. |
| `src/app/styles.css` | The `.is-touch` and `.layout-compact` layer, appended last. |
| `src/app/roster-grid.ts` | `gridColumns(n, cap)`: the same model the screen and the cursor read, now with a ceiling. |
| `src/shared/controls.ts` | The `touch` scheme: every action named as a gesture. |
| `tools/touch-test.ts` | `npm run touch`. Every gesture, in order, with the clock passed in. |
| `tools/touch-browser.mjs` | Real touches in a real browser: the parts a headless test cannot vouch for. |

## Not done

- **A second touch player.** There is one screen and one pair of hands, so `'touch'` is a single seat
  by construction. Split-screen touch would need two sets of pads and a rule about which half of the
  glass belongs to whom, and it is not obviously a thing anybody wants.
- **The sculpt, mark, bend, stretch and mouth editors** in the viewer are pointer-driven art tools on
  a workbench page. They are untouched, and nothing about them is aimed at a phone.
