/**
 * The Size view of the pick screen: every animal where it lives in the water, drawn at its size.
 *
 * The list is a menu in reading order, and every tile in it is the same size — which says nothing
 * about the one rule the whole game is built on, that big eats small. This lays the same roster out
 * as a slice of sea instead: drifters under the surface, swimmers in open water with the largest
 * highest (which is where `columnY` keeps them in the game), and the bottom-dwellers standing on the
 * floor, each one as wide as the square root of its real length. Square root rather than linear so a
 * two-centimetre animal is still something a cursor can land on beside a forty-centimetre one; the
 * order of sizes is exact and the ratio is compressed, which is what a field guide's plate does too.
 *
 * Pure: it takes the roster and the box it will be drawn in and returns rectangles in that box's
 * pixels. The screen draws them and the cursor walks them (`depthStep`, through `spatial-nav`), so
 * the two always agree about where everything is — the same reason `roster-grid.ts` is a model.
 */
import { step, type Dir, type Rect } from './spatial-nav';

export type Band = 'surface' | 'water' | 'floor';
export type DepthSlot = { kind: 'creature'; id: string } | { kind: 'extra'; id: string };
export interface DepthItem { id: string; band: Band; length: number }
export interface DepthSpot extends Rect { slot: DepthSlot; band: Band | 'extra' }
export interface DepthLayout {
  /** In reading order — top to bottom, then left to right — which is also the order the cursor wraps in. */
  spots: DepthSpot[];
  /** Where each band starts, for the labels and the washes behind them. */
  bands: { band: Band; top: number; bottom: number }[];
  /** The waterline and the sea floor, in the box's pixels. */
  surfaceY: number;
  floorY: number;
}

/** Where an animal lives, from the traits the simulation already moves it by. */
export function habitatBand(def: { ground: boolean; drift?: boolean; swimStyle?: string }): Band {
  if (def.ground) return 'floor';
  if (def.drift || def.swimStyle === 'pulse') return 'surface';
  return 'water';
}

/** A portrait is 4:3; the name sits under it. */
export const PORTRAIT = 0.75;
export const LABEL_H = 20;
export const GAP = 10;
/** Room above the waterline for the band label, and sand below the floor line. */
export const TOP = 30;
export const SAND = 26;
export const SIDE = 18;
/** Nothing is drawn narrower than this, however small the animal: it has to be something to point at. */
export const MIN_W = 50;
export const EXTRA_W = 76;
/** A band with nothing in it still shows as water: the surface is always there. */
const EMPTY_BAND = 34;

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 1000) / 1000; };
const width = (len: number, k: number) => Math.max(MIN_W, k * Math.sqrt(Math.max(len, 0)));
const heightOf = (w: number) => w * PORTRAIT + LABEL_H;

interface Row { items: { item: DepthItem; w: number; h: number }[]; h: number; used: number }
function shelves(items: DepthItem[], k: number, avail: number): Row[] {
  const rows: Row[] = [];
  let row: Row = { items: [], h: 0, used: 0 };
  for (const item of items) {
    const w = width(item.length, k), h = heightOf(w);
    const need = row.items.length ? row.used + GAP + w : w;
    if (row.items.length && need > avail) { rows.push(row); row = { items: [], h: 0, used: 0 }; }
    row.used = row.items.length ? row.used + GAP + w : w;
    row.items.push({ item, w, h });
    row.h = Math.max(row.h, h);
  }
  if (row.items.length) rows.push(row);
  return rows;
}
const stack = (rows: Row[]) => rows.reduce((s, r) => s + r.h, 0) + Math.max(0, rows.length - 1) * GAP;

export function depthLayout(items: readonly DepthItem[], extras: readonly string[], box: { w: number; h: number }): DepthLayout {
  const W = Math.max(0, box.w - SIDE * 2);
  const extrasW = extras.length ? extras.length * (EXTRA_W + GAP) : 0;
  // Largest first in open water and at the surface; on the floor the small stand at the front, on
  // the floor line, and the big rise behind them.
  const byBand = (b: Band) => items.filter((i) => i.band === b).sort((a, c) => (c.length - a.length) || a.id.localeCompare(c.id));
  const surface = byBand('surface'), water = byBand('water'), floor = byBand('floor').reverse();
  const plan = (k: number) => {
    const s = shelves(surface, k, W - extrasW), wa = shelves(water, k, W), f = shelves(floor, k, W);
    const hs = Math.max(surface.length ? stack(s) : EMPTY_BAND, extras.length ? heightOf(EXTRA_W) : 0);
    const hw = water.length ? stack(wa) : EMPTY_BAND, hf = floor.length ? stack(f) : EMPTY_BAND;
    const widest = Math.max(0, ...items.map((i) => width(i.length, k)));
    return { s, wa, f, hs, hw, hf, fits: widest <= W && TOP + hs + GAP * 2 + hw + GAP * 2 + hf + SAND <= box.h };
  };
  // The largest scale at which the whole roster fits the box.
  let lo = 0, hi = Math.max(1, box.w);
  for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (plan(mid).fits) lo = mid; else hi = mid; }
  const p = plan(lo);

  const surfaceY = TOP, floorY = box.h - SAND;
  const sTop = surfaceY + GAP, sBot = sTop + p.hs;
  const fBot = floorY, fTop = fBot - p.hf;
  const wTop = sBot + GAP * 2, wBot = fTop - GAP * 2;
  const spots: DepthSpot[] = [];
  const lay = (rows: Row[], top: number, bottom: number, avail: number, from: 'top' | 'bottom' | 'spread') => {
    const slackY = Math.max(0, bottom - top - stack(rows));
    const between = from === 'spread' ? slackY / (rows.length + 1) : 0;
    let y = from === 'bottom' ? bottom : top + between;
    for (const row of rows) {
      const slack = Math.max(0, avail - row.used);
      const gapX = GAP + slack / (row.items.length + 1);
      let x = SIDE + slack / (row.items.length + 1);
      const rowTop = from === 'bottom' ? y - row.h : y;
      for (const { item, w, h } of row.items) {
        // A little unevenness inside the row's own height, from the animal's name, so a row reads
        // as animals in water rather than tiles on a shelf. The floor stays level: those stand on it.
        const drop = from === 'bottom' ? row.h - h : (row.h - h) * hash(item.id);
        spots.push({ slot: { kind: 'creature', id: item.id }, band: item.band, x, y: rowTop + drop, w, h });
        x += w + gapX;
      }
      y = from === 'bottom' ? rowTop - GAP : rowTop + row.h + GAP + between;
    }
  };
  lay(p.s, sTop, sBot, W - extrasW, 'top');
  lay(p.wa, wTop, wBot, W, 'spread');
  lay(p.f, fTop, fBot, W, 'bottom');
  extras.forEach((id, i) => {
    const x = SIDE + W - (extras.length - i) * (EXTRA_W + GAP) + GAP;
    spots.push({ slot: { kind: 'extra', id }, band: 'extra', x, y: sTop, w: EXTRA_W, h: heightOf(EXTRA_W) });
  });
  spots.sort((a, b) => (Math.round(a.y + a.h / 2) - Math.round(b.y + b.h / 2)) || (a.x - b.x));
  return {
    spots,
    bands: [{ band: 'surface', top: surfaceY, bottom: sBot + GAP }, { band: 'water', top: sBot + GAP, bottom: fTop - GAP }, { band: 'floor', top: fTop - GAP, bottom: box.h }],
    surfaceY, floorY,
  };
}

const sameSlot = (a: DepthSlot, b: DepthSlot) => a.kind === b.kind && a.id === b.id;

/** Where a cursor on `from` goes when the stick is pushed `dx`, `dy` — by position, never by list order. */
export function depthStep(layout: DepthLayout, from: DepthSlot, dx: number, dy: number): DepthSlot {
  const at = layout.spots.findIndex((s) => sameSlot(s.slot, from));
  if (at < 0) return layout.spots[0]?.slot ?? from;
  const dir: Dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  if (!dx && !dy) return from;
  return layout.spots[step(layout.spots, at, dir)].slot;
}
