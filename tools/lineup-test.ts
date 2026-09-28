/**
 * The choice screen's lineup, as the pure functions the shell calls (src/app/lineup.ts).
 * Run: npm run lineup
 *
 * Every press on the pick screen — a cursor step, a click on an animal, locking in, Random,
 * Visitors, a seat joining or leaving, carrying on from a record — is a function from one lineup to
 * the next and the sound it makes. The shell only applies the answer, so what each press does is
 * checked here with nothing on screen and no era loaded (the roster is a list of names).
 */
import assert from 'node:assert/strict';
import type { Visitor } from '../src/content/visitors';
import type { CreatureId } from '../src/sim/creatures';
import type { PlayerSetup } from '../src/sim/types';
import * as lineup from '../src/app/lineup';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); passes++; };

const ids = Array.from({ length: 8 }, (_, i) => `c${i}` as CreatureId);
const seat = (creature: string, device: PlayerSetup['device'] = 'keyboard', more: Partial<PlayerSetup> = {}): PlayerSetup =>
  ({ creature: creature as CreatureId, device, ready: false, ...more });
const visitor = (id: string, standing = false): Visitor => ({ id, era: 'devonian', scale: 7, standing, origin: 'Devonian' } as unknown as Visitor);
const grid = (more: Partial<lineup.PickGrid> = {}): lineup.PickGrid =>
  ({ ids, extras: ['random'], cols: 4, depth: null, carousel: false, visitors: [], ...more });

// ---- the cursor ----
{
  // Eight animals in four columns and a Random button after them.
  const ps = [seat('c0')];
  eq(lineup.moveCursor(ps, 0, 1, 0, grid())?.players[0].creature, 'c1', 'right walks the grid');
  eq(lineup.moveCursor(ps, 0, 0, 1, grid())?.players[0].creature, 'c4', 'down moves a row');
  eq(lineup.moveCursor(ps, 0, 0, 1, grid())?.sound, 'ui-move', 'and a move sounds like one');
  ok(lineup.moveCursor(ps, 0, 1, 0, grid())!.players !== ps && ps[0].creature === ids[0], 'the lineup it was given is left alone');
  eq(lineup.moveCursor(ps, 0, 0, 1, grid({ carousel: true }))?.players[0].creature, 'c1', 'in the carousel down walks along, as right does');
  const onLast = [seat('c7')];
  const toButton = lineup.moveCursor(onLast, 0, 1, 0, grid())?.players[0];
  ok(toButton?.cursor === 'random' && toButton.creature === ids[7], 'past the last animal the cursor lands on Random, keeping the animal');
  eq(lineup.moveCursor([seat('c0', 'keyboard', { ready: true })], 0, 1, 0, grid()), null, 'a locked seat does not move');
  eq(lineup.moveCursor([], 0, 1, 0, grid()), null, 'nor does a seat nobody has');
  eq(lineup.moveCursor([seat('c0')], 0, 0, 0, grid()), null, 'a press that goes nowhere changes nothing and makes no sound');
  // A seat locked in on Visitors walks the visitors instead.
  const vs = [visitor('dunkleosteus'), visitor('archelon', true)];
  const onVisitor = [seat('dunkleosteus', 'keyboard', { cursor: 'visitors', ready: true, visitorScale: 7 })];
  const next = lineup.moveCursor(onVisitor, 0, 1, 0, grid({ visitors: vs }))?.players[0];
  ok(next?.creature === 'archelon' && next.ready && next.visitorScale === undefined, 'a Visitors seat walks the visitors; a standing guest hatches (no visitor scale)');
  eq(lineup.moveCursor(onVisitor, 0, 0, 1, grid({ visitors: vs })), null, 'and only left and right');
}

// ---- choosing an animal ----
{
  const joined = lineup.setCreature([], 0, 'c3' as CreatureId, 'touch');
  ok(joined?.joined && joined.sound === 'ui-join', 'choosing with nobody seated is the local seat joining');
  eq(joined?.players, [seat('c3', 'touch')], 'on the animal chosen, on the device the hand is');
  eq(lineup.setCreature([seat('c0')], 0, 'c5' as CreatureId, 'keyboard')?.players[0].creature, 'c5', 'a seated player changes animal');
  eq(lineup.setCreature([seat('c0', 'keyboard', { ready: true })], 0, 'c5' as CreatureId, 'keyboard'), null, 'but not once locked in');
  eq(lineup.setCreature([seat('c0')], 1, 'c5' as CreatureId, 'keyboard'), null, 'nor for a seat that is not there');
}

// ---- locking in ----
{
  const r = lineup.toggleReady([seat('c2')], 0, 'c0' as CreatureId);
  ok(r?.players[0].ready && r.sound === 'ui-confirm', 'locking in');
  const back = lineup.toggleReady(r!.players, 0, 'c0' as CreatureId);
  ok(back && !back.players[0].ready && back.players[0].creature === ids[2] && back.sound === 'ui-back', 'and letting go keeps the animal');
  const v = lineup.toggleReady([seat('dunkleosteus', 'keyboard', { ready: true, cursor: 'visitors', visitorScale: 7 })], 0, 'c0' as CreatureId)?.players[0];
  ok(v && !v.ready && v.creature === ids[0] && v.cursor === undefined && v.visitorScale === undefined, 'letting go of a visitor hands the local roster back');
}

// ---- taking what the cursor is on ----
{
  const g = grid({ visitors: [visitor('dunkleosteus')] });
  const rolled = lineup.activate([seat('c0', 'keyboard', { cursor: 'random' })], 0, g, () => 0.99);
  ok(rolled !== null && typeof rolled === 'object' && rolled.players[0].creature === ids[7] && !rolled.players[0].ready && rolled.players[0].cursor === undefined,
    'Random rolls another animal and leaves the seat free to roll again');
  const never = lineup.activate([seat('c0', 'keyboard', { cursor: 'random' })], 0, g, () => 0);
  ok(typeof never === 'object' && never?.players[0].creature !== ids[0], 'and never the animal already on');
  const vis = lineup.activate([seat('c0', 'keyboard', { cursor: 'visitors' })], 0, g, () => 0);
  ok(typeof vis === 'object' && vis?.players[0].creature === 'dunkleosteus' && vis.players[0].ready && vis.players[0].visitorScale === 7,
    'Visitors locks in on the first visitor, full grown');
  eq(lineup.activate([seat('c0', 'keyboard', { cursor: 'visitors' })], 0, grid(), () => 0), 'toggle', 'Visitors with none behind it just locks in');
  eq(lineup.activate([seat('c0')], 0, g, () => 0), 'toggle', 'confirm on an animal locks in');
  eq(lineup.activate([seat('c0', 'keyboard', { ready: true })], 0, g, () => 0), 'start', 'and confirm once locked in starts the match');
  eq(lineup.pointAtExtra([seat('c0')], 0, 'random')?.[0].cursor, 'random', 'a click on a grid button puts the cursor there');
  eq(lineup.pointAtExtra([seat('c0', 'keyboard', { ready: true })], 0, 'random'), null, 'unless the seat is locked in');
}

// ---- seats joining and leaving ----
{
  const one = [seat('c0', 0)];
  eq(lineup.addPlayer(one, 1, ids)?.players[1], seat('c1', 1), 'a pad joins on the next animal along');
  eq(lineup.addPlayer(one, 0, ids), null, 'a device joins once');
  eq(lineup.addPlayer([seat('c0', 0), seat('c1', 1), seat('c2', 2), seat('c3', 3)], 'keyboard', ids), null, 'and there are four seats');
  ok(!lineup.hasLocalSeat(one) && lineup.hasLocalSeat([seat('c0', 'touch')]), 'the glass is a local seat, as the keyboard is');
  eq(lineup.removePlayer([seat('c0', 0), seat('c1', 1), seat('c2', 2)], [true, false, true], 1),
    { players: [seat('c0', 0), seat('c2', 2)], carry: [true, true] }, 'a seat leaving takes its carry choice with it');
  eq(lineup.removePlayer([seat('c0')], [], 0), 'empty', 'the last seat leaving is back to the title');
  ok(lineup.unready([seat('c0', 0, { ready: true })]).every((p) => !p.ready), 'a change of mode un-readies everybody');
}

// ---- carrying on from a record ----
{
  const best = { c0: 2 } as Partial<Record<CreatureId, number>>;
  eq(lineup.toggleCarry([seat('c0')], [], 0, 'rise', best), [true], 'Rise with a record: carry on');
  eq(lineup.toggleCarry([seat('c0')], [true], 0, 'survival', best), [false], 'and back to hatching, in Survival too');
  eq(lineup.toggleCarry([seat('c1')], [], 0, 'rise', best), null, 'nothing to carry on from with no record');
  eq(lineup.toggleCarry([seat('c0')], [], 0, 'reef', best), null, 'nor outside the ladder modes');
}

console.log(`lineup: ${passes} checks passed`);
