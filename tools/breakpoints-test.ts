/**
 * The stylesheet's breakpoints agree with the constants the code decides the same layout by.
 * Run: npm run breakpoints
 *
 * The compact layout is decided twice: by `layoutFor` in src/shared/small-screen.ts (a class on the
 * shell, and every measurement the pick screen makes) and by media queries in the CSS, which have to
 * be queries as well as a class because the standalone pages have no React shell and because a
 * stylesheet that reflowed only once JavaScript said so would flash the wide layout first. The
 * queries restate `COMPACT_W`, `COMPACT_H` and `PICKER_WIDE` as literals — CSS has no way to import
 * them — so a window between the two answers would get one half of the compact layout and not the
 * other. This reads every `@media` in src/**\/*.css and holds each literal to its constant.
 *
 * How it knows which queries are the compact ones: every width and height breakpoint in the CSS
 * must be either one the constants produce or one listed below as belonging to something else. A
 * constant that moves then leaves its old literal behind as an unknown value, which fails here,
 * rather than as a stale number that happens to be near some other breakpoint.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { COMPACT_H, COMPACT_W, PICKER_WIDE, layoutFor, pickerSideBySide } from '../src/shared/small-screen';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };

const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const p = path.join(dir, name);
  return statSync(p).isDirectory() ? cssFiles(p) : p.endsWith('.css') ? [p] : [];
});

/** The breakpoints the constants produce, as a query writes them. `max-*` is inclusive, so "below 760" is `max-width: 759px`. */
const DERIVED: Record<string, { value: number; from: string }[]> = {
  'max-width': [{ value: COMPACT_W - 1, from: 'COMPACT_W' }, { value: PICKER_WIDE, from: 'PICKER_WIDE' }],
  'max-height': [{ value: COMPACT_H - 1, from: 'COMPACT_H' }],
};
/**
 * Breakpoints that belong to something other than the compact layout or the picker's columns: the
 * HUD and the roster tightening on a short window, the header collapsing, a phone's own tweaks,
 * and the viewer's and the trilogy page's own layouts. A value here is a decision that it is *not*
 * one of the constants, so it must never be one of them (asserted below).
 */
const UNRELATED: Record<string, number[]> = {
  'max-width': [430, 559, 560, 600, 700, 720, 860, 900, 1100],
  'max-height': [399, 449, 640, 660, 700, 730, 760, 820, 1010],
};
for (const [feature, values] of Object.entries(UNRELATED)) {
  for (const v of values) ok(!(DERIVED[feature] ?? []).some((d) => d.value === v), `${feature}: ${v} is listed as unrelated but is a constant's own breakpoint`);
}

const files = cssFiles('src');
ok(files.length > 3, `found the stylesheets (${files.length})`);
const seen = new Map<string, number>();
for (const file of files) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    const query = m[1].trim();
    for (const f of query.matchAll(/\((min|max)-(width|height)\s*:\s*([\d.]+)px\)/g)) {
      const feature = `${f[1]}-${f[2]}`, value = Number(f[3]);
      const derived = (DERIVED[feature] ?? []).find((d) => d.value === value);
      const unrelated = (UNRELATED[feature] ?? []).includes(value);
      ok(derived || unrelated,
        `${file}: @media ${query} — ${feature}: ${value}px is neither a constant's breakpoint (${(DERIVED[feature] ?? []).map((d) => `${d.from} → ${d.value}`).join(', ') || 'none for this feature'}) nor listed as unrelated`);
      if (derived) seen.set(derived.from, (seen.get(derived.from) ?? 0) + 1);
    }
  }
}
// Each constant is actually restated somewhere, or this check would pass by having nothing to hold.
for (const from of ['COMPACT_W', 'COMPACT_H', 'PICKER_WIDE']) ok((seen.get(from) ?? 0) > 0, `${from} has a breakpoint in the CSS (${seen.get(from) ?? 0})`);

// The compact query itself, in both stylesheets that reflow for it, is the constants' own OR.
const compactQuery = `(max-width: ${COMPACT_W - 1}px), (max-height: ${COMPACT_H - 1}px)`;
for (const file of ['src/app/plate.css']) ok(readFileSync(file, 'utf8').includes(`@media ${compactQuery}`), `${file} reflows at the compact layout (${compactQuery})`);
ok(files.some((f) => f.startsWith(path.join('src', 'app')) && readFileSync(f, 'utf8').includes(`@media ${compactQuery}`)), `the shell's stylesheet reflows at the compact layout (${compactQuery})`);
// And the edges: the query's inclusive bound is the function's exclusive one.
ok(layoutFor(COMPACT_W - 1, 900) === 'compact' && layoutFor(COMPACT_W, 900) === 'full', 'max-width is one pixel under COMPACT_W');
ok(layoutFor(1200, COMPACT_H - 1) === 'compact' && layoutFor(1200, COMPACT_H) === 'full', 'max-height is one pixel under COMPACT_H');
ok(!pickerSideBySide(PICKER_WIDE, 900) && pickerSideBySide(PICKER_WIDE + 1, 900), 'max-width: PICKER_WIDE is where the picker stacks');
// The short wide window puts the picker back beside the crew, and the stylesheet says so the same way.
ok(pickerSideBySide(780, COMPACT_H - 1) && !pickerSideBySide(500, COMPACT_H + 100), 'a short wide window is side by side, a tall narrow one is not');
ok(files.some((f) => readFileSync(f, 'utf8').includes(`@media (max-height: ${COMPACT_H - 1}px) and (min-aspect-ratio: 1/1)`)),
  'the stylesheet columns a short wide window on the same two facts');

console.log(`breakpoints: ${passes} checks passed`);
