import { CAMBRIAN } from './cambrian';
import type { EraDefinition } from './era';

/**
 * The build's composition point. Cambrian is the shipped default. A second entry page selects its
 * era once, before any module that reads it has evaluated (src/devonian/main.tsx does this and
 * then imports the app dynamically). There is deliberately no runtime switch: a live match's
 * simulation, queues and caches are all built for one era. Consumers read ACTIVE_ERA and stay
 * era-independent.
 */
export let ACTIVE_ERA: EraDefinition = CAMBRIAN;
export function selectEra(era: EraDefinition) { ACTIVE_ERA = era; }
export type { EraDefinition } from './era';
