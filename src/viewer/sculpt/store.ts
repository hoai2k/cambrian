import { sessionStore } from '../session-store';
import type { SculptDoc } from './profile';

/**
 * The session's sculpt documents, one per specimen key: nothing here is a saved decision, and what
 * is meant to leave the viewer leaves through "Export sculpt".
 */
const docs = sessionStore<SculptDoc>();

export const getSculpt = docs.get;
export const setSculpt = docs.set;
