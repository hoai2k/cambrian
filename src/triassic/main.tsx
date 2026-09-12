import React from 'react';
import { createRoot } from 'react-dom/client';
import { selectEra } from '../content';
import { TRIASSIC } from '../content/triassic';
import { TRIASSIC_SAMPLES } from '../content/triassic/sfx';
import { nestedBase, setAppBase } from '../shared/base';
import '../app/styles.css';

/**
 * Triassic Triumph lives at /triassic/ beside the other two games. The era is chosen and the asset
 * base pointed one directory up before the app is imported, so every module-top read of
 * ACTIVE_ERA (creature tables, asset paths, era rules, the sea floor) sees the Triassic pack.
 */
selectEra(TRIASSIC);
setAppBase(nestedBase());

// Everything below is imported dynamically, after the era is chosen: a static import here would be
// evaluated first, and the audio library and the creature tables read ACTIVE_ERA as they load.
const { registerSamples } = await import('../audio/audio');
registerSamples(TRIASSIC_SAMPLES);
const { Root } = await import('../app/Root');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
