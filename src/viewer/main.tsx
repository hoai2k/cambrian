import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSchemes } from '../shared/palettes';
import { installStats } from '../shared/stats';
import { ALL_SCHEMES } from './catalogue';
import { Viewer } from './Viewer';
import './viewer.css';

// The viewer shows both eras' specimens on one page, but a page runs as one era (here the
// Cambrian), so the other pack's schemes are registered up front — otherwise a Devonian pick
// would resolve to nothing and the model would stay in its authored colours.
registerSchemes(ALL_SCHEMES);

// Counted like the games: the viewer is linked from outside and is a page in its own right.
installStats();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Viewer />
  </React.StrictMode>,
);
