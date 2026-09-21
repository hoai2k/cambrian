import type { StringOverrides } from '../strings';

/**
 * What the Triassic says for itself; everything else is the shared table in
 * `src/content/strings.ts`. See the Cambrian's file for how the two are joined.
 */
export const TRIASSIC_STRINGS: StringOverrides = {
  loading: {
    facts: [
      'Shonisaurus grew past fifteen metres and had barely a tooth in its head.',
      'Tanystropheus’ neck was longer than the rest of it, and had only thirteen bones in it.',
      'Nothosaurus hunted with its teeth interlocking like a trap.',
      'Helicoprion carried its old teeth in a whorl instead of shedding them.',
      'Placodus crushed shellfish with teeth set in the roof of its mouth.',
      'These reptiles went back to the sea. They still had to come up to breathe.',
    ],
  },
  sim: {
    ladder: { rungs: ['', 'Floor', 'Shelf', 'Hunters', 'Giants'] },
    hints: {
      opening: [
        'Feed, hide, moult. Everything out there is bigger than you are today.',
        'Feed and grow. The deep is busier than the shallows, and everything in it is bigger.',
        'Hunt the shelf. Five stages between you and Prime.',
        'Stay fed. The deep is yours; the flats are closed to you.',
      ],
    },
  },
};
