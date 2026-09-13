/**
 * Hunter & Hunted takes turns, and the scoreboard reports every mode honestly.
 *
 * The mode used to hand player one the giant for the whole match; now every human gets one stint
 * in the role and is scored on the same job, so the tests below are mostly about the hand-over:
 * that the body moves, that nobody is the giant during the pause, and that the score follows the
 * catch rather than the seat.
 */
import { Game } from '../src/sim/game';
import { emptyInput, TIER_SCALE, type InputFrame } from '../src/sim/types';
import { isAlive } from '../src/sim/actors';
import type { CreatureId } from '../src/sim/creatures';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
const run = (g: Game, steps: number, f: InputFrame = emptyInput()) => {
  const m = new Map([[0, f]]);
  for (let i = 0; i < steps && g.state.status === 'playing'; i++) { g.step(1 / 60, m); g.events.length = 0; }
};
const hunted = (n: number, seed = 11) => new Game('hunted',
  (['anomalocaris', 'waptia', 'opabinia', 'marrella'] as CreatureId[]).slice(0, n).map((c, i) => ({ creature: c, device: i ? 'keyboard2' : 'keyboard', ready: true } as const)), seed);

// --- one turn each, and the giant's body moves with the role ---
{
  const g = hunted(2);
  check('two players means two turns', g.huntTurns === 2, `turns=${g.huntTurns}`);
  check('player one opens as the giant', g.hunterIndex === 0 && g.players[0].scale > g.players[1].scale * 3, `${g.players.map((p) => p.scale.toFixed(2)).join(' ')}`);
  check('...and only they are the hunter', g.isHunter(0) && !g.isHunter(1));

  run(g, 60 * 101);
  check('nobody is the giant during the hand-over', g.hunterIndex === -1 && g.huntBreakT > 0, `break=${g.huntBreakT.toFixed(1)}`);
  // The body stays until the changeover — popping it down mid-sentence reads as a glitch — so
  // what makes the turn over is that nothing can be caught during the pause.
  check('...everyone is untouchable through the pause', g.players.every((p) => p.spawnProtect > 0), g.players.map((p) => p.spawnProtect.toFixed(1)).join(' '));

  run(g, 60 * 5);
  check('the next turn hands the body over', g.hunterIndex === 1 && g.players[1].scale > g.players[0].scale * 3, `${g.players.map((p) => p.scale.toFixed(2)).join(' ')}`);
  check('...and the old giant is a juvenile again', g.players[0].tier === 1, `tier=${g.players[0].tier}`);
  check('...both alive and protected on arrival', g.players.every((p) => isAlive(p) && p.spawnProtect > 0));
  check('...the turn clock restarted', g.huntTurnLeft() > 90, `${g.huntTurnLeft().toFixed(0)} s left`);
}

// --- a single player is the mode exactly as it was ---
{
  const g = hunted(1);
  check('one player is one turn', g.huntTurns === 1 && g.hunterIndex === 0, `turns=${g.huntTurns}`);
  run(g, 60 * 102);
  check('...and the match ends when it is up', g.state.status !== 'playing', `${g.state.status}: ${g.state.message}`);
}

// --- the catch is scored to whoever was the giant at the time ---
{
  const g = hunted(2);
  const prey = g.actors.find((a) => a.controller === 'bot')!;
  const giant = g.players[0];
  // a kill by the giant this step is a point; the same kill by anyone else is not
  g.events.push({ kind: 'kill', pos: { ...prey.pos }, actor: giant.id, other: prey.id, player: 0 });
  g.step(1 / 60, new Map()); g.events.length = 0;
  check('the giant is scored for a catch', g.huntScore[0] === 1, `score=${g.huntScore.join(',')}`);
  g.events.push({ kind: 'kill', pos: { ...prey.pos }, actor: g.players[1].id, other: prey.id, player: 1 });
  g.step(1 / 60, new Map()); g.events.length = 0;
  check('...and a small one killing something is not', g.huntScore[1] === 0, `score=${g.huntScore.join(',')}`);

  // play both turns out; the score decides it, not the seat
  g.huntScore[0] = 3; g.huntScore[1] = 1;
  run(g, 60 * 220);
  check('the best hunter wins', g.state.status === 'won' && g.state.winner === 0, `${g.state.message}`);
  check('...and the message carries both tallies', /P1 3/.test(g.state.message) && /P2 1/.test(g.state.message), g.state.message);
}

// --- a tie, and a match where nobody caught anything ---
{
  const g = hunted(2, 3);
  g.huntScore[0] = 2; g.huntScore[1] = 2;
  run(g, 60 * 220);
  check('a tie says so', g.state.winner === -2 && /tie/i.test(g.state.message), g.state.message);
}
{
  const g = hunted(2, 5);
  run(g, 60 * 220);
  check('nobody catching anything is a loss for everyone', g.state.status === 'lost' && /Nobody/.test(g.state.message), g.state.message);
}

// --- the scoreboard ---
{
  const g = hunted(3);
  run(g, 30);
  const { header, rows } = g.scoreboard(0);
  check('every contender is on the board', rows.length === g.actors.filter((a) => a.controller === 'player' || a.controller === 'bot').length, `${rows.length} rows`);
  check('the bots are on it too', rows.some((r) => r.player < 0), `${rows.filter((r) => r.player < 0).length} bots`);
  check('the header names the turn', /Turn 1 of 3/.test(header.title), header.title);
  check('...and counts the turn down', (header.clock ?? 0) > 90, `${header.clock?.toFixed(0)} s`);
  check('the giant is marked', rows.filter((r) => r.hunting).length === 1, rows.filter((r) => r.hunting).map((r) => r.name).join(','));
  check('the viewer sees their own biome, others by distance', rows.find((r) => r.player === 0)!.distance === 0);
  check('rows carry a rank and a bar', rows.every((r) => !!r.rank && r.progress >= 0 && r.progress <= 1), rows[0].rank);

  g.huntScore[2] = 5; g.huntScore[0] = 1;
  const sorted = g.scoreboard(0).rows;
  check('Hunter & Hunted sorts by catch', sorted[0].player === 2 && sorted[0].score === 5, sorted.map((r) => `${r.player}:${r.score}`).join(' '));
}
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  run(g, 30);
  const { header, rows } = g.scoreboard(0);
  check('other modes get their own header', header.title === 'Rise' && /Apex/.test(header.detail), `${header.title}: ${header.detail}`);
  check('...and no catch column', rows.every((r) => r.score === undefined));
  check('...sorted by size', rows.length > 1 ? rows[0].tier + rows[0].progress >= rows[1].tier + rows[1].progress : true);
}

// --- the hand-over is announced in every viewport ---
{
  const g = hunted(2);
  run(g, 60 * 101);
  const notice = g.noticeFor(0);
  check('the turn ending is announced', !!notice && /caught/.test(notice), notice ?? 'none');
  run(g, 60 * 5);
  check('...and so is the next turn', /Turn 2 of 2/.test(g.noticeFor(1) ?? ''), g.noticeFor(1) ?? 'none');
  run(g, 60 * 6);
  check('...and the line expires', g.noticeFor(0) === undefined, g.noticeFor(0) ?? 'gone');
}

// --- a finished co-op match can carry on; a versus one cannot ---
{
  // Rise is won by holding Apex for ninety seconds. Put a player there and let the clock run out.
  const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0];
  p.scale = TIER_SCALE[4]; p.tier = 4; p.spawnProtect = 0;
  run(g, 60 * 95);
  check('Rise ends when Apex is held', g.state.status === 'won', `${g.state.status}: ${g.state.message}`);
  check('...and the sim stops with it', (() => { const t = g.time; run(g, 60); return g.time === t; })(), `t=${g.time.toFixed(1)}`);

  const scale = p.scale, kills = p.kills, where = { ...p.pos };
  check('Rise offers to carry on', g.continueMatch());
  check('...the match is playing again', g.state.status === 'playing' && g.state.message === '', `${g.state.status} "${g.state.message}"`);
  check('...on the same body in the same place', p.scale === scale && p.kills === kills && p.pos.x === where.x && p.pos.z === where.z);
  check('...and time moves', (() => { const t = g.time; run(g, 60); return g.time > t; })(), `t=${g.time.toFixed(1)}`);

  // The win condition must not fire again the moment play resumes, or the results screen returns.
  p.tier = 4;
  run(g, 60 * 120);
  check('...without winning all over again', g.state.status === 'playing' && g.endless, `${g.state.status} endless=${g.endless}`);
  check('...and the objective says so', /Swim on/.test(g.scoreboard(0).header.detail), g.scoreboard(0).header.detail);
}
{
  const g = hunted(2);
  run(g, 60 * 60 * 6);
  check('Hunter & Hunted is decided', g.state.status !== 'playing', g.state.status);
  check('...and versus results are final', !g.continueMatch() && g.state.status !== 'playing', `status=${g.state.status}`);
}
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 22);
  run(g, 30);
  check('a match still running cannot be continued', !g.continueMatch() && !g.endless);
}

console.log(failed ? `\n${failed} FAILED` : '\nall mode tests passed');
process.exit(failed ? 1 : 0);
