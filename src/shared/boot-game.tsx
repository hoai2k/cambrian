import React from 'react';
import { createRoot } from 'react-dom/client';
import { selectEra, type EraDefinition } from '../content';
import { nestedBase, setAppBase } from './base';
import { installStats } from './stats';
import '../app/styles.css';

/**
 * Start one of the three games. Each lives at `/<era>/` beside the others, and each entry
 * (src/cambrian/main.tsx and its two siblings) is one call to this.
 *
 * The order is the whole point. The era is chosen and the asset base pointed one directory up
 * before anything that reads either is evaluated — the creature tables, the asset paths, the era
 * rules and the audio library all read `ACTIVE_ERA` as they load — so the app and the audio
 * library are imported *dynamically*, after both: a static import here would be evaluated first.
 * `selectEra` throws if something read the era before it was chosen, so getting this wrong is an
 * error on the page rather than a game quietly half made of the Cambrian. Stats are installed
 * after the selection too (`installStats` reads neither, but `npm run stats` holds the order).
 *
 * `samples` are the era's own sound effects, registered with the audio library before the app
 * that plays them is loaded.
 */
export async function bootGame(era: EraDefinition, samples?: Record<string, string[]>) {
  selectEra(era);
  setAppBase(nestedBase());
  installStats();
  if (samples) {
    const { registerSamples } = await import('../audio/audio');
    registerSamples(samples);
  }
  const { Root } = await import('../app/Root');
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
}
