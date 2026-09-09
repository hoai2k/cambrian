/**
 * Changing creature mid-match: each body keeps what it has grown, so one session can raise several.
 *
 * Usage: npx esbuild tools/swap-test.ts --bundle --platform=node --format=esm --outfile=/tmp/sw.mjs && node /tmp/sw.mjs
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { ladderMark, ladderScale, LADDER_TOP, rungOf } from '../src/sim/ladder';
import { PLAYABLE_IDS } from '../src/sim/creatures';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };
const run = (g: Game, n: number, f: InputFrame = emptyInput()) => { const m = new Map([[0, f]]); for (let i = 0; i < n; i++) { g.step(1 / 60, m); g.events.length = 0; } };
const fresh = () => { const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7); const p = g.players[0]; p.spawnProtect = 0; p.teleportCd = 0; run(g, 30); p.teleportCd = 0; return { g, p }; };

// The cycle starts on the body you are in, and offers the whole roster.
{
  const { g, p } = fresh();
  const roster = g.swapOptions(0, false);
  check('the cycle offers every playable creature', roster.length === PLAYABLE_IDS.length, `${roster.length}/${PLAYABLE_IDS.length}`);
  check('...and starts on the one you are', roster[0].id === p.creature && roster[0].current, roster[0].id);
  check('...showing the progress you actually have', Math.abs(roster[0].mark - ladderMark(g, p)) < 1e-6);
  const other = roster.find((o) => !o.current)!;
  check('an animal you have never worn starts at the bottom', other.mark === 0 && !other.kept, `${other.id} mark=${other.mark}`);
  check('...or fully grown when asked', g.swapOptions(0, true).find((o) => o.id === other.id)!.mark === LADDER_TOP);
}

// Swapping keeps each body where it was left.
{
  const { g, p } = fresh();
  const first = p.creature;
  // Grow the starting body a little, then put it away.
  p.scale = ladderScale(first, 2); p.tier = 2;
  const grownMark = ladderMark(g, p), grownLen = lengthOf(p);
  const target = PLAYABLE_IDS.find((id) => id !== first)!;
  check('the swap is taken', g.changeCreature(0, target, false), `${first} -> ${target}`);
  check('...and the body really changed', p.creature === target, p.creature);
  check('...as a hatchling, since it is new', rungOf(ladderMark(g, p)) === 0, `mark=${ladderMark(g, p).toFixed(2)}`);
  check('...alive, free and still in the same water', isAlive(p) && p.state === 'free');
  check('...with the model-swap read as a jump, not a glide', p.prevT.x === p.pos.x && p.prevT.y === p.pos.y);

  // Grow the new one, then go back to the first.
  p.scale = ladderScale(target, 1); p.tier = 1;
  const secondMark = ladderMark(g, p);
  p.teleportCd = 0;
  check('swapping back is taken', g.changeCreature(0, first, false));
  check('...and the first body is exactly where it was left', Math.abs(ladderMark(g, p) - grownMark) < 0.02, `${ladderMark(g, p).toFixed(2)} vs ${grownMark.toFixed(2)}`);
  check('...at the size it had grown to', Math.abs(lengthOf(p) - grownLen) < 1e-6, `${lengthOf(p).toFixed(2)} vs ${grownLen.toFixed(2)}`);
  p.teleportCd = 0;
  check('and the second is still where it was left too', g.changeCreature(0, target, false) && Math.abs(ladderMark(g, p) - secondMark) < 0.02, `${ladderMark(g, p).toFixed(2)} vs ${secondMark.toFixed(2)}`);
  check('a body you have worn is offered as kept, whatever the toggle says',
    g.swapOptions(0, true).find((o) => o.id === first)!.kept, '');
  check('...at its own mark, not the toggle\'s', Math.abs(g.swapOptions(0, true).find((o) => o.id === first)!.mark - grownMark) < 0.02);
}

// It is a deliberate act, not something that can happen mid-fight or twice in a breath.
{
  const { g, p } = fresh();
  const target = PLAYABLE_IDS.find((id) => id !== p.creature)!;
  p.state = 'attack';
  check('no swapping mid-attack', !g.changeCreature(0, target, false), `state=${p.state}`);
  p.state = 'free';
  check('...but a free body swaps', g.changeCreature(0, target, false));
  check('...and pays the teleport cooldown', p.teleportCd > 0, `${p.teleportCd.toFixed(0)} s`);
  const third = PLAYABLE_IDS.find((id) => id !== p.creature)!;
  check('...so a second swap has to wait', !g.changeCreature(0, third, false));
  p.state = 'dead';
  p.teleportCd = 0;
  check('and a dead player swaps nothing', !g.changeCreature(0, third, false));
}

// One player changing body must not touch anybody else's. This is the whole reason the swap is
// done in place on the actor rather than by restarting the match: on a sofa with four people on
// it, one of them going off to raise something new cannot cost the other three their afternoon.
{
  const g = new Game('rise', [
    { creature: 'anomalocaris', device: 'keyboard', ready: true },
    { creature: 'opabinia', device: 'keyboard2', ready: true },
  ], 11);
  const [p, other] = g.players;
  p.spawnProtect = 0; p.teleportCd = 0;
  run(g, 30);
  p.teleportCd = 0;
  // Give the bystander something to lose.
  other.scale = ladderScale(other.creature, 3); other.tier = 3;
  const before = {
    creature: other.creature, mark: ladderMark(g, other), len: lengthOf(other),
    pos: { ...other.pos }, hp: other.hp, eats: other.eats, state: other.state, id: other.id,
  };
  const world = { time: g.time, actors: g.actors.length };
  const target = PLAYABLE_IDS.find((id) => id !== p.creature && id !== other.creature)!;
  check('P1 changes creature', g.changeCreature(0, target, true), `-> ${target}`);
  check('...and P2 is still the animal they were', other.creature === before.creature && other.id === before.id, other.creature);
  check('...at the size and mark they had grown to', Math.abs(ladderMark(g, other) - before.mark) < 1e-6 && Math.abs(lengthOf(other) - before.len) < 1e-6);
  check('...where they were, as they were', other.pos.x === before.pos.x && other.pos.z === before.pos.z && other.hp === before.hp && other.state === before.state);
  check('...and the sea and the clock carried straight on', g.time === world.time && g.actors.length === world.actors, `t=${g.time.toFixed(2)}`);
  // And the two players keep separate wardrobes.
  other.teleportCd = 0;
  check('P2 can change too, into what P1 just left', g.changeCreature(1, 'anomalocaris', false));
  check("...as a hatchling: P1's progress in that body is not P2's", rungOf(ladderMark(g, other)) === 0, `rung=${rungOf(ladderMark(g, other))}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall creature-swap tests passed'); process.exit(failed ? 1 : 0);
