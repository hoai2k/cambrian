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
import { ANIMAL_ERA, ART_DIR, DEFAULT_VERSION, GAMES, REQUESTED, SLOTS, STAGE, TRILOGY_LOGO, isDelivered, parseVersion, sourceFor } from '../src/ancientseas/page';

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
eq(DEFAULT_VERSION, 2, 'the composed plate is what a visitor gets');
// The parameter is a way to look at the other draft, not something the page offers: no switcher.
const page = readFileSync('src/ancientseas/AncientSeas.tsx', 'utf8');
ok(!/VersionSwitch|as-foot/.test(page), 'neither version draws a link to the other');
ok(!/as-foot/.test(readFileSync('src/ancientseas/ancientseas.css', 'utf8')), 'and the switcher styles are gone with it');

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
/**
 * Each era's animals gather under that era's own title rather than being strung across the plate,
 * on both stages: a row of nine spread evenly reads as a row of nine, not as three games.
 */
for (const stage of ['desktop', 'mobile'] as const) {
  for (const id of GAMES.map((g) => g.id)) {
    const t = SLOTS.find((s) => s.game === id)![stage];
    const mine = SLOTS.filter((s) => s.kind === 'animal' && ANIMAL_ERA[s.id] === id);
    eq(mine.length, 3, `${id}: three animals, as every era has`);
    for (const a of mine) {
      const own = Math.abs(a[stage].x - t.x);
      const nearest = Math.min(...GAMES.filter((g) => g.id !== id).map((g) => Math.abs(a[stage].x - SLOTS.find((s) => s.game === g.id)![stage].x)));
      ok(own <= nearest, `${stage}: ${a.id} sits under ${id}, not under another era`);
    }
  }
}
eq(Object.keys(ANIMAL_ERA).sort(), SLOTS.filter((s) => s.kind === 'animal').map((s) => s.id).sort(), 'every animal is placed in an era');
// Nothing is tucked behind the big animal any more: no two animals of an era overlap.
for (const stage of ['desktop', 'mobile'] as const) {
  const animals = SLOTS.filter((s) => s.kind === 'animal');
  const box = (s: typeof animals[number]) => {
    const p = s[stage], h = (p.w * s.height / s.width) / STAGE[stage];
    return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - h / 2, y1: p.y + h / 2 };
  };
  for (let i = 0; i < animals.length; i++) for (let j = i + 1; j < animals.length; j++) {
    const a = box(animals[i]), b = box(animals[j]);
    const over = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    ok(!over, `${stage}: ${animals[i].id} and ${animals[j].id} do not sit on top of one another`);
  }
}
/**
 * A title's lettering is the one thing on the plate that must read at a glance, so no animal
 * crosses it. Measured as how much of the title's own area an animal covers rather than as any
 * touching at all: a cutout is a rectangle around a drawing that does not fill its corners, so a
 * body and a title may share a corner of their boxes and still be nowhere near each other. An
 * animal actually lying across a title covers a great deal more than this.
 */
const CORNER = 0.2;
// The three game titles, which is where the question arises: each has an animal arching over it.
// The trilogy title runs the whole width of the plate with the big animals hanging below it, and
// a box around all of that says nothing useful about whether they touch.
for (const stage of ['desktop', 'mobile'] as const) {
  for (const t of SLOTS.filter((s) => s.kind === 'title' && s.game)) {
    const p = t[stage], th = (p.w * t.height / t.width) / STAGE[stage];
    for (const a of SLOTS.filter((s) => s.kind === 'animal')) {
      const q = a[stage], ah = (q.w * a.height / a.width) / STAGE[stage];
      const ox = Math.max(0, (p.w + q.w) / 2 - Math.abs(p.x - q.x));
      const oy = Math.max(0, (th + ah) / 2 - Math.abs(p.y - q.y));
      const share = (ox * oy) / (p.w * th);
      ok(share <= CORNER, `${stage}: ${a.id} keeps off the ${t.id} lettering (${Math.round(share * 100)}% of it)`);
    }
  }
}
/**
 * And the case that made the titles move down in the first place: an era's big animal hangs
 * *above* its title rather than across it. Its box may reach into the top of the title's box,
 * which is the margin over the capitals, and no further.
 */
const BIG = { cambrian: 'anomalocaris', devonian: 'dunkleosteus', triassic: 'cymbospondylus' } as const;
for (const stage of ['desktop', 'mobile'] as const) {
  for (const [era, animalId] of Object.entries(BIG)) {
    const t = SLOTS.find((s) => s.game === era)!, a = SLOTS.find((s) => s.id === animalId)!;
    const th = (t[stage].w * t.height / t.width) / STAGE[stage], ah = (a[stage].w * a.height / a.width) / STAGE[stage];
    const animalBottom = a[stage].y + ah / 2, lettersTop = t[stage].y - th / 2 + th * 0.25;
    ok(animalBottom <= lettersTop, `${stage}: the ${animalId} hangs above the ${era} title (${animalBottom.toFixed(1)} vs ${lettersTop.toFixed(1)})`);
  }
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
ok(css.includes('aspect-ratio: 9 / 27'), 'the mobile stage is 9:27 in the stylesheet');
eq([STAGE.desktop, STAGE.mobile], [10 / 16, 27 / 9], 'and page.ts agrees');

// The withdrawn cutouts are gone from the page and from public/ (docs/image-requests.md says why).
for (const gone of ['animal-opabinia.webp', 'animal-cladoselache.webp', 'animal-mixosaurus.webp', 'animal-ammonoid.webp']) {
  ok(!REQUESTED.some((f) => f.endsWith(gone)), `${gone} is no longer asked for`);
  ok(!existsSync(`public/${ART_DIR}${gone}`), `${gone} is no longer shipped`);
}

/**
 * Arriving at a game from this page used to show the sea for a moment before the title screen
 * appeared, because the title waited for the creatures to stream in. It is drawn from the first
 * frame now, and it carries the boot progress bar itself once the wait outlasts WAIT_HINT — the
 * boot screen would be the title's own painting a second time over the title.
 *
 * The bar's window is a few hundred milliseconds on a warm machine, too narrow for a browser test
 * to hit reliably (see tools/ancientseas-smoke.mjs), so what is checked is the wiring.
 */
const app = readFileSync('src/app/App.tsx', 'utf8');
const title = readFileSync('src/app/Title.tsx', 'utf8');
const loading = readFileSync('src/app/Loading.tsx', 'utf8');
ok(/\{screen === 'title' && \(?\s*<TitleScreen/.test(app), 'the title screen is drawn whether or not the assets are in');
ok(!/screen === 'title' && loaded/.test(app), 'and nothing gates it on loaded any more');
ok(/bootSlow && screen !== 'title'/.test(app), 'the boot screen keeps off the title screen');
ok(/progress=\{bootSlow \? bootFraction : null\}/.test(app), 'the title gets a bar only once the wait is slow');
ok(/!loaded && progress !== null/.test(title), 'and draws it only while it is still loading');
ok(/WAIT_HINT = 700/.test(loading), 'slow means 700ms');
// `.loading` is the boot screen's own class — absolute, inset 0, its own background — so the
// title's loading line must not wear it, or the line draws itself as a panel over the painting.
ok(!/press-start \$\{loaded \? '' : 'loading'\}/.test(title), 'the title\'s loading line is not the boot screen');
ok(/press-start \$\{loaded \? '' : 'waiting'\}/.test(title), 'it says waiting instead');
ok(/\.press-start\.waiting/.test(readFileSync('src/app/styles.css', 'utf8')), 'and the stylesheet agrees');
// Three games means two era links on every title screen; they are a column, not two corners.
ok(/className="era-switches"/.test(title), 'the other eras stack rather than sitting on each other');

console.log(`ancientseas: ${passes} checks passed`);
