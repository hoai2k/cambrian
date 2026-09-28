import { bodyKey, sessionStore } from '../session-store';
import type { Marks } from './region';

/**
 * The session's marked regions, one per body (`bodyKey`), because the marks are vertex indices into
 * one particular file. What is meant to leave the viewer leaves through "Export region".
 */
const regions = sessionStore<{ marks: Marks; note: string }>();

export const regionKey = bodyKey;
export const getRegion = regions.get;
export const setRegion = (key: string, marks: Marks, note: string) => regions.set(key, { marks, note });
