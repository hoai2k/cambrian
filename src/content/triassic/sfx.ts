/**
 * Event kind → Triassic sample files, registered by the /triassic/ entry before the audio library
 * preloads. No Triassic recordings exist yet (docs/audio-requests.md lists them — the blow is the
 * era's signature sound and wants a real recording), so every entry here points at a delivered
 * Devonian or shared sample that is close enough to stand in. Swap a line when its file lands.
 */
export const TRIASSIC_SAMPLES: Record<string, string[]> = {
  gulp: ['devonian/air-gulp'],            // the blow at the surface
  winded: ['devonian/air-low'],           // the bar running down with no way to refill it
  armour: ['devonian/armour-clang-1', 'devonian/armour-clang-2'],
  armourPierce: ['devonian/armour-pierce'],
  jet: ['devonian/jet-1', 'devonian/jet-2'],
  withdraw: ['devonian/withdraw'],
  shoalJoin: ['devonian/shoal-join'],
  shellCrush: ['devonian/shell-crush'],
  breach: ['devonian/breach'],
  splash: ['devonian/splash-1', 'devonian/splash-2'],
  'ability:exhaustionHold': ['devonian/jaw-shear'], 'ability:fangTrap': ['devonian/chelicerae-grab'], 'ability:neckStrike': ['devonian/neck-snap'],
  'ability:whorlSaw': ['devonian/tusk-lunge'], 'ability:powerStroke': ['devonian/shoal-dart'], 'ability:scrapeSieve': ['devonian/floor-sweep'],
  'ability:coil': ['devonian/shoal-dart'], 'ability:sideSwipe': ['devonian/armour-flank'], 'ability:comb': ['devonian/filter-gulp'],
  'ability:suctionSnap': ['devonian/filter-gulp'], 'ability:ink': ['devonian/jet-1'], 'ability:podCall': ['devonian/shoal-join'],
  'ability:crushBite': ['devonian/crush-bite'], 'ability:runThrough': ['devonian/run-through'], 'ability:shoalDart': ['devonian/shoal-dart'],
  'ability:filterGulp': ['devonian/filter-gulp'], 'ability:shellHover': ['devonian/shell-hover'], 'ability:cheliceraeGrab': ['devonian/chelicerae-grab'],
};
