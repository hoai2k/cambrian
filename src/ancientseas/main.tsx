import React from 'react';
import { createRoot } from 'react-dom/client';
import { AncientSeas } from './AncientSeas';
import './ancientseas.css';

// A title page for the three games, one level below the app root like /devonian/ and /triassic/.
// It draws nothing but images and links, so unlike those entries it has no era to select and
// nothing to import lazily.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AncientSeas />
  </React.StrictMode>,
);
