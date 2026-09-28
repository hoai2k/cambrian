import { bodyKey, sessionStore } from '../session-store';
import type { BendDoc } from './bend';

/**
 * The session's bend documents, one per body (`bodyKey`), because a span is placed on one
 * particular file. What is meant to leave the viewer leaves through "Export bend".
 */
const docs = sessionStore<{ doc: BendDoc; note: string }>();

export const bendKey = bodyKey;
export const getBend = docs.get;
export const setBend = (key: string, doc: BendDoc, note: string) => docs.set(key, { doc, note });
