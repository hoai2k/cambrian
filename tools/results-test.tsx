/**
 * The results screen's discovery panel. Run: npm run results
 *
 * This panel is otherwise unverifiable: it only appears after a match ends, and under the software
 * renderer a headless browser gets too few frames to finish one. So it is rendered on its own and
 * read as markup — which is enough for the thing that actually breaks, namely what it says.
 *
 * What it has to say, since nothing else in the game does: reaching Apex is what admits an animal
 * to the *other* two games as a visitor (src/content/visitors.ts reads exactly this record), and a
 * player who has just earned one has no way to know that.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';

const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
const era = which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN;
selectEra(era);

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(60)} ${d}`); if (!ok) failed++; };

const { Discoveries } = await import('../src/app/Overlays');
const { PLAYABLE } = await import('../src/sim/creatures');
const { earnedVisitors } = await import('../src/content/visitors');

const empty = { biomes: [], landmarks: [], apex: [], best: {} } as never;
const draw = (apex: string[], fresh: string[] = []) =>
  renderToStaticMarkup(<Discoveries codex={{ ...(empty as object), apex } as never} fresh={{ ...(empty as object), apex: fresh } as never} />);
const stars = (html: string) => (html.match(/visitor-tag/g) ?? []).length;
const others = [era.copy.sibling, ...(era.copy.siblings ?? [])].filter((g) => !!g).map((g) => g!.title);

// --- nothing earned yet: the panel says what Apex is for, as a goal ---
{
  const html = draw([]);
  check('with nothing at Apex there are no visitor marks', stars(html) === 0);
  check('...and the note reads as a goal', html.includes('Take a creature to Apex'), 'unlock prompt shown');
  for (const name of others) check(`...naming ${name}`, html.includes(name));
}

// --- one earned: the card is marked and the note reads as a reward ---
{
  const one = PLAYABLE[0].id;
  const html = draw([one], [one]);
  check('an animal at Apex carries the visitor mark', stars(html) === 1, `${one}`);
  check('...and the note reads as a reward', html.includes('Unlocked as visitors'), 'unlock reported');
  check('...and it still says NEW for the one just earned', html.includes('NEW'));
  check('...and its title says where it is unlocked', html.includes('unlocked as a visitor in'));
}

// --- the mark counts exactly the animals at Apex, and nothing else ---
{
  const three = [PLAYABLE[0].id, PLAYABLE[1].id, PLAYABLE[2].id];
  check('three at Apex means three marks', stars(draw(three)) === 3);
  check('...and an unearned roster stays unmarked', stars(draw([])) === 0);
}

// --- the panel's promise is the one visitors actually keeps ---
//
// The note tells the player that an Apex here is playable there. That is only true if the record
// this screen is drawn from is the record `earnedVisitors` reads, so check it end to end rather
// than trusting two files to agree about a storage key.
{
  const mine = PLAYABLE[0].id;
  const store = new Map<string, string>([[`${era.copy.settingsKey}-codex`, JSON.stringify({ apex: [mine] })]]);
  const readFromHere = (k: string) => store.get(k) ?? null;
  const elsewhere = (['cambrian', 'devonian', 'triassic'] as const).filter((e) => e !== era.id);
  const seen = elsewhere.map((e) => earnedVisitors(e, readFromHere).some((v) => v.id === mine));
  check('what this screen promises is what the other games offer', seen.every(Boolean),
    `${mine} reaches ${elsewhere.join(' and ')}`);
}

console.log(failed ? `FAILED (${failed})` : `all passed (${era.id})`);
process.exit(failed ? 1 : 0);
