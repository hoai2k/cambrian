import { bodyKey, sessionStore } from '../session-store';
import type { MouthDoc } from './mouth';

/**
 * The session's mouth documents, one per body (`bodyKey`), because a cut is aimed on one particular
 * file. What is meant to leave the viewer leaves through "Export mouth".
 */
const docs = sessionStore<{ doc: MouthDoc; note: string }>();

export const mouthKey = bodyKey;
export const getMouth = docs.get;
export const setMouth = (key: string, doc: MouthDoc, note: string) => docs.set(key, { doc, note });
