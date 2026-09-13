export type TriassicCreatureId =
  // the 21 playable animals (docs/triassic/01-triassic-design.md)
  | 'cymbospondylus' | 'shonisaurus'
  | 'nothosaurus' | 'dinocephalosaurus' | 'helicoprion' | 'rhaeticosaurus' | 'atopodentatus'
  | 'askeptosaurus' | 'placodus' | 'hybodus' | 'birgeria' | 'aphaneramma' | 'mixosaurus' | 'henodus' | 'saurichthys' | 'hupehsuchus'
  | 'keichousaurus' | 'cartorhynchus' | 'odontochelys' | 'ceratites' | 'phragmoteuthis'
  // the shore animals: modelled, placed on the beach, never played
  | 'tanystropheus' | 'mystriosuchus' | 'macrocnemus' | 'coelophysis';

/**
 * Triassic signature identities. The ones implemented as routines live in src/sim/triassic/
 * specials.ts; the rest ride the shared machinery (the Devonian's specials and the Cambrian's
 * `snatch`, `bristleFlare` and `ambushSurge` are reused by id where a kit asked for exactly them).
 * The three shore ids name what the shore module does with each animal; nothing presses them.
 */
export type TriassicAbilityId =
  | 'exhaustionHold' | 'podCall' | 'fangTrap' | 'neckStrike' | 'whorlSaw' | 'powerStroke' | 'scrapeSieve'
  | 'coil' | 'sideSwipe' | 'comb' | 'suctionSnap' | 'bellyTurn' | 'ink'
  | 'boomStrike' | 'surfaceLunge' | 'bolt';
