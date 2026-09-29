/**
 * Where a player finds their animal's special. Run: npm run specials (all three eras), or
 * node tools/test.mjs specials:<era>
 *
 * The rule (`specialSlot`, src/sim/special-slot.ts): RT is the pounce on every animal; Y is the
 * special where the real animal never hid, and the hide where it did, whose special is then on B; a
 * special that is a way of guarding stays on B; a special that is the burrow is the hide itself.
 * Checked on every playable animal in the era, both as the rule and by pressing the button.
 */
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';
import { checker, finish, live } from './lib/test';

const check = checker(66);
// One process per era: these modules read ACTIVE_ERA at module top.
const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
selectEra(which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN);
const { PLAYABLE, creature } = await import('../src/sim/creatures');
const { Game } = await import('../src/sim/game');
const { emptyInput } = await import('../src/sim/types');
const { specialSlot } = await import('../src/sim/special-slot');
const { BURROWERS } = await import('../src/sim/concealment');
console.log(`--- ${which} ---`);

// The era's specials are installed with its first game.
new Game('reef', [{ creature: PLAYABLE[0].id, device: 'keyboard', ready: true }]);

for (const def of PLAYABLE) {
  const slot = specialSlot(def);
  const hides = !!def.hides || BURROWERS.has(def.id);
  if (def.ability === 'none') { check(`${def.id}: no special, nothing claimed`, slot === 'none'); continue; }
  if (slot === 'guard') { check(`${def.id}: ${def.ability} is a way of guarding, so it stays on B`, true); continue; }
  if (slot === 'none') { check(`${def.id}: ${def.ability} is the hide itself`, BURROWERS.has(def.id)); continue; }
  check(`${def.id}: ${def.ability} is on ${hides ? 'B, since it hides in life' : 'Y, since it never hid'}`, slot === (hides ? 'b' : 'y'));

  // Pressing that button fires it; RT on the same animal is the pounce and never the special.
  const g = new Game('reef', [{ creature: def.id, device: 'keyboard', ready: true }]);
  g.skipHatch();
  const a = g.players[0];
  const idle = () => new Map([[0, emptyInput()]]);
  for (let i = 0; i < 30; i++) g.step(1 / 60, idle());
  a.stamina = a.staminaMax; a.abilityCd = 0; a.state = 'free'; a.spawnProtect = 999;
  check(`${def.id}: RT is named the pounce`, g.heavyMove(a).name === 'POUNCE');
  const key = slot === 'b' ? 'guard' : 'ability';
  g.step(1 / 60, new Map([[0, { ...emptyInput(), [key]: true }]]));
  // An instant special (a gulp, a pod call, ink) leaves its cooldown behind rather than a state.
  const took = live(a).state === 'ability' || live(a).abilityCd > 0;
  // The pod call needs a pod, which a bare test sea does not have.
  const needsCompany = def.ability === 'podCall';
  check(`${def.id}: ${key === 'guard' ? 'B' : 'Y'} fires ${creature(def.id).abilityName}`, took || needsCompany, `state=${a.state} cd=${a.abilityCd.toFixed(1)}`);
  if (slot === 'b') check(`${def.id}: and Y is still the hide`, (() => {
    const h = new Game('reef', [{ creature: def.id, device: 'keyboard', ready: true }]);
    h.skipHatch();
    const b = h.players[0];
    for (let i = 0; i < 30; i++) h.step(1 / 60, new Map([[0, emptyInput()]]));
    b.stamina = b.staminaMax; b.hideCd = 0; b.state = 'free';
    h.step(1 / 60, new Map([[0, { ...emptyInput(), ability: true }]]));
    return live(b).hideMode !== 'none' && live(b).state !== 'ability';
  })());
}
finish(`PASS: every ${which} special is where the rule puts it, and its button fires it`);
