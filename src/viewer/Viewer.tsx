import { useEffect, useRef, useState } from 'react';
import { CREATURES, type CreatureId } from '../sim/creatures';
import { ASSET_BASE, createViewerScene, type ViewerScene } from './scene';

const SPEEDS = [0.25, 0.5, 1, 2];

export function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const [id, setId] = useState<CreatureId>(CREATURES[0].id);
  const [clips, setClips] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = createViewerScene(canvasRef.current!);
    sceneRef.current = s;
    s.onClip(setActive);
    return () => { s.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setClips([]);
    sceneRef.current?.show(id)
      .then((names) => { if (!cancelled) { setClips(names); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { sceneRef.current?.setSpeed(speed); }, [speed]);

  const def = CREATURES.find((c) => c.id === id)!;

  return (
    <div className="viewer">
      <canvas ref={canvasRef} className="viewer-canvas" />

      <aside className="specimens" aria-label="Specimens">
        <header>
          <a className="back" href="../">← Cambrian Explosion</a>
          <h1>Specimens</h1>
        </header>
        <ul>
          {CREATURES.map((c) => (
            <li key={c.id}>
              <button className={`specimen ${c.id === id ? 'active' : ''}`} aria-pressed={c.id === id} onClick={() => setId(c.id)}>
                <img src={`${ASSET_BASE}assets/creatures/${c.id}.card.png`} alt="" draggable={false} />
                <span>
                  <b>{c.name}</b>
                  <small>{c.species}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="info">
        <span className="role">{def.ground ? 'SEAFLOOR' : 'SWIMMER'} · {def.role}</span>
        <h2>{def.name}</h2>
        <p>{def.provenance ?? 'Burgess Shale'} · {clips.length} clips</p>
        <p className="hint">Drag to orbit · right-drag to pan · scroll to zoom</p>
        <button className="ghost" onClick={() => sceneRef.current?.resetCamera()}>Reset view</button>
      </div>

      <section className="clips" aria-label="Animations">
        <div className="clips-head">
          <h3>Animations</h3>
          <label className="toggle">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
            <span>Loop one-shots</span>
          </label>
          <div className="speeds" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button key={s} className={`speed ${s === speed ? 'active' : ''}`} aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div>
        </div>
        <div className="clip-grid">
          {clips.map((name) => (
            <button key={name} className={`clip ${name === active ? 'active' : ''}`} aria-pressed={name === active} onClick={() => sceneRef.current?.play(name, loop)}>
              {name}
            </button>
          ))}
        </div>
      </section>

      {(loading || error) && (
        <div className={`status ${error ? 'error' : ''}`} role="status">{error || `Loading ${def.name}…`}</div>
      )}
    </div>
  );
}
