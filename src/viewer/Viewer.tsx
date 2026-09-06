import { CreaturePortrait } from '../app/CreaturePortrait';
import { useEffect, useRef, useState } from 'react';
import { CREATURES, type CreatureId } from '../sim/creatures';
import { SCHEMES, scheme, schemeForCreature, SLOT_LABEL, type Slot } from '../shared/palettes';
import { ASSET_BASE, createViewerScene, type ViewerScene } from './scene';

const SPEEDS = [0.25, 0.5, 1, 2];

/**
 * Each creature starts on the scheme the game draws it in (CREATURE_SCHEMES), so the viewer shows
 * what a match shows. Picks made here are per creature and last for the browser session only:
 * they are a way to try palettes on, not a saved decision. "Export colours" is how a set of picks
 * leaves the viewer and becomes a proposed update to those defaults.
 */
const STORE_KEY = 'cambrian.viewer.schemes';

type Picks = Partial<Record<CreatureId, string>>;

function readPicks(): Picks {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Picks) : {};
  } catch {
    return {};
  }
}

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
  const [picks, setPicks] = useState<Picks>(readPicks);
  const [slots, setSlots] = useState<readonly Slot[]>([]);

  // The show effect must not re-run when a pick changes, so it reads the picks through a ref.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const schemeId = picks[id] ?? schemeForCreature(id);
  const activeScheme = scheme(schemeId);

  useEffect(() => {
    const s = createViewerScene(canvasRef.current!);
    sceneRef.current = s;
    s.onClip(setActive);
    return () => { s.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setClips([]); setSlots([]);
    // Set the scheme before the model is built so it never appears in the wrong palette first.
    sceneRef.current?.setScheme(picksRef.current[id] ?? schemeForCreature(id));
    sceneRef.current?.show(id)
      .then((names) => {
        if (cancelled) return;
        setClips(names); setSlots(sceneRef.current?.activeSlots() ?? []); setLoading(false);
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { sceneRef.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { sceneRef.current?.setScheme(schemeId); }, [schemeId]);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(picks)); } catch { /* private mode: picks stay in memory */ }
  }, [picks]);

  function exportColors() {
    const payload = {
      generated: new Date().toISOString(),
      note: 'Colour scheme picked per creature in the viewer. Slots are assigned from GLB material names by slotFor() in src/shared/palettes.ts.',
      creatures: Object.fromEntries(CREATURES.map((c) => {
        const s = scheme(picks[c.id] ?? schemeForCreature(c.id));
        return [c.id, { scheme: s.id, name: s.name, colors: s.colors }];
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cambrian-colour-schemes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const def = CREATURES.find((c) => c.id === id)!;
  // Only count picks that differ from what the game already uses — those are the proposed changes.
  const changed = CREATURES.filter((c) => (picks[c.id] ?? schemeForCreature(c.id)) !== schemeForCreature(c.id)).length;

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
                <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSET_BASE} schemeId={picks[c.id] ?? schemeForCreature(c.id)} alt="" draggable={false} />
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
        <h2 className={def.name.length > 11 ? 'long-name' : undefined}>{def.name}</h2>
        <p>{def.provenance ?? 'Burgess Shale'} · {clips.length} clips</p>
        <p className="hint">Drag to orbit · right-drag to pan · scroll to zoom</p>
        <button className="ghost" onClick={() => sceneRef.current?.resetCamera()}>Reset view</button>

        <section className="scheme" aria-label="Colour scheme">
          <h3>Colours</h3>
          <label className="scheme-pick">
            <span className="sr-only">Colour scheme for {def.name}</span>
            <select value={schemeId} onChange={(e) => setPicks((p) => ({ ...p, [id]: e.target.value }))}>
              {SCHEMES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <p className="scheme-note">{activeScheme.note}</p>
          {activeScheme.colors && slots.length > 0 && (
            <ul className="swatches">
              {slots.map((slot) => (
                <li key={slot} title={`${SLOT_LABEL[slot]} · ${activeScheme.colors![slot]}`}>
                  <i style={{ background: activeScheme.colors![slot] }} />
                  <span>{SLOT_LABEL[slot]}</span>
                </li>
              ))}
            </ul>
          )}
          <button className="ghost" onClick={exportColors}>
            Export colours{changed > 0 ? ` (${changed} changed)` : ''}
          </button>
        </section>
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
