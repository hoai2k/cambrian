/**
 * The Ancient Seas Trilogy title page. Run: npm run ancientseas
 *
 * The page is data (src/ancientseas/page.ts) drawn by a small React shell, and what can go wrong
 * with it is all checkable here: a link to a page that is not there, a title painting that has
 * moved, copy that has drifted from the game's own, a requested picture with no brief behind it,
 * a slot asking the network for a file nobody delivered, or a version parameter that leaves the
 * page blank.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';
import { ART_DIR, DEFAULT_VERSION, GAMES, REQUESTED, SLOTS, STAGE, TRILOGY_LOGO, isDelivered, parseVersion, sourceFor } from '../src/ancientseas/page';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); passes++; };

// ---- the version parameter ----
eq(parseVersion(''), DEFAULT_VERSION, 'no parameter is the default');
eq(parseVersion('?version=1'), 1, '?version=1');
eq(parseVersion('?version=2'), 2, '?version=2');
eq(parseVersion('?version=3'), DEFAULT_VERSION, 'an unknown version falls back rather than drawing nothing');
eq(parseVersion('?version=two'), DEFAULT_VERSION, 'junk falls back');
eq(parseVersion('?foo=1&version=2'), 2, 'other parameters are ignored');
eq(DEFAULT_VERSION, 1, 'version 1 is the default');

// ---- the games: three, in order, each opening a page that exists and showing its own title art ----
const ERAS = { cambrian: CAMBRIAN, devonian: DEVONIAN, triassic: TRIASSIC } as const;
eq(GAMES.map((g) => g.id), ['cambrian', 'devonian', 'triassic'], 'the three games, oldest first');
for (const g of GAMES) {
  const era = ERAS[g.id];
  eq(g.title, era.title, `${g.id}: the title is the game's own`);
  ok(existsSync(`${g.path}index.html`), `${g.id}: links to an entry page that exists (${g.path || '/'})`);
  eq(g.art, era.assets.illustration, `${g.id}: shows the painting the game's own title screen shows`);
  ok(existsSync(`public/${g.art}`), `${g.id}: that painting is in public/`);
  eq(g.wordmark, era.assets.logo, `${g.id}: the wordmark is the game's own`);
  ok(existsSync(`public/${g.wordmark}`), `${g.id}: that wordmark is in public/`);
  eq(g.tagline, era.copy.tagline, `${g.id}: the tagline is the game's own`);
  ok(era.copy.taglineEm.startsWith(g.when), `${g.id}: "${g.when}" is how the game's own copy dates itself`);
}

// ---- version 2: every slot has a brief, and never asks for what has not been delivered ----
const requests = readFileSync('docs/image-requests.md', 'utf8') + readFileSync('docs/image-requests-history.md', 'utf8');
ok(REQUESTED.every((f) => f.startsWith(ART_DIR)), 'everything requested lives under one folder');
eq(new Set(REQUESTED).size, REQUESTED.length, 'no file is requested twice');
ok(SLOTS.filter((s) => s.id.endsWith('-b') || s.id.endsWith('-c')).every((s) => s.file === SLOTS.find((o) => o.id === s.id.slice(0, -2))?.file), 'a second plant of a kind is the same drawing, mirrored');
for (const f of REQUESTED) {
  const name = f.slice(ART_DIR.length);
  ok(requests.includes(name), `${name} has a brief in docs/image-requests.md (or a record in the history)`);
  eq(isDelivered(f), existsSync(`public/${f}`), `${name}: delivered.json agrees with public/ (npm run ancientseas:delivered)`);
}
ok(requests.includes(TRILOGY_LOGO.slice(ART_DIR.length)), 'the version-1 logo is requested');
eq(new Set(SLOTS.map((s) => s.id)).size, SLOTS.length, 'slot ids are unique');
for (const s of SLOTS) {
  const src = sourceFor(s);
  if (src.kind !== 'placeholder') ok(existsSync(`public/${src.src}`), `${s.id}: draws a file that exists (${src.src})`);
  if (s.standIn) ok(existsSync(`public/${s.standIn}`), `${s.id}: its stand-in is shipped`);
  for (const [name, p] of [['desktop', s.desktop], ['mobile', s.mobile]] as const) {
    ok(p.w > 0 && p.w <= 140, `${s.id} ${name}: a sensible width`);
    ok(p.x >= -10 && p.x <= 110 && p.y >= -10 && p.y <= 110, `${s.id} ${name}: on the stage`);
  }
  if (s.kind === 'title' && s.id !== 'trilogy') ok(s.game && GAMES.some((g) => g.id === s.game), `${s.id}: a game title opens a game`);
}
const titles = SLOTS.filter((s) => s.kind === 'title' && s.game).map((s) => s.game);
eq(titles, GAMES.map((g) => g.id), 'version 2 links to the same three games in the same order');
ok(SLOTS.some((s) => s.kind === 'animal') && SLOTS.some((s) => s.kind === 'plant'), 'animals and plants surround the titles');
for (const id of GAMES.map((g) => g.id)) {
  const t = SLOTS.find((s) => s.game === id)!;
  const near = SLOTS.filter((s) => s.kind === 'animal' && Math.abs(s.desktop.x - t.desktop.x) < 20);
  ok(near.length >= 3, `${id}: has its own animals round its title on the desktop stage (${near.length})`);
}
// Every title stays clear of every other title on both stages, whatever the pictures around them do.
const titleSlots = SLOTS.filter((s) => s.kind === 'title');
for (const stage of ['desktop', 'mobile'] as const) {
  for (let i = 0; i < titleSlots.length; i++) for (let j = i + 1; j < titleSlots.length; j++) {
    const a = titleSlots[i][stage], b = titleSlots[j][stage];
    const ratio = STAGE[stage]; // stage height as a fraction of its width
    const ah = (a.w * titleSlots[i].height / titleSlots[i].width) / ratio, bh = (b.w * titleSlots[j].height / titleSlots[j].width) / ratio;
    const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (ah + bh) / 2;
    ok(apart, `${stage}: ${titleSlots[i].id} and ${titleSlots[j].id} do not overlap`);
  }
}

// The stylesheet's stages are the ones the placements were laid out on.
const css = readFileSync('src/ancientseas/ancientseas.css', 'utf8');
ok(css.includes('aspect-ratio: 16 / 10'), 'the desktop stage is 16:10 in the stylesheet');
ok(css.includes('aspect-ratio: 9 / 25'), 'the mobile stage is 9:25 in the stylesheet');
eq([STAGE.desktop, STAGE.mobile], [10 / 16, 25 / 9], 'and page.ts agrees');

console.log(`ancientseas: ${passes} checks passed`);
