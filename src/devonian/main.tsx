import React from 'react';
import { createRoot } from 'react-dom/client';
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

// Everything below is imported dynamically, after the era is chosen: a static import here would be
// evaluated first, and the audio library and the creature tables read ACTIVE_ERA as they load.
const { registerSamples } = await import('../audio/audio');
registerSamples(DEVONIAN_SAMPLES);
const { Root } = await import('../app/Root');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
