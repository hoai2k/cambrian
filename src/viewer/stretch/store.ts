import { bodyKey, sessionStore } from '../session-store';
import type { StretchDoc } from './stretch';

/**
 * The session's stretch documents. Nothing here is a saved decision: a stretch becomes real when it
 * is exported and baked into the GLB by `tools/triassic/stretch.mjs`.
 *
 * One per **specimen and body** (`bodyKey`), as the mark, mouth and bend stores are, because a
 * stretch is placed on one file: the editor re-measures anyway where a kept document names another
 * body, so keying by the specimen alone was harmless only while the mode could not change bodies at
 * all. Now that its panel carries a Model control, one key per specimen would mean a swap silently
 * threw the other body's stretch away.
 */
export const stretchKey = bodyKey;

const docs = sessionStore<StretchDoc>();

export const getStretch = docs.get;
export const setStretch = docs.set;
