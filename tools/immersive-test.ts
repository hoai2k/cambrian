/**
 * Sense off is meant to read as the bare simulation, and the icon buttons are part of what is over
 * the sea. This covers where they land — including the case the layout makes easy to get wrong,
 * where one player owns both bottom corners.
 *
 * Usage: npm run immersive
 */
import { layoutRects } from '../src/render/engine';
import { toolbarPlace, type ToolbarView } from '../src/app/toolbar-place';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(62)} ${d}`); if (!ok) failed++; };

/** The real split for `n` players at a plausible window size, with each player's sense state. */
const views = (sense: boolean[]): ToolbarView[] =>
  layoutRects(sense.length, 1600, 900).map((rect, i) => ({ rect, senseOn: sense[i] }));

const place = (sense: boolean[], menu = false) => toolbarPlace(views(sense), menu);

// Nothing to go on (the title screen, the roster) keeps the buttons where they have always been.
check('with no viewports the buttons stay bottom right', toolbarPlace([]) === 'right');

// One player fills the screen, so they own both corners: on, stay; off, nowhere to move to.
check('solo with sense on: bottom right', place([true]) === 'right');
check('solo with sense off: not drawn at all', place([false]) === 'hidden', place([false]));
check('...unless a menu is open over the sea', place([false], true) === 'left', place([false], true));

// Two players split left/right. The right-hand player owns the corner the buttons are in.
check('split, right player has sense on: stays right', place([false, true]) === 'right');
check('split, right player off but left on: moves left', place([true, false]) === 'left');
check('split, both off: not drawn', place([false, false]) === 'hidden');

// Four players quarter the screen: the bottom two rows own the bottom corners, and the top two
// have no say in it at all.
check('quads, bottom-right on: stays right', place([false, false, false, true]) === 'right');
check('quads, bottom-right off, bottom-left on: moves left', place([false, false, true, false]) === 'left');
check('quads, both bottom players off: not drawn', place([true, true, false, false]) === 'hidden');
check('quads, the top row cannot move the buttons', place([false, false, true, true]) === 'right');

// Three players leave the bottom-right quarter empty. Nobody is looking at that corner, so the
// buttons belong there whatever anyone's sense is set to — it is the one spot over no player's sea.
check('three players: nobody owns the bottom right, so the buttons stay', place([true, true, false]) === 'right', place([true, true, false]));
check('...however the bottom-left player has their sense set', place([false, false, true]) === 'right');

// A menu always brings them back, wherever they were hiding.
for (const sense of [[false], [false, false], [false, false, false, false]]) {
  check(`a menu brings the buttons back (${sense.length} up)`, place(sense, true) !== 'hidden');
}

console.log(failed ? `\n${failed} FAILED` : '\nall immersive-mode toolbar tests passed'); process.exit(failed ? 1 : 0);
