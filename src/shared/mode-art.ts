/**
 * The picture on each mode's chip, by file.
 *
 * A mode's art is a mood rather than an illustration of its rules, so a mode that has no painting of
 * its own borrows one: Survival was added after the set was painted and wears the retired Hunted
 * mode's. Both places that name the file — the chip and the preloader — go through here, so the
 * preloader fetches exactly the picture the chip draws.
 */
const BORROWED_ART: Readonly<Record<string, string>> = { survival: 'hunted' };

export const modeArtFile = (mode: string) => `mode-${BORROWED_ART[mode] ?? mode}.webp`;
