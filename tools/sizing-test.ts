/**
 * The Cambrian roster plays at the animals' natural sizes, and *Equivalent sizing* is the option
 * that flattens it back to the one size it was authored at.
 *
 * Two things are being checked. That the default does what docs/research/cambrian-sizes.md says:
 * real order, real proportion, one hatching size for everyone, and a body of a given length with
 * exactly the health and speed the authored roster gives it. And that turning the option on is the
 * authored roster exactly — the authored lengths, the authored growth ladder, cubed-scale mass —
 * because it is offered as a comparison and a comparison is worth nothing if the other side moved.
 *
 * Usage: npm run sizing
 */
import { CREATURES, authoredCreature, creature, equivalentSizing, hasEquivalentSizing, setEquivalentSizing } from '../src/sim/creatures';
import { ACTIVE_ERA } from '../src/content';
import { TIER_SCALE } from '../src/sim/types';
import { LARVA_LENGTH, larvaLength, tierScale, tierForScale } from '../src/sim/tiers';
import sizes from '../src/content/cambrian/natural-sizes.json';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(64)} ${d}`); if (!ok) failed++; };
const ids = CREATURES.map((c) => c.id);
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// --- the authored roster is still there behind the option ---
check('the Cambrian offers the option', hasEquivalentSizing());
check('...and it starts off, so the roster is at its natural sizes', !equivalentSizing());
const authored = new Map(ids.map((id) => [id, authoredCreature(id).adultLength]));
check('the authored roster is the flat one it was written as',
  Math.max(...authored.values()) / Math.min(...authored.values()) < 1.6,
  `${Math.min(...authored.values())}–${Math.max(...authored.values())} units`);

// --- the table is the research, and covers the roster ---
const table = sizes.sizes as Record<string, { adultLength: number; speed: number; hp: number; poise: number }>;
check('every animal on the roster has an entry', ids.every((id) => !!table[id]), `${Object.keys(table).length} of ${ids.length}`);
check('...and the era hands the same table to the simulation',
  ids.every((id) => ACTIVE_ERA.naturalSizes?.[id]?.adultLength === table[id].adultLength));

// --- the roster: real order, real proportion, spread around the size the sea already held ---
{
  const on = new Map(ids.map((id) => [id, creature(id).adultLength]));
  const byLength = [...on.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const order = ['anomalocaris', 'tamisiocaris', 'cambroraster', 'burgessomedusa', 'odaraia', 'sidneyia'];
  check('the biggest animals are the biggest animals', order.every((id, i) => byLength[i] === id), byLength.slice(0, 6).join(' > '));
  check('...and Marrella is the smallest', byLength[byLength.length - 1] === 'marrella', byLength.slice(-3).join(' < '));
  const lo = Math.min(...on.values()), hi = Math.max(...on.values());
  check('the adults spread out', hi / lo > 3, `${lo.toFixed(2)}–${hi.toFixed(2)} units (x${(hi / lo).toFixed(1)})`);
  // The point of the constant: the average animal is the size the average animal already is, so the
  // roster spreads out around what the sea holds today rather than shrinking under a pinned top.
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const wasMean = mean([...authored.values()]), nowMean = mean([...on.values()]);
  check('...around the size the roster already averaged', near(nowMean, wasMean, 0.02), `${nowMean.toFixed(2)} against the authored ${wasMean.toFixed(2)}`);
  check('...so the biggest animal is bigger than anything the sea held before',
    hi > Math.max(...authored.values()) * 1.3, `largest ${hi.toFixed(2)} against the authored ${Math.max(...authored.values())}`);
  // The Devonian already puts a 16.3-unit body in the water, so that is the known ceiling.
  check('...and an Apex of it still fits in the water', hi * 2.6 < 16.3, `Apex ${(hi * 2.6).toFixed(1)} units`);
  check('...and nothing shrinks below a body worth swimming', lo > LARVA_LENGTH * 1.35, `smallest adult ${lo.toFixed(2)} against a ${LARVA_LENGTH} larva`);
}

// --- everything hatches the same length, and grows from there ---
{
  const hatch = ids.map((id) => creature(id).adultLength * tierScale(id, 0));
  check('every animal hatches the same length', Math.max(...hatch) - Math.min(...hatch) < 0.01,
    `${Math.min(...hatch).toFixed(2)}–${Math.max(...hatch).toFixed(2)} units`);
  check('...which is the larva length', near(Math.max(...hatch), LARVA_LENGTH, 0.01), `${LARVA_LENGTH}`);
  for (const id of ['anomalocaris', 'marrella'] as const) {
    const s = [0, 1, 2, 3, 4].map((t) => tierScale(id, t));
    check(`${id} grows without stalling or jumping`, s.every((v, i) => i === 0 || v > s[i - 1]), s.map((v) => v.toFixed(2)).join(' → '));
    check(`...and ${id} is adult at scale 1`, near(s[2], 1), `${s[2]}`);
    // The two moults to adult are one factor applied twice, the way the Devonian's are.
    check(`...by the same factor each moult`, near(s[1] / s[0], s[2] / s[1], 1e-9), `x${(s[1] / s[0]).toFixed(3)} then x${(s[2] / s[1]).toFixed(3)}`);
    check(`...and every rung reads back as itself`, s.every((v, t) => tierForScale(id, v) === t), s.map((v, t) => `${t}:${tierForScale(id, v)}`).join(' '));
  }
  check('the smallest animals hatch smaller rather than larger than they grow',
    ids.every((id) => larvaLength(creature(id).adultLength) <= creature(id).adultLength));
}

// --- a body of a given length is the body the authored roster made it ---
{
  // Health grows as scale^1.1 of the adult figure, so lifting the adult figure by the same power
  // leaves health at a given *length* untouched. Same for speed, which is linear in length.
  const at = (id: string, length: number, field: 'hp' | 'speed') => {
    const def = creature(id as never);
    const scale = length / def.adultLength;
    return field === 'hp' ? def.hp * Math.pow(scale, 1.1) : def.speed * scale;
  };
  setEquivalentSizing(true);
  const before = ids.map((id) => ({ id, hp: at(id, 2, 'hp'), speed: at(id, 2, 'speed') }));
  setEquivalentSizing(false);
  const after = ids.map((id) => ({ id, hp: at(id, 2, 'hp'), speed: at(id, 2, 'speed') }));
  const worst = (f: 'hp' | 'speed') => Math.max(...before.map((b, i) => Math.abs(after[i][f] / b[f] - 1)));
  check('a two-unit body has the health the authored roster gives it', worst('hp') < 0.02, `worst drift ${(worst('hp') * 100).toFixed(1)}%`);
  check('...and the speed it gives it', worst('speed') < 0.02, `worst drift ${(worst('speed') * 100).toFixed(1)}%`);
}

// --- and turning it on is the authored roster, ladder included ---
setEquivalentSizing(true);
check('turning it on takes', equivalentSizing());
check('...putting the authored lengths back', ids.every((id) => creature(id).adultLength === authored.get(id)));
check('...and the authored ladder with them',
  ids.every((id) => TIER_SCALE.every((v, t) => near(tierScale(id, t), v))), `${TIER_SCALE.join(', ')}`);
setEquivalentSizing(false);
check('and off again is the natural roster', !equivalentSizing() && creature('marrella').adultLength === table.marrella.adultLength);

console.log(failed ? `\n${failed} FAILED` : '\nall creature-sizing checks passed');
process.exit(failed ? 1 : 0);
