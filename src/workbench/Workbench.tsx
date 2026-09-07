/**
 * Development workbenches, selected with `?edit=`. The audio bench lives at
 * `/workbench/?edit=audio`; new benches get a section here and an entry in SECTIONS.
 */
import { lazy, Suspense } from 'react';
const EnvironmentBench = lazy(() => import('./EnvironmentBench').then(m => ({ default: m.EnvironmentBench })));
import { AudioBench } from './AudioBench';

const SECTIONS: Record<string, { title: string; blurb: string; render: () => React.ReactElement }> = {
  environment: { title: 'Environment', blurb: 'Biome paintings, static props and radar marks.', render: () => <Suspense fallback={<p className="bench">Loading environment…</p>}><EnvironmentBench /></Suspense> },
  audio: { title: 'Audio', blurb: 'Every sound in the game, on one page.', render: () => <AudioBench /> },
};

export function Workbench() {
  const section = new URLSearchParams(window.location.search).get('edit') ?? '';
  const active = SECTIONS[section];
  if (active) return active.render();
  return (
    <div className="bench">
      <header className="bench-head">
        <div>
          <a className="back" href="../">← Cambrian Explosion</a>
          <h1>Workbench</h1>
          <p className="sub">{section ? `No workbench called “${section}”.` : 'Pick a workbench.'}</p>
        </div>
      </header>
      <ul className="sounds">
        {Object.entries(SECTIONS).map(([key, s]) => (
          <li key={key} className="row">
            <a className="name" href={`?edit=${key}`}><b>{s.title}</b><small>?edit={key}</small></a>
            <p className="usage" role="note">{s.blurb}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
