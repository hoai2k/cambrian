import React from 'react';
import { createRoot } from 'react-dom/client';
import { selectEra } from '../content';
import { CAMBRIAN } from '../content/cambrian';
import { nestedBase, setAppBase } from '../shared/base';
import { installStats } from '../shared/stats';
import '../app/styles.css';

/**
 * Cambrian Conquest lives at /cambrian/, beside the other two games; the trilogy's page is what
 * the site root now serves. The era is the build's default, but it is chosen here anyway so all
 * three entries read the same way, and the asset base is pointed one directory up before the app
 * is imported — every module-top read of ACTIVE_ERA and every URL built from `appBase()` has to
 * happen after both.
 */
selectEra(CAMBRIAN);
setAppBase(nestedBase());
installStats();

// Imported after the era and the base are set, for the reason src/devonian/main.tsx gives: a
// static import here would be evaluated first, and the audio library and the creature tables read
// ACTIVE_ERA as they load.
const { Root } = await import('../app/Root');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
