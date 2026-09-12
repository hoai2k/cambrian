import type { SculptDoc } from './profile';

/**
 * The session's sculpt documents, one per specimen key, in memory only: reloading the page is
 * how you get back to what the codebase ships, and nothing here is a saved decision. What is
 * meant to leave the viewer leaves through "Export sculpt".
 */
const docs = new Map<string, SculptDoc>();

export const getSculpt = (key: string) => docs.get(key);
export const setSculpt = (key: string, doc: SculptDoc) => { docs.set(key, doc); };
export const clearSculpt = (key: string) => { docs.delete(key); };
