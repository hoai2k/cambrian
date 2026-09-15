import React from 'react';
import { createRoot } from 'react-dom/client';
import { AncientSeas } from './AncientSeas';
import { DebugIndex } from './DebugIndex';
import { debugIndex } from '../shared/debug';
import { installStats } from '../shared/stats';
import './ancientseas.css';

// The trilogy's page, and what the site root serves: the three games are at /cambrian/,
// /devonian/ and /triassic/ below it. It draws nothing but images and links, so unlike the game
// entries it has no era to select, no asset base to move and nothing to import lazily.
//
// It is also the page a link from outside lands on first, so it counts a visit like the three
// games do — see src/shared/stats.ts, and /stats/ for the readout. The debug index is the one
// thing served from here that is not counted: it is a development tool, like the workbench, and
// a developer opening it is not a visit to the trilogy page.
const index = debugIndex();
if (!index) installStats();

// A bare `?debug` opens the index of the site's development tools in place of the page, the way
// `?debug=local` opens the state editor in place of a game. It is the trilogy page's because the
// tools it lists span all three games and several standalone pages, so no one game is their home.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {index ? <DebugIndex /> : <AncientSeas />}
  </React.StrictMode>,
);
