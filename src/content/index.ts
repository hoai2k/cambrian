import { CAMBRIAN } from './cambrian';

// The build's single composition point. No runtime era switch or unreleased content is exposed.
// Import a second content pack here when it is ready; consumers stay era-independent.
export const ACTIVE_ERA = CAMBRIAN;
export type { EraDefinition } from './era';
