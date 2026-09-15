/**
 * Derive Tiktaalik's SEC height rows from a viewer sculpt, using the viewer's own warp.
 *
 *   node tools/devonian/creatures/tiktaalik/port-sculpt.mjs <sculpt.json>
 *
 * The first port of this sculpt solved each row against the *station table* — a windowed extreme
 * on a grid that is not the builder's — and corrected it proportionally three times over. That
 * metric cannot see a dip: a station reports the highest point in its window, so a curve that
 * humps and then troughs inside one window measures exactly as well as a smooth one, and the head
 * came out with a local maximum at y=-2.25 and a local minimum at y=-2.00, an indent in the snout
 * right in front of the eye.
 *
 * What the user actually approved is the preview, and the preview is `profileWarp` in
 * src/viewer/sculpt/profile.ts: at each axis it takes the base and edited dorsal/ventral curves,
 * puts the body's midline at the edited midline, and scales the half-height above and below it
 * independently. Applied to the builder's own rows that is one pass with nothing free in it, and
 * the rows land on a smooth curve because the curves they are read off are smooth. So this reads
 * `evaluate` out of the viewer module itself rather than reimplementing the Hermite, and prints
 * the table to paste into anatomy_v3.py.
 *
 * Widths are not touched: SEC's `w` column and the pectoral scales are the first port's and
 * measure within a few percent, and the snout's width is the one place the port knowingly departs
 * from the sculpt (see anatomy_v3.py).
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const out = path.join(ROOT, 'node_modules/.cache/sculpt-profile.mjs');
execFileSync('npx', ['esbuild', 'src/viewer/sculpt/profile.ts', '--bundle', '--platform=node',
  '--format=esm', '--outfile=' + out], { cwd: ROOT, stdio: 'pipe' });
const { evaluate } = await import(pathToFileURL(out).href);

const doc = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (doc.format !== 'cambrian-sculpt') throw new Error(process.argv[2] + ': not a cambrian-sculpt file');
// The export transposes the in-memory shape (curve.base/curve.edit rather than base.curve), so
// put it back before handing it to the viewer's own evaluate(). Base values keep the base axis and
// edited values their shifted one, exactly as the viewer holds them.
const stations = doc.stations.map((s) => ({
  axis: s.axis, headFraction: s.headFraction, shift: s.shift,
  tangent: { dorsal: s.dorsal.tangent ?? undefined, ventral: s.ventral.tangent ?? undefined, width: s.width.tangent ?? undefined },
  base: { dorsal: s.dorsal.base, ventral: s.ventral.base, width: s.width.base },
  edit: { dorsal: s.dorsal.edit, ventral: s.ventral.edit, width: s.width.edit },
})).sort((a, b) => a.axis - b.axis);

// The builder's own frame: anatomy_v3.physical_y, and the GLB axis is its negation.
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const physicalY = (y) => y + 1.10 * smooth((y + .70) / 2.15) + 1.0 * smooth((y - 1.45) / 2.98);

// The shipped table, before any sculpt: (y, half-width, half-height, section-centre z).
const SHIPPED = [[-2.80, .52, .040, -.010], [-2.63, .60, .135, .015], [-2.35, .67, .170, .020],
  [-1.9, .725, .200, .025], [-1.45, .75, .225, .035], [-1.05, .73, .300, .018], [-.68, .71, .365, 0],
  [-.2, .70, .420, 0], [.45, .68, .405, 0], [1.1, .62, .365, 0], [1.65, .54, .310, 0],
  [2.25, .32, .240, 0], [2.85, .14, .27, 0], [3.4, .055, .34, 0], [3.85, .025, .30, 0],
  [4.23, .009, .145, 0], [4.43, .0004, .003, 0]];
// The widths already in anatomy_v3.py; this file re-derives the height columns only, so that the
// diff it produces is strictly `h` and `z`. The widths measure within a few percent of the sculpt
// and carry no visible artefact, and the snout's is the one place the port knowingly departs from
// it (anatomy_v3.py's docstring says why).
const WIDTH = [.52, .6, .67, .725, .75, .73, .71, .7, .64451, .61662, .5172, .32, .1394, .0557, .02568, .00894, .0004];

// surf()'s own section: the trunk runs z-h .. z+h, the head -.015-.44h .. z+h, and the two blend
// over -1.10 .. -.45. A row carries one (h, z) pair, so both curves are solved from it together.
const headFraction = (y) => 1 - smooth((y + 1.10) / .65);
const dorsalOf = (h, z) => z + h;
const ventralOf = (h, z, head) => (z - h) * (1 - head) + (-.015 - .44 * h) * head;

const rows = [];
for (let i = 0; i < SHIPPED.length; i++) {
  const [y, , h, z] = SHIPPED[i];
  const a = -physicalY(y);
  const head = headFraction(y);
  const db = evaluate(stations, 'dorsal', 'base', a), vb = evaluate(stations, 'ventral', 'base', a);
  const de = evaluate(stations, 'dorsal', 'edit', a), ve = evaluate(stations, 'ventral', 'edit', a);
  const cb = (db + vb) / 2, ce = (de + ve) / 2;
  const up = (de - ce) / Math.max(db - cb, 1e-6), down = (ce - ve) / Math.max(cb - vb, 1e-6);
  // The viewer's warp, applied to this row's own dorsal and ventral rather than to vertices.
  const D = ce + (dorsalOf(h, z) - cb) * up;
  const V0 = ventralOf(h, z, head);
  const V = V0 >= cb ? ce + (V0 - cb) * up : ce - (cb - V0) * down;
  // D = z + h and V = (z-h)(1-head) + (-.015-.44h)head, solved for (h, z).
  const hn = (D * (1 - head) - .015 * head - V) / (2 - 1.56 * head);
  rows.push([y, WIDTH[i], hn, D - hn, { a, up, down, D, V }]);
}

const fmt = (v) => {
  let s = v.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
  if (s.startsWith('0.')) s = s.slice(1); else if (s.startsWith('-0.')) s = '-' + s.slice(2);
  return s === '' || s === '-' || s === '-0' ? '0' : s;
};
const col = (v, w, p = 5) => (typeof v === 'number' ? v.toFixed(p) : v).padStart(w);
// `scale` is one number, not two: the viewer's midline is the midpoint of the two curves, so its
// "above" and "below" ratios are algebraically the same (de-ve)/(db-vb). The section scales about
// a midline that itself moves to the edited one.
console.log([col('y', 6), col('axis', 8), col('scale', 8), col('centre', 9), col('dorsal', 9), col('ventral', 9), col('h', 9), col('z', 9)].join(' '));
for (const [y, , h, z, d] of rows) {
  console.log([col(y, 6, 2), col(d.a, 8, 3), col(d.up, 8, 4), col((d.D + d.V) / 2, 9), col(d.D, 9), col(d.V, 9), col(h, 9), col(z, 9)].join(' '));
}
console.log('\nSEC=[' + rows.map(([y, w, h, z]) => `(${fmt(y)},${fmt(w)},${fmt(h)},${fmt(z)})`).join(',') + ']');
