/**
 * The in-game menu cursor: the three rules that stand between the end of a fight and an answer.
 *
 * Usage: npx esbuild tools/menu-cursor-test.ts --bundle --platform=node --format=esm \
 *          --outfile=/tmp/mc.mjs && node /tmp/mc.mjs
 */
import { freshCursor, menuPress, MENU_LOCKOUT, type MenuCursor } from '../src/app/menu-cursor';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };

const N = 4;   // Continue · Play again · Change creatures · Quit to title

// A menu the player did not ask for opens with nothing selected; one they did opens on its default.
check('the results screen opens with nothing selected', !freshCursor(false).shown);
check('the pause menu opens with its default selected', freshCursor(true).shown);
check('...and the default is the first choice, the harmless one', freshCursor(true).sel === 0);

// Rule 1: the lockout drops everything, including the wake.
{
  const c = freshCursor(false);
  for (const ev of [{ confirm: true }, { step: 1 }, { other: true }]) {
    const r = menuPress(c, N, ev, true);
    check(`locked out, ${Object.keys(ev)[0]} does nothing at all`, !r.act && !r.cursor.shown);
  }
  check('the lockout is long enough to cover the tail of a fight', MENU_LOCKOUT >= 500, `${MENU_LOCKOUT} ms`);
}

// Rule 2: the first input wakes the cursor and takes nothing.
{
  let c = freshCursor(false);
  const first = menuPress(c, N, { confirm: true });
  check('the first confirm only wakes the cursor', !first.act && first.cursor.shown);
  check('...on the harmless default', first.cursor.sel === 0);
  c = first.cursor;
  const second = menuPress(c, N, { confirm: true });
  check('the second confirm takes the choice', second.act && second.cursor.sel === 0);
  // Any other button wakes it too, and equally takes nothing.
  const wake = menuPress(freshCursor(false), N, { other: true });
  check('any other button wakes it without choosing', !wake.act && wake.cursor.shown);
  const nudge = menuPress(freshCursor(false), N, { step: 1 });
  check('a direction wakes it without moving off the default', !nudge.act && nudge.cursor.shown && nudge.cursor.sel === 0);
}

// Movement wraps, and never acts by itself.
{
  let c: MenuCursor = freshCursor(true);
  const seen: number[] = [];
  for (let i = 0; i < N + 1; i++) { const r = menuPress(c, N, { step: 1 }); check(`stepping never chooses (${i})`, !r.act); c = r.cursor; seen.push(c.sel); }
  check('the list wraps', seen.join(',') === '1,2,3,0,1', seen.join(','));
  const back = menuPress(freshCursor(true), N, { step: -1 });
  check('and wraps backwards to the last choice', back.cursor.sel === N - 1, `sel=${back.cursor.sel}`);
}

// An empty menu can never act, whatever arrives.
check('a menu with no choices cannot be confirmed', !menuPress(freshCursor(true), 0, { confirm: true }).act);

console.log(failed ? `\n${failed} FAILED` : `\nall ${'menu cursor'} tests passed`); process.exit(failed ? 1 : 0);
