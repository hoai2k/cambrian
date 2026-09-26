import { ACTIVE_ERA } from '../content';

/** Devonian's large skinned models need a smaller resident set on touch-first hardware. */
export const mobileDevonian = () => ACTIVE_ERA.id === 'devonian' &&
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse) and (hover: none)').matches;
