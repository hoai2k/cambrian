import type { Scheme, Slot } from '../shared/palettes';

/**
 * Tables an era pack derives from its roster, shared by the two packs whose bodies arrive over time
 * (the Devonian and the Triassic). Type-only imports: a pack module must not read `ACTIVE_ERA`.
 */

/**
 * Model sizes for the streaming loader's progress estimate: an animal's own delivered body
 * (`asset-sizes.json`), else the size of the body it borrows until then, else a placeholder of one
 * byte so era validation passes. A borrowed body reports its own size, so the progress bar is
 * honest about what is actually fetched.
 */
export function modelBytesFor(ids: readonly string[], shipped: Readonly<Record<string, number>>, borrowed: (id: string) => number | undefined): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, shipped[id] ?? borrowed(id) ?? 1]));
}

/**
 * Camouflage's fallback colours per creature: its default scheme's slots, or — where no scheme is
 * in play, which means the authored colours — the creature's own body and accent.
 */
export function authoredCreatureColors(
  creatures: readonly { id: string; color: string; accent: string }[],
  schemes: readonly Scheme[],
  creatureSchemes: Readonly<Record<string, string>>,
): Record<string, Record<Slot, string>> {
  return Object.fromEntries(creatures.map((c) => {
    const scheme = schemes.find((s) => s.id === creatureSchemes[c.id]);
    return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
  }));
}
