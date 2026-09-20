import type { BendDoc } from './bend';

/**
 * The session's bend documents, one per body — a specimen's key *and* the model path, because a
 * span is placed on one particular file and the Model control can put a different one on the stage.
 * In memory only, like the sculpt, mark and mouth stores: reloading the page is how you get back to
 * the body's own guess, and what is meant to leave the viewer leaves through "Export bend".
 */
const docs = new Map<string, { doc: BendDoc; note: string }>();

export const bendKey = (specimenKey: string, model: string) => `${specimenKey}|${model}`;
export const getBend = (key: string) => docs.get(key);
export const setBend = (key: string, doc: BendDoc, note: string) => { docs.set(key, { doc, note }); };
