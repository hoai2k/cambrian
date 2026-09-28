import { TRIASSIC } from '../content/triassic';
import { TRIASSIC_SAMPLES } from '../content/triassic/sfx';
import { bootGame } from '../shared/boot-game';

/**
 * Triassic Triumph lives at /triassic/ beside the other two games. `bootGame` chooses the era and
 * points the asset base one directory up before the app is imported, so every module-top read of
 * ACTIVE_ERA (creature tables, asset paths, era rules, the sea floor) sees the Triassic pack.
 */
void bootGame(TRIASSIC, TRIASSIC_SAMPLES);
