export type TriassicCreatureId =
  // the 21 playable animals (docs/triassic/01-triassic-design.md)
  | 'cymbospondylus' | 'shonisaurus'
  | 'nothosaurus' | 'dinocephalosaurus' | 'helicoprion' | 'rhaeticosaurus' | 'atopodentatus'
  | 'askeptosaurus' | 'placodus' | 'hybodus' | 'birgeria' | 'aphaneramma' | 'mixosaurus' | 'henodus' | 'saurichthys' | 'hupehsuchus'
  | 'keichousaurus' | 'cartorhynchus' | 'odontochelys' | 'ceratites' | 'phragmoteuthis'
  // the shore animals: modelled, placed on the beach, never played
  | 'tanystropheus' | 'mystriosuchus' | 'macrocnemus' | 'coelophysis';

/**
 * The **standing guests**: animals whose bodies are built here and whose era is not this one.
 *
 * Archelon and Mosasaurus are Late Cretaceous, and where they belong is the open question in
 * `docs/triassic/05-mesozoic-expansion.md`. Being in `TriassicCreatureId` is not itself what puts
 * an animal in the sea -- `TRIASSIC_CREATURES` is -- but it is load-bearing all the same, because
 * `BORROWED` and the palette tables are *total* records over that union and would quietly start
 * demanding entries for a sea these two are not in. So they get their own union, joined to
 * `CreatureId` alongside it: they resolve through `creature()` as visitors and appear in none of
 * the era's own tables.
 */
export type TriassicGuestId = 'archelon' | 'mosasaurus';

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
