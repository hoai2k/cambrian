import type { MouthDoc } from './mouth';

/**
 * The session's mouth documents, one per body — a specimen's key *and* the model path, because a
 * cut is aimed on one particular file and the Model control can put a different one on the stage.
 * In memory only, like the sculpt and mark stores: reloading the page is how you get back to the
 * body's own guess, and what is meant to leave the viewer leaves through "Export mouth".
 */
const docs = new Map<string, { doc: MouthDoc; note: string }>();

export const mouthKey = (specimenKey: string, model: string) => `${specimenKey}|${model}`;
export const getMouth = (key: string) => docs.get(key);
export const setMouth = (key: string, doc: MouthDoc, note: string) => { docs.set(key, { doc, note }); };
