import { assetPaths } from '../content/asset-paths';
import { SLOTS, type Scheme } from './palettes';

/** Bump when the luminance recolouring formula or material-to-slot rules change. */
export const PORTRAIT_RECOLOR_VERSION = 1;
export type PortraitKind = 'select' | 'card' | 'thumb';
export interface PortraitRecord {
  scheme: string;
  colors: Scheme['colors'];
  recolorVersion: number;
  files: Record<PortraitKind, string>;
}
/** Ordered values ignore JSON key order and hex case, but detect edits under the same name. */
export function paletteSignature(s: Pick<Scheme, 'id' | 'colors'>): string {
  return JSON.stringify([s.id, s.colors ? SLOTS.map((slot) => s.colors![slot]?.toLowerCase() ?? null) : null]);
}
export function portraitMatches(current: Scheme, rendered?: PortraitRecord): boolean {
  return !!rendered && rendered.recolorVersion === PORTRAIT_RECOLOR_VERSION &&
    paletteSignature(current) === paletteSignature({ id: rendered.scheme, colors: rendered.colors });
}
export function resolvePortrait(id: string, kind: PortraitKind, current: Scheme, rendered?: PortraitRecord) {
  const fallback = assetPaths.portrait(id, kind);
  return { src: portraitMatches(current, rendered) ? rendered!.files[kind] ?? fallback : fallback, fallback };
}
