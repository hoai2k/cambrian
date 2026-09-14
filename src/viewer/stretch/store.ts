import type { StretchDoc } from './stretch';

/**
 * The session's stretch documents, one per specimen key, in memory only. Reloading the page is how
 * you get back to the mesh as generated, and nothing here is a saved decision: a stretch becomes
 * real when it is exported and baked into the GLB by `tools/triassic/stretch.mjs`.
 */
const docs = new Map<string, StretchDoc>();

export const getStretch = (key: string) => docs.get(key);
export const setStretch = (key: string, doc: StretchDoc) => { docs.set(key, doc); };
export const clearStretch = (key: string) => { docs.delete(key); };
