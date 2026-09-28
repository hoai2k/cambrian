/**
 * The modes: the scoreboard reports every one honestly, Rise ends when the top is held, and a
 * finished match can be carried on without winning itself again.
 */
import { APEX_HOLD_SECONDS, Game } from '../src/sim/game';
import { emptyInput, TIER_SCALE, type InputFrame } from '../src/sim/types';
import { checker, finish } from './lib/test';

const check = checker(58);
const run = (g: Game, steps: number, f: InputFrame = emptyInput()) => {
  const m = new Map([[0, f]]);
  for (let i = 0; i < steps && g.state.status === 'playing'; i++) { g.step(1 / 60, m); g.events.length = 0; }
};
// --- the scoreboard ---
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'anomalocaris', device: 'keyboard2', ready: true }], 4);
  g.players[1].scale = TIER_SCALE[3]; g.players[1].tier = 3;
  run(g, 30);
  const { rows } = g.scoreboard(0);
  check('every player is on the board', rows.length === g.players.length, `${rows.length} rows`);
  check('the viewer sees their own biome, others by distance', rows.find((r) => r.player === 0)!.distance === 0);
  check('rows carry a rank and a bar', rows.every((r) => !!r.rank && r.progress >= 0 && r.progress <= 1), rows[0].rank);
  check('...sorted by size', rows[0].player === 1 && rows[0].tier + rows[0].progress >= rows[1].tier + rows[1].progress, rows.map((r) => `${r.player}:${r.tier}`).join(' '));
}
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  run(g, 30);
  const { header, rows } = g.scoreboard(0);
  check('each mode gets its own header', header.title === 'Rise' && /Apex/.test(header.detail), `${header.title}: ${header.detail}`);
  check('...and a lone player is the whole board', rows.length === 1);
  const reef = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  check('Reef says it has no goal', reef.scoreboard(0).header.title === 'Reef', reef.scoreboard(0).header.detail);
  const survival = new Game('survival', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  check('Survival says what it asks', survival.scoreboard(0).header.title === 'Survival', survival.scoreboard(0).header.detail);
}

// --- a finished match can carry on ---
{
  // Rise is won by holding Apex for ninety seconds. Put a player there and let the clock run out.
  const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0];
  p.scale = TIER_SCALE[4]; p.tier = 4; p.spawnProtect = 0;
  run(g, 60 * 3);
  check('the Apex clock runs while it is held', g.progress[0].apexT > 2, `${g.progress[0].apexT.toFixed(1)} s`);
  // Wind the hold on to its last few seconds rather than stepping the sea through ninety of them.
  g.progress[0].apexT = APEX_HOLD_SECONDS - 2;
  run(g, 60 * 3);
  check('Rise ends when Apex is held', g.state.status === 'won', `${g.state.status}: ${g.state.message}`);
  check('...and the sim stops with it', (() => { const t = g.time; run(g, 60); return g.time === t; })(), `t=${g.time.toFixed(1)}`);

  const scale = p.scale, kills = p.kills, where = { ...p.pos };
  check('Rise offers to carry on', g.continueMatch());
  check('...the match is playing again', g.state.status === 'playing' && g.state.message === '', `${g.state.status} "${g.state.message}"`);
  check('...on the same body in the same place', p.scale === scale && p.kills === kills && p.pos.x === where.x && p.pos.z === where.z);
  check('...and time moves', (() => { const t = g.time; run(g, 60); return g.time > t; })(), `t=${g.time.toFixed(1)}`);

  // The win condition must not fire again the moment play resumes, or the results screen returns:
  // held past the whole ninety seconds again (wound on, as above), nothing happens.
  p.tier = 4;
  run(g, 60 * 3);
  g.progress[0].apexT = APEX_HOLD_SECONDS + 5;
  run(g, 60 * 3);
  check('...without winning all over again', g.state.status === 'playing' && g.endless, `${g.state.status} endless=${g.endless}`);
  check('...and the objective says so', /Swim on/.test(g.scoreboard(0).header.detail), g.scoreboard(0).header.detail);
}
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 22);
  run(g, 30);
  check('a match still running cannot be continued', !g.continueMatch() && !g.endless);
}
finish('all mode tests passed');
