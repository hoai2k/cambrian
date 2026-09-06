import manifest from '../../public/assets/creatures/schemes/manifest.json';
import { creatureScheme } from './creature-schemes';
import { scheme } from './palettes';
import { resolvePortrait, type PortraitKind, type PortraitRecord } from './portrait-match';

const renders: Readonly<Record<string, PortraitRecord>> = manifest;
/** A viewer override follows the selected scheme; game images follow the committed mapping. */
export function creaturePortrait(id: string, kind: PortraitKind, schemeId?: string) {
  return resolvePortrait(id, kind, schemeId === undefined ? creatureScheme(id) : scheme(schemeId), renders[id]);
}
