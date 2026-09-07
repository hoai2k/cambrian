import { ACTIVE_ERA } from '../content';
import { scheme, schemeForCreature } from './palettes';
import { resolvePortrait, type PortraitKind, type PortraitRecord } from './portrait-match';

const renders: Readonly<Record<string, PortraitRecord>> = ACTIVE_ERA.presentation.portraits;
/** A viewer override follows the selected scheme; game images follow the committed mapping. */
export function creaturePortrait(id: string, kind: PortraitKind, schemeId?: string) {
  return resolvePortrait(id, kind, schemeId === undefined ? scheme(schemeForCreature(id)) : scheme(schemeId), renders[id]);
}
