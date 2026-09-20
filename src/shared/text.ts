import { ACTIVE_ERA } from '../content';
import { mergeStrings, SHARED_STRINGS, type GameStrings } from '../content/strings';

/**
 * Every word this game says: the shared table with the active era's own lines laid over it.
 *
 * One import for the whole interface — `TEXT.pause.heading`, `TEXT.hud.grip.releaseToEat` — so a
 * component never spells a sentence out and the messaging is editable in
 * `src/content/strings.ts` (shared) or `src/content/<era>/strings.ts` (this game's own). The
 * trilogy page has its own table in `src/ancientseas/strings.ts` and must not import this one: it
 * is no game's page and reads `ACTIVE_ERA` nowhere.
 *
 * Resolved once, at import: like the rest of the content layer this reads `ACTIVE_ERA` at module
 * top, so an entry page selects its era *before* importing anything that reaches this.
 */
export const TEXT: GameStrings = mergeStrings(SHARED_STRINGS, ACTIVE_ERA.strings);
