/**
 * The viewer's editors keep what a reviewer has done for the length of the page and no longer: in
 * memory only, never `localStorage`. Reloading the page is how you get back to the body's own guess,
 * nothing held here is a saved decision, and what is meant to leave the viewer leaves through the
 * editor's export. One of these per editor (sculpt, stretch, bend, mouth, mark), keyed by `bodyKey`
 * wherever the document is placed on one particular file.
 */
export function sessionStore<T>() {
  const items = new Map<string, T>();
  return {
    get: (key: string): T | undefined => items.get(key),
    set: (key: string, value: T) => { items.set(key, value); },
  };
}

/**
 * A specimen's key *and* the model path: a document placed on one file (vertex indices, a span, a
 * cut) belongs to that file, and the Model control can put a different one on the stage.
 */
export const bodyKey = (specimenKey: string, model: string) => `${specimenKey}|${model}`;
