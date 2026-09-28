import { CAMBRIAN } from '../content/cambrian';
import { bootGame } from '../shared/boot-game';

/**
 * Cambrian Conquest lives at /cambrian/, beside the other two games; the trilogy's page is what the
 * site root serves. The era is the build's default, but it is chosen here anyway so all three
 * entries read the same way: `bootGame` holds the order every entry depends on.
 */
void bootGame(CAMBRIAN);
