import type { Marks } from './region';

/**
 * The session's marked regions, one per body — a specimen's key *and* the model path, because the
 * marks are vertex indices into one particular file and the Body control can put a different one
 * on the stage. In memory only, like the sculpt store: reloading the page is how you get back to
 * an unmarked body, and what is meant to leave the viewer leaves through "Export region".
 */
const regions = new Map<string, { marks: Marks; note: string }>();

export const regionKey = (specimenKey: string, model: string) => `${specimenKey}|${model}`;
export const getRegion = (key: string) => regions.get(key);
export const setRegion = (key: string, marks: Marks, note: string) => { regions.set(key, { marks, note }); };
