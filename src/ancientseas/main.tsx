import React from 'react';
import { createRoot } from 'react-dom/client';
import { AncientSeas } from './AncientSeas';
import './ancientseas.css';

// The trilogy's page, and what the site root serves: the three games are at /cambrian/,
// /devonian/ and /triassic/ below it. It draws nothing but images and links, so unlike the game
// entries it has no era to select, no asset base to move and nothing to import lazily.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AncientSeas />
  </React.StrictMode>,
);
