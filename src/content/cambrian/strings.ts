import type { StringOverrides } from '../strings';

/**
 * What the Cambrian says for itself.
 *
 * Everything else it says is in `src/content/strings.ts`, shared with the other two games; this
 * file is only the lines that are about *this* sea — its animals, its water, its rules. Laid over
 * the shared table by `src/shared/text.ts`, so anything left out here keeps the shared wording.
 *
 * The title screen's own tagline, its loading line and the results eyebrow live on `copy` in
 * `index.ts` beside the settings key and the links to the other games, because the shell reads
 * them before it reads anything else.
 */
export const CAMBRIAN_STRINGS: StringOverrides = {
  loading: {
    // Under the bar on the boot screen, one at a time. About this era's animals: these used to be
    // shared, so a Devonian player waited for their sea while being told about Hallucigenia.
    facts: [
      'Anomalocaris was the largest animal of its time. About a metre. Terrifying, then.',
      'Opabinia had five eyes and a claw on a hose. Nobody has explained it since.',
      'Hallucigenia was reconstructed upside down for decades. The spines go on top.',
      'Trilobites could roll into a ball. Olenoides does it on Y.',
      'The Burgess Shale preserved soft bodies for 508 million years. Be grateful.',
      'Wiwaxia grazed microbial mats. Slow food, literally.',
      'Waptia looked like a shrimp and swam like one: fast, and gone.',
      'Everything here is smaller than your hand. Everything here is hungry.',
    ],
  },
  help: {
    huntingEraNote: 'Hallucigenia braces, Canadia flares its bristles, Olenoides rolls while blocking, and Wiwaxia releases a shove after holding block.',
    seaEraNote: 'The biomes run shelf, sponge forest, boulder fields, the channels, the escarpment, and the deep basin, where the giants live.',
    fightingEraNote: 'Waptia cannot guard, so it dodges instead.',
    growingEraNote: 'Marrella and Ottoia are the burrowers here.',
  },
};
