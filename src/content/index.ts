import { CAMBRIAN } from './cambrian';
import type { EraDefinition } from './era';

/**
 * The build's composition point. Cambrian is the shipped default. A game's entry page selects its
 * era once, before any module that reads it has evaluated (`bootGame` in src/shared/boot-game.tsx
 * does this and then imports the app dynamically). There is deliberately no runtime switch: a live
 * match's simulation, queues and caches are all built for one era. Consumers read ACTIVE_ERA and
 * stay era-independent.
 *
 * **Selecting too late fails loudly.** Modules read ACTIVE_ERA at module top, so one imported before
 * `selectEra` has already taken the Cambrian's values and keeps them; selecting the Devonian after
 * that used to succeed and leave the page half one game and half the other. So the default is
 * watched: the first read of it before any `selectEra` is remembered (with where it happened), and
 * a first `selectEra` of a *different* era after such a read throws, naming the read. Reading first
 * and then selecting the Cambrian itself is harmless and allowed. The watch costs one trap on that
 * first read and nothing after it: the trap swaps the live binding for the plain object, so every
 * later read — every headless Cambrian run never calls `selectEra` at all — is an ordinary property
 * access.
 */
let earlyRead: string | undefined;
let selected = false;
const touched = () => {
  if (earlyRead === undefined) earlyRead = (new Error().stack ?? '').split('\n').slice(2, 8).join('\n') || '(no stack)';
  ACTIVE_ERA = CAMBRIAN;
};
const watchedDefault = new Proxy(CAMBRIAN, {
  get(t, k, r) { touched(); return Reflect.get(t, k, r); },
  has(t, k) { touched(); return Reflect.has(t, k); },
  ownKeys(t) { touched(); return Reflect.ownKeys(t); },
  getOwnPropertyDescriptor(t, k) { touched(); return Reflect.getOwnPropertyDescriptor(t, k); },
});

export let ACTIVE_ERA: EraDefinition = watchedDefault;

export function selectEra(era: EraDefinition) {
  if (!selected && era !== CAMBRIAN && earlyRead !== undefined) {
    throw new Error(`selectEra(${era.id}) came after ACTIVE_ERA had already been read as the default (the Cambrian). `
      + `Whatever read it has the wrong era's values: select the era before importing anything that reads it `
      + `(import the app dynamically, as bootGame does). The first read was at:\n${earlyRead}`);
  }
  selected = true;
  ACTIVE_ERA = era;
}

/** Where the default era was first read before any `selectEra`, if it was: for the checks. */
export const eraReadEarly = (): string | undefined => earlyRead;
export type { EraDefinition } from './era';
