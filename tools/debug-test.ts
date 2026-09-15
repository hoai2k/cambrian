/**
 * The debug entry points: they open only when asked for, and never by accident.
 * Run: npm run debug
 *
 * The editor at `?debug=local` can rewrite a player's whole save, so the only thing standing
 * between it and somebody who has simply loaded the game is this parameter check. That makes it
 * worth a test of its own: every ordinary URL must land on the game, and only the exact parameter
 * must open the tool.
 */
import assert from 'node:assert/strict';
import { debugGame, debugIndex, debugScreen } from '../src/shared/debug';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };

// The one thing that opens it, on either era's page — the parameter is all that matters, not the path.
ok(debugScreen('?debug=local') === 'local', '?debug=local opens the local state editor');
ok(debugScreen('?other=1&debug=local') === 'local', '...alongside other parameters');
ok(debugScreen('?debug=local&other=1') === 'local', '...in any order');
// Percent-encoding a parameter name is just another spelling of it — %64 is "d" — so this is the
// same parameter, not a way around the check. Asserted so the equivalence is deliberate.
ok(debugScreen('?%64ebug=local') === 'local', '...however the name is percent-encoded');
ok(debugScreen('?debug=%6Cocal') === 'local', '...or the value is');

// `?debug=game` is a different kind of thing: it arms the recorder *inside* the game rather than
// replacing the game with a tool, so it must never resolve to a screen — or it would swap the match
// for the state editor, which is the one thing it must not do.
ok(debugGame('?debug=game'), '?debug=game arms the match recorder');
ok(debugGame('?other=1&debug=game'), '...alongside other parameters');
ok(debugScreen('?debug=game') === undefined, '...and never opens a debug screen in place of the game');
ok(!debugGame('?debug=local'), 'the state editor does not arm the recorder');
ok(!debugGame(''), 'and an ordinary URL records nothing');
for (const search of ['', '?debug', '?debug=', '?debug=1', '?debug=Game', '?debug=games', '?debug=game2', '?nodebug=game', '#debug=game']) {
  ok(!debugGame(search), `"${search}" does not arm the recorder`);
}

// A bare `?debug` is the index of the tools, on the trilogy page. It takes the valueless parameter
// precisely so it can never collide with a named screen, so it must answer to that and nothing else.
ok(debugIndex('?debug'), '?debug opens the debug index');
ok(debugIndex('?debug='), '...written with an empty value too');
ok(debugIndex('?other=1&debug'), '...alongside other parameters');
ok(debugIndex('?%64ebug'), '...however the name is percent-encoded');
for (const search of ['', '?', '?debug=local', '?debug=game', '?debug=1', '?debugging', '?nodebug', '#debug']) {
  ok(!debugIndex(search), `"${search}" is not the debug index`);
}
// The three are mutually exclusive: a bare `?debug` must not also open a screen or arm the recorder,
// and a named tool must not also open the index in front of it.
ok(debugScreen('?debug') === undefined && !debugGame('?debug'), 'the index is not a screen and does not record');
ok(!debugIndex('?debug=local') && !debugIndex('?debug=game'), 'and a named tool is not the index');

// Everything else is the game.
for (const search of [
  '', '?', '?debug', '?debug=', '?debug=1', '?debug=true', '?debug=Local', '?debug=locale',
  '?debug=local2', '?debug=x&debug2=local', '?nodebug=local', '?d=local', '?debugging=local',
  '#debug=local',
]) {
  ok(debugScreen(search) === undefined, `"${search}" is the game, not a debug screen`);
}

// A malformed query string must not throw: it would take the whole page down with it.
for (const bad of ['?%', '?a=%E0%A4%A', '?=&=&', '?debug=%']) {
  let threw = false;
  try { debugScreen(bad); } catch { threw = true; }
  ok(!threw, `"${bad}" is survivable`);
}

console.log(`${passes} debug entry assertions passed`);
