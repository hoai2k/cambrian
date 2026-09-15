import type { CreatureDef, MoveDef } from '../creature-types';
import type { TriassicGuestId } from './ids';
import expansion from './expansion.json';

/**
 * The **standing guests**: Archelon and Mosasaurus.
 *
 * Both are Late Cretaceous. Where they belong is the open question in
 * `docs/triassic/05-mesozoic-expansion.md` — widen this game, or build a fourth one — and being in
 * `TRIASSIC_CREATURES` is what would answer it by accident, because roster membership is what puts
 * an animal in the sea, in `population.ts`'s tables and on the pick screen. So their bodies are
 * built here, their files live in `assets/triassic/creatures/`, and the only way a player meets one
 * is as a **visitor** (`src/content/visitors.ts`), which is admitted through `creature()` by
 * `admitVisitors` and deliberately never joins `CREATURES` or `PLAYABLE`.
 *
 * Unlike an earned visitor there is nothing to earn: there is no Cretaceous game to take them to
 * the top of. They are admitted unconditionally and gated only on the **body actually being
 * shipped**, so a subject whose model is not built can never become pickable with nothing to draw.
 *
 * The descriptive half of each definition is read out of `expansion.json` rather than retyped here.
 * That file is the register for a subject whose era is undecided and already carries the name, the
 * species, the group, the role, the provenance, the tagline and the length the era's own rule
 * (4.0 · metres^0.55) gives it; duplicating those into a second file is how two numbers come to
 * disagree. What this file adds is the half a register has no business holding: how the animal
 * moves, fights and feels to play.
 */
const light = (name: string, o: Partial<MoveDef> = {}): MoveDef => ({
  name, windup: 0.14, active: 0.16, recovery: 0.22, damage: 9, poise: 12, knockback: 1.2, stamina: 6, lunge: 0.25, ...o,
});
const heavy = (name: string, o: Partial<MoveDef> = {}): MoveDef => ({
  name, windup: 0.42, active: 0.2, recovery: 0.5, damage: 24, poise: 45, knockback: 3.5, stamina: 18, lunge: 0.9, guardBreak: true, ...o,
});

interface Subject {
  id: string; name: string; species: string; kind: string; kindNote: string;
  role: string; provenance: string; tagline: string; lengthMeters: number; adultLength: number;
}
const SUBJECT = Object.fromEntries(
  (expansion.subjects as Subject[]).map((s) => [s.id, s]),
) as Record<TriassicGuestId, Subject>;

/** The register's own half of a definition, so a length or a name can never be typed twice. */
const from = (id: TriassicGuestId) => {
  const s = SUBJECT[id];
  return {
    id: id as CreatureDef['id'], name: s.name, species: s.species,
    kind: s.kind, kindNote: s.kindNote, role: s.role, provenance: s.provenance,
    tagline: s.tagline, adultLength: s.adultLength,
  };
};

export const TRIASSIC_GUESTS: readonly CreatureDef[] = [
  {
    ...from('archelon'),
    /**
     * Four and a half metres of turtle that flies rather than swims, and **no kind of predator of
     * players at all**. Its beak crushes ammonites and its stomach is full of jellyfish; what it
     * is in a match is a very large animal that is not coming for you, which is a thing this sea
     * has almost none of. So it grazes (`diet: 'grazer'` keeps the AI from hunting with it),
     * `peaceful` keeps the sea's own reckoning from hunting *it*, and both its attacks are the
     * beak: slow, enormously heavy, and armour-piercing, because a bite that opens an ammonite
     * opens a placodont.
     */
    ground: false, rung: 3, breathing: 'air', eggShell: 'leathery',
    diet: 'grazer', peaceful: true,
    // A carapace of ribs under a leathery back: armour that is real but nothing like a placodont's
    // box, and only on the side it is on.
    armour: 0.55, armourFacing: 'dorsal',
    flight: true, riseRate: 1.25, proceduralUndulation: false,
    speed: 7.6, burst: 2.91, agility: 6, turnRate: 4.13, glide: 0.2,
    hp: 340, poise: 210, stamina: 150, defense: 0.14, sense: 8,
    color: '#5a5344', accent: '#c9bfa2',
    light: light('Beak nip', { damage: 11, windup: 0.2, recovery: 0.3 }),
    heavy: heavy('Shell crush', { damage: 38, windup: 0.6, recovery: 0.75, lunge: 0.7, armorPierce: 0.8 }),
    ability: 'powerStroke', abilityDuration: 1.1, abilityName: 'Power stroke', abilityCooldown: 8,
    abilityDesc: 'Both forelimbs at once, shoulders first: one enormous downbeat and a long carry out of it.',
    passive: 'Nothing in this sea hunts a grazer, and a shell is a poor thing to bite.',
    weakness: 'No hunt in it. Slow to start, and the shell is armour only from above.',
    canGuard: true,
  },
  {
    ...from('mosasaurus'),
    /**
     * Thirteen metres of marine lizard, and the point of it is that it is **bigger than the sea it
     * is visiting**: a full-grown Mosasaurus is longer than anything the Triassic holds and far
     * longer than anything in the other two, which is the reward rather than a balance problem.
     * It swims on a lunate tail (`thunniform`) with four paddles steering, and it grabs: the second
     * row of teeth on its palate is what `grasp` is here, prey worked backwards rather than chewed.
     */
    ground: false, rung: 4, breathing: 'air', eggShell: 'leathery',
    grasp: true, thunniform: true, birth: 'live', riseRate: 1.0, pitchRate: 1.4,
    proceduralUndulation: false,
    speed: 12.5, burst: 2.17, agility: 3.5, turnRate: 2.17, glide: 0.25,
    hp: 820, poise: 380, stamina: 210, defense: 0.08, sense: 13,
    color: '#3f4a45', accent: '#9aa892',
    light: light('Snap', { damage: 26, windup: 0.2, recovery: 0.3, stamina: 8 }),
    heavy: heavy('Pterygoid ratchet', { damage: 50, windup: 0.46, recovery: 0.62, lunge: 1.5, grab: true }),
    ability: 'ambushSurge', abilityName: 'Ram charge', abilityCooldown: 10,
    abilityDesc: 'Coils to one side and unrolls through it: a standing start that closes three body lengths before anything has turned round.',
    passive: 'The best eyes in any of these seas, and a second row of teeth that will not let go.',
    weakness: 'A long body turns slowly, and lungs it has to carry to the surface like everything else.',
    canGuard: false,
  },
];

export const TRIASSIC_GUEST_IDS = TRIASSIC_GUESTS.map((c) => c.id as TriassicGuestId);
