/**
 * What a match is for and what it leaves behind: the modes' win checks, carrying a finished
 * match on, travel between the nursery and the other players, changing creature mid-match, and
 * the discovery record (biomes, landmarks, the ladder). Split out of src/sim/game.ts; every
 * function takes the Game.
 */
import { RULES } from './era-rules';
import { clearPursuit, stopHiding } from './concealment';
import { clamp, distXZ, heading, v3, type Vec3 } from '../shared/math';
import { applyScaleStats, clearanceOf, isAlive, lengthOf } from './actors';
import { tierForScale } from './tiers';
import { creature, PLAYABLE_IDS, type CreatureId } from './creatures';
import { APEX_HOLD_SECONDS, fillOf, ladderFill, ladderMark, ladderRung, ladderScale, LADDER_TOP, MARK_NEAR_TOP } from './ladder';
import { type Actor } from './types';
import { biomeAt, groundHeight, SURFACE_Y } from './world';
import { TEXT } from '../shared/text';
import { type TeleportDest, type Game } from './game';
import { clearRide } from './game-grip';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;

export function updateModes(game: Game, dt: number) {
  switch (game.mode) {
    // Survival's goal is Rise's: reach the top and hold it. The results screen and the choice to
    // carry on follow from the state this sets, exactly as they do for Rise.
    case 'survival':
    case 'rise': {
      game.players.forEach((p, i) => {
        const pr = game.progress[i];
        // Somebody who came in on the top rung has already done this; the clock is not theirs to
        // run. Everyone else in the same sea keeps theirs and can still win it.
        if (p.carriedTop) { pr.apexT = 0; return; }
        // The top rung in whichever currency the era grows in: `tier` is the Cambrian's alone, and
        // gating on it here left the Devonian and the Triassic running a second copy of this loop.
        if (ladderRung(game, p) >= LADDER_TOP && isAlive(p)) {
          pr.apexT += dt;
          if (pr.apexT >= APEX_HOLD_SECONDS && game.state.status === 'playing' && !pr.apexDone.includes(p.creature)) {
            bankLadderTop(game, p);
            pr.apexDone.push(p.creature);
            game.state = { status: 'won', winner: i, message: SAY.match.rulesTheReef(creature(p.creature).name) };
          }
        } else pr.apexT = 0;
      });
      break;
    }
  }
}

/**
 * Carry a finished match on instead of ending it. Every mode is co-op, so its goal is a milestone
 * rather than a verdict: it has been met and recorded, and this puts the sea back the way it was
 * and stops the mode asking for it again, so the reef stays playable as a free swim. Returns
 * whether the match resumed (it refuses one that is still playing).
 */
export function continueMatch(game: Game): boolean {
  if (game.state.status === 'playing') return false;
  const winner = game.state.winner;
  game.endless = true;
  game.state = { status: 'playing', winner: -1, message: '' };
  // Only the seat that just finished. Zeroing every seat's clock was the bug a player saw as one
  // player's apex resetting the other's: two animals grow up at their own pace and the second was
  // sent back ninety seconds every time the first arrived.
  if (winner >= 0 && game.progress[winner]) game.progress[winner].apexT = 0;
  return true;
}

/**
 * Change a player's body for another creature's, without moving them or restarting anything.
 *
 * The body they leave is written down at the size and mark it had, and the one they take up is
 * either handed back exactly as they left it or hatched fresh — grown or newborn, as asked. The
 * animal is the only thing that changes: the sea, the hour, the mode's clock and everything
 * anyone else has grown carry straight on.
 */
export function changeCreature(game: Game, i: number, id: CreatureId, grown: boolean): boolean {
  const a = game.players[i];
  if (!a || !isAlive(a) || (a.state !== 'free' && a.state !== 'guard') || a.teleportCd > 0 || a.grabbedBy >= 0) return false;
  if (!PLAYABLE_IDS.includes(id)) return false;
  const mine = game.kept[i] ?? (game.kept[i] = new Map());
  if (id !== a.creature) mine.set(a.creature, { scale: a.scale, mark: ladderMark(game, a) });
  const back = mine.get(id);
  const mark = back ? back.mark : grown ? LADDER_TOP : 0;
  const scale = back ? back.scale : ladderScale(id, mark);

  game.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 0 });
  // Nothing may keep hunting the body that just stopped existing.
  stopHiding(a); clearPursuit(a, game.actors);
  a.creature = id; a.scale = scale;
  applyScaleStats(a, false);
  a.tier = tierForScale(a.creature, a.scale);
  // The era resyncs whatever it keeps outside the actor before the meter is filled, or the fill
  // would be measured against the stage the *old* animal was on.
  RULES.onSwap(game, a);
  ladderFill(game, a, fillOf(mark));
  a.state = 'free'; a.stateT = 0; a.move = undefined; a.hitDone.clear();
  a.combo = 0; a.comboT = 0; a.abilityCd = 0; a.abilityActive = false; a.emergenceHeavy = false;
  a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.grabbing = -1;
  a.vel = v3(); a.bank = 0; a.hitFlash = 0;
  a.spawnProtect = Math.max(a.spawnProtect, 2.5); a.teleportCd = 20;
  // The body it is drawn with changed, so the step it is interpolated from has to be this one.
  a.prevT = { x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, pitch: a.pitch, bank: a.bank };
  game.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 1 });
  game.flag(a, 'teleport');
  return true;
}

/**
 * Move a player home or alongside another player. The sea is endless, so this is how a party
 * regroups. Not while dead, mid-move or on cooldown; arrival comes with a few seconds of
 * protection and a burst of sparkles at both ends.
 */
export function teleport(game: Game, i: number, dest: TeleportDest): boolean {
  const a = game.players[i];
  if (!a || !isAlive(a) || (a.state !== 'free' && a.state !== 'guard') || a.teleportCd > 0 || a.grabbedBy >= 0) return false;
  let pos: Vec3, yaw: number;
  if (dest === 'home') { pos = game.spawnPoint(a.home, a.creature, a.scale, i); yaw = Math.PI; }
  else {
    const o = game.players[dest];
    if (!o || o === a) return false;
    const h = heading(o.yaw), L = lengthOf(o);
    pos = { x: o.pos.x - h.x * (L * 2 + 3), y: o.pos.y, z: o.pos.z - h.z * (L * 2 + 3) };
    yaw = o.yaw;
  }
  game.world.loadAround(pos);
  const g = groundHeight(game.world, pos.x, pos.z, game.scratchBoulders);
  pos.y = clamp(pos.y, g + clearanceOf(a) + 0.2, SURFACE_Y - 1 - clearanceOf(a));
  game.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 0 });
  stopHiding(a); a.camoStrength = 0; a.emergenceHeavy = false; a.pos = pos; a.vel = v3(); a.yaw = yaw; a.pitch = 0; a.bank = 0; a.climbTo = -Infinity; a.climbPush = 0; clearRide(game, a);
  a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.aiming = false;
  a.spawnProtect = Math.max(a.spawnProtect, 2.5); a.teleportCd = 20; a.hitFlash = 0;
  game.events.push({ kind: 'teleport', pos: { ...pos }, actor: a.id, player: i, strength: 1 });
  game.flag(a, 'teleport');
  return true;
}

/**
 * Note where the players have been. Biomes are credited to whoever is standing in one; a
 * landmark has to be swum up to, close enough that you have actually seen the thing.
 */
export function updateDiscovery(game: Game) {
  for (const p of game.players) {
    if (!isAlive(p)) continue;
    game.discovery.biomes.add(biomeAt(p.pos.x, p.pos.z));
    for (const m of game.world.landmarks) if (distXZ(p.pos, m.pos) < m.radius + 14) game.discovery.landmarks.add(m.kind);
    // Ask the ladder rather than reading `tier`, so an era that owns its own growth records the
    // same way. The Devonian never advances `tier` — it moults through stages — so reading the
    // field directly meant no Devonian animal was ever credited with reaching the top.
    const rung = ladderRung(game, p);
    if (rung >= LADDER_TOP) game.discovery.apex.add(p.creature);
    // Rise only: the other modes hand you a body rather than growing you one, so their rung
    // says nothing about how far you got. Rung 0 is where everyone starts, so it is not a mark
    // worth keeping — recording it would put a row in every player's record that says nothing.
    //
    // The top rung is the exception: Rise asks you to reach it *and hold it*, so standing on it
    // banks the rung below with a half-full meter and nothing more. The top itself is written
    // by `bankLadderTop`, when the run is actually finished.
    // A victory lap banks nothing. Somebody who came in on the top rung is revisiting a run they
    // already finished, not making progress, and their record already says so.
    if ((game.mode === 'rise' || game.mode === 'survival') && !p.carriedTop) markLadder(game, p, rung >= LADDER_TOP ? MARK_NEAR_TOP : ladderMark(game, p));
  }
}

/** Raise this creature's Rise record to `mark`, if it is worth more than what is already there. */
export function markLadder(game: Game, p: Actor, mark: number) {
  if (mark > 0 && mark > (game.discovery.best.get(p.creature) ?? 0)) game.discovery.best.set(p.creature, mark);
}

/**
 * The Rise goal has been met by this player: bank the top of the ladder for their creature.
 *
 * This is the only door the top rung comes through, which is why both eras call it from their
 * own win check — the Cambrian holds Apex, the Devonian holds Prime, and neither is something
 * the shared code can see for itself.
 */
export function bankLadderTop(game: Game, p: Actor) {
  if (game.mode !== 'rise' && game.mode !== 'survival') return;
  game.discovery.best.set(p.creature, LADDER_TOP);
}
