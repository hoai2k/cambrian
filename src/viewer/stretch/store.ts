import type { StretchDoc } from './stretch';

/**
 * The session's stretch documents, in memory only. Reloading the page is how you get back to the
 * mesh as generated, and nothing here is a saved decision: a stretch becomes real when it is
 * exported and baked into the GLB by `tools/triassic/stretch.mjs`.
 *
 * One per **specimen and body**, as the mark, mouth and bend stores are, because a stretch is
 * placed on one file: the editor re-measures anyway where a kept document names another body, so
 * keying by the specimen alone was harmless only while the mode could not change bodies at all.
 * Now that its panel carries a Model control, one key per specimen would mean a swap silently
 * threw the other body's stretch away.
 */
export const stretchKey = (key: string, model: string) => `${key}|${model}`;

const docs = new Map<string, StretchDoc>();

export const getStretch = (key: string) => docs.get(key);
export const setStretch = (key: string, doc: StretchDoc) => { docs.set(key, doc); };
export const clearStretch = (key: string) => { docs.delete(key); };
