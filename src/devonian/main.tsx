import { DEVONIAN } from '../content/devonian';
import { DEVONIAN_SAMPLES } from '../content/devonian/sfx';
import { bootGame } from '../shared/boot-game';

/**
 * Devonian Domination lives at /devonian/ beside the other two games. `bootGame` chooses the era
 * and points the asset base one directory up before the app is imported, so every module-top read
 * of ACTIVE_ERA (creature tables, asset paths, era rules) sees the Devonian pack.
 */
void bootGame(DEVONIAN, DEVONIAN_SAMPLES);
