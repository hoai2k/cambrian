import { scheme } from './palettes';

/** Game palette picks. Colours are resolved from palettes.ts, never from render metadata. */
export const CREATURE_SCHEMES: Readonly<Record<string, string>> = {
  "anomalocaris": "coral-flare",
  "opabinia": "seagrass-teal",
  "waptia": "sandflat-tan",
  "canadia": "kelp-olive",
  "hallucigenia": "sandflat-tan",
  "wiwaxia": "wiwaxia-nacre",
  "marrella": "countershade",
  "olenoides": "sandflat-tan",
  "pikaia": "default",
  "nectocaris": "canadia-iridium",
  "burgessomedusa": "default",
  "odaraia": "default",
  "ottoia": "countershade",
  "cambroraster": "lagoon-neon",
  "sidneyia": "default",
  "leanchoilia": "default",
  "isoxys": "default",
  "odontogriphus": "sandflat-tan",
  "ctenorhabdotus": "default",
  "vetulicola": "default",
  "tamisiocaris": "default"
};

export const creatureScheme = (id: string) => scheme(CREATURE_SCHEMES[id] ?? 'default');
