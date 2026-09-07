import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSamples } from '../audio/audio';
import { selectEra } from '../content';
import { DEVONIAN } from '../content/devonian';
import { DEVONIAN_SAMPLES } from '../content/devonian/sfx';
import { nestedBase, setAppBase } from '../shared/base';
import '../app/styles.css';

/**
 * Devonian Domination lives at /devonian/ beside the Cambrian game. The era is chosen and the
 * asset base pointed one directory up before the app is imported, so every module-top read of
 * ACTIVE_ERA (creature tables, asset paths, era rules) sees the Devonian pack.
 */
selectEra(DEVONIAN);
setAppBase(nestedBase());
registerSamples(DEVONIAN_SAMPLES);

const { App } = await import('../app/App');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
