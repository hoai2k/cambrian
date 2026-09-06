import React from 'react';
import { createRoot } from 'react-dom/client';
import { setAssetBase } from '../audio/audio';
import { Workbench } from './Workbench';
import './workbench.css';

// The workbench lives one directory below the app, so BASE_URL ('./' in a built bundle) would
// resolve samples to /workbench/assets/. Step back up a level; in dev BASE_URL is an absolute '/'.
const base = import.meta.env.BASE_URL;
setAssetBase(base.startsWith('/') ? base : '../');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Workbench />
  </React.StrictMode>,
);
