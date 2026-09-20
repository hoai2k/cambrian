import type { StringOverrides } from '../strings';

/**
 * What the Devonian says for itself; everything else is the shared table in
 * `src/content/strings.ts`. See the Cambrian's file for how the two are joined.
 */
export const DEVONIAN_STRINGS: StringOverrides = {
  loading: {
    facts: [
      'Dunkleosteus had no teeth. It had shearing bone plates, and they were enough.',
      'Tiktaalik could prop itself up on its fins. The shallows were worth leaving the water for.',
      'Bothriolepis carried its head and chest in armour and dragged the rest behind it.',
      'The Cleveland Shale preserved a whole food chain, mid-meal.',
      'Stethacanthus wore a flat-topped spine brush above its shoulders. Nobody is sure why.',
      'The first forests grew this period, and their roots changed the sea.',
      'This is the age of fishes. Almost everything here is one.',
    ],
  },
  sim: {
    // The Devonian climbs five stages rather than the Cambrian's tiers.
    ladder: { rungs: ['', 'Floor', 'Shoal', 'Hunters', 'Giants'] },
    hints: {
      // The opening line, by the rung a body starts on: a hatchling and a half-grown hunter are
      // not owed the same advice.
      opening: [
        'Feed, hide, moult. Everything out there is bigger than you are today.',
        'Feed and keep your shoal. You grow on what you catch.',
        'Hunt the shoals. Five stages between you and Prime.',
        'Stay fed. The sea is hiding from you.',
      ],
    },
  },
};
