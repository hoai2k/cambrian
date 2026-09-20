/**
 * Event kind → Triassic sample files, registered by the /triassic/ entry before the audio library
 * preloads. The era's signature breath, winded pulse and shore strike now have their own recordings;
 * the remaining combat vocabulary deliberately continues to borrow the nearest delivered sound.
 */
export const TRIASSIC_SAMPLES: Record<string, string[]> = {
  gulp: ['triassic/blow-mid'],             // fallback for callers without a body size
  'gulp-small': ['triassic/blow-small'], 'gulp-mid': ['triassic/blow-mid'], 'gulp-giant': ['triassic/blow-giant'],
  beach: ['devonian/beach'],              // a leap, or a walk, coming down on the sand (src/sim/beach.ts)
  winded: ['triassic/winded'], 'triassic:winded': ['triassic/winded'], // alias keeps both eras distinct in the workbench
  shoreStrike: ['triassic/shore-strike'],
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
