import { ClipQueuedBadge, ModelStatusBadge } from '../shared/ModelStatusBadge';
import { CreaturePortrait } from '../app/CreaturePortrait';
import { useEffect, useRef, useState } from 'react';
import { COLLECTIONS, isPropCollection, paletteFor, SPECIMENS, specimenByKey, type CollectionId } from './catalogue';
import { scheme, SLOT_LABEL, type Slot } from '../shared/palettes';
import { ASSET_BASE, createViewerScene, isReplaced, replacedName, type PlaybackState, type ViewerScene } from './scene';
import { SculptEditor } from './sculpt/SculptEditor';
import { MarkEditor } from './mark/MarkEditor';
import { getSculpt } from './sculpt/store';
import { isIdentity, warp } from './sculpt/profile';
import { StretchEditor } from './stretch/StretchEditor';
import { getStretch } from './stretch/store';
import { isIdentity as stretchIsIdentity, warp as stretchWarp } from './stretch/stretch';

const SPEEDS = [0.25, 0.5, 1, 2];

/**
 * Each creature starts on the scheme the game draws it in (CREATURE_SCHEMES), so the viewer shows
 * what a match shows. Picks made here are per creature and last for the browser session only:
 * they are a way to try palettes on, not a saved decision. "Export colours" is how a set of picks
 * leaves the viewer and becomes a proposed update to those defaults.
 */
const STORE_KEY = 'cambrian.viewer.schemes';

type Picks = Partial<Record<string, string>>;

function readPicks(): Picks {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k.includes(':') ? k : `cambrian:${k}`, v])) as Picks : {};
  } catch {
    return {};
  }
}

/** What the page is doing with the specimen: looking at it, reshaping it, lengthening a run of it, or marking it up. */
type Mode = 'view' | 'sculpt' | 'mark' | 'stretch';

/**
 * The page remembers which specimen it is showing in the URL (`?specimen=<key>`, and `&mode=sculpt`,
 * `&mode=mark` or `&mode=stretch` while editing), so a reload — or a link — comes back to the same
 * creature. Nothing else is kept there: the view, the clip, any sculpt in progress and any marked
 * region start over.
 *
 * `mode=stretch` does not also restore the generated body it applies to, because which body is on
 * stage is not in the URL at all; the editor is shown only once one is, and the mode falls back to
 * the view until then.
 */
function readUrlState(): { key: string; mode: Mode } {
  const params = new URLSearchParams(location.search);
  const requested = params.get('specimen') ?? '';
  const key = specimenByKey.has(requested) ? requested : SPECIMENS[0].key;
  const asked = params.get('mode');
  // None of the editing modes means anything on a prop: there is no body to reshape, no run to
  // lengthen, and nothing to cut off one. Sculpting is narrower still — see `sculptable` below:
  // a link to `mode=sculpt` on a Triassic animal opens the view rather than an editor that could
  // not export anything portable.
  const collection = specimenByKey.get(key)?.collection;
  const editable = !isPropCollection(collection);
  const asking = asked === 'mark' || asked === 'stretch' || (asked === 'sculpt' && collection !== 'triassic');
  return { key, mode: editable && asking ? asked as Mode : 'view' };
}
function writeUrlState(key: string, mode: Mode) {
  const params = new URLSearchParams(location.search);
  params.set('specimen', key);
  if (mode === 'view') params.delete('mode'); else params.set('mode', mode);
  const url = `${location.pathname}?${params.toString()}${location.hash}`;
  if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(null, '', url);
}

export function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const initial = useRef(readUrlState());
  const [collection, setCollection] = useState<CollectionId>(specimenByKey.get(initial.current.key)!.collection);
  const [id, setId] = useState(initial.current.key);
  const [mode, setMode] = useState<Mode>(initial.current.mode);
  const [detail, setDetail] = useState<'full' | 'reduced'>('full');
  /**
   * Which body of a pair is on stage. The procedural twin is built to the generated model's own
   * volume on the same skeleton, and the whole point of having both is that a human can see one
   * become the other — so this swaps in place: the stage is not cleared, the camera is preserved,
   * and the clip keeps playing, which turns any difference between them into movement rather than
   * something to hold in your head across two list entries.
   */
  const openingBody = (key: string, mode?: Mode): 'model' | 'generated' => {
    const c = specimenByKey.get(key)!;
    // A stretch is an edit to the raw generation, so a link into it opens that body even for an
    // animal whose built body is waiting on a human and would otherwise win below.
    if (mode === 'stretch' && c.generated) return 'generated';
    // A body that is built and waiting on a human is the thing to open on, even though the animal
    // also still has the raw mesh it was built from. Only when there is no built body does the
    // generated mesh win, because then `model` is somebody else's body borrowed in play.
    return c.generated && !c.inReview ? 'generated' : 'model';
  };
  const [body, setBody] = useState<'model' | 'puppet' | 'generated'>(() => openingBody(initial.current.key, initial.current.mode));
  const requestedId = useRef('');
  const def = specimenByKey.get(id)!;
  const showPuppet = body === 'puppet' && !!def.puppet;
  // The raw generated mesh, for an animal whose own body has not shipped: it is still borrowing
  // somebody else's in play, and this is the only way to see the surface it will be built from.
  const showGenerated = body === 'generated' && !!def.generated;
  const modelPath = showGenerated ? def.generated!
    : showPuppet ? def.puppet! : detail === 'reduced' && def.lod ? def.lod : def.model;
  const roster = SPECIMENS.filter(c => c.collection === collection);
  // Both eras are on this page, so a specimen's palette comes from its own pack, not ACTIVE_ERA.
  const defaultScheme = (key: string) => {
    const c = specimenByKey.get(key)!;
    const p = paletteFor(c.collection);
    return p.defaults[c.id] ?? p.schemes[0].id;
  };
  const [clips, setClips] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playback, setPlayback] = useState<PlaybackState>({ time: 0, duration: 0, paused: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedId, setLoadedId] = useState('');
  const [picks, setPicks] = useState<Picks>(readPicks);
  const [slots, setSlots] = useState<readonly Slot[]>([]);
  useEffect(() => { writeUrlState(id, mode); }, [id, mode]);
  useEffect(() => {
    if (body === 'puppet' && !def.puppet) setBody('model');
    if (body === 'generated' && !def.generated) setBody('model');
  }, [body, def.puppet, def.generated]);
  // Which body a specimen *opens* on. An animal that has a generated mesh is by definition one
  // whose own body has not shipped — the manifest retires the preview the day it does — so what
  // `model` resolves to for it is the Devonian fish it borrows in play. Opening there made the
  // page look like it had never been told about the generated meshes: a reviewer asking to see the
  // Triassic body got a Devonian one and no reason to touch the Body control. So it opens on the
  // animal's own mesh instead, and a reviewer's explicit choice holds until they change specimen.
  const opened = useRef(id);
  useEffect(() => {
    if (opened.current === id) return;   // not a specimen change: leave a reviewer's own choice alone
    opened.current = id;
    setBody(openingBody(id));
  }, [id]);
  // Sculpting needs a creature on stage; a prop or a load in progress has nothing to sculpt.
  // Not on the twin: a sculpt is the hand-off that goes into a builder's profile rows for the body
  // that ships, and one exported off the comparison body would name the right creature and describe
  // the wrong mesh.
  const ready = !loading && !error && loadedId === id;
  /**
   * Sculpting is for a body a *builder* draws from profile rows. Its export is a hand-off into
   * those rows (docs/viewer-sculpt.md) — the change goes into the builder, never into the GLB — so
   * it only means anything where such a table is authored by hand, which is the Cambrian and the
   * Devonian. A Triassic body is Tripo-derived: its builder measures its profile off the intake
   * surface rather than authoring it, so a sculpt exported there would describe a table nobody
   * writes and could not be ported into anything. The Triassic's two editors are Stretch, which
   * lengthens a run of the raw generation, and Mark region, which says what to cut off it.
   */
  const sculptable = !isPropCollection(collection) && collection !== 'triassic';
  const canSculpt = sculptable && !showPuppet && !showGenerated && ready;
  // Stretching is the other half of that split, and the opposite gate: it lengthens a run of a raw
  // generation before anyone cleans or rigs it, so it is offered only on the generated body and
  // never on a built one.
  const canStretch = showGenerated && ready;
  // Marking works on whatever body is on stage, the generated mesh above all: that raw surface is
  // the one carrying fins nobody asked for, and it is the reason the mode exists. A prop is the
  // only thing it refuses — there is nothing on a stromatolite for a builder to cut away.
  const canMark = !isPropCollection(collection) && ready;
  /**
   * Whether `model` is this animal's own body or one it borrows in play.
   *
   * An animal with a generated mesh and nothing built yet resolves `model` to a Devonian fish, and
   * a sculpt of that would name the right creature and describe somebody else's body — so it is
   * not offered one. An animal whose body is built and waiting on a human has both, and there the
   * sculpt is exactly right.
   */
  const ownBody = !def.generated || !!def.inReview;
  useEffect(() => {
    if (mode === 'sculpt' && (!sculptable || showPuppet || showGenerated)) setMode('view');
    if (mode === 'stretch' && !showGenerated) setMode('view');
    if (mode === 'mark' && isPropCollection(collection)) setMode('view');
  }, [mode, collection, sculptable, showPuppet, showGenerated]);

  // The show effect must not re-run when a pick changes, so it reads the picks through a ref.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const schemeId = picks[id] ?? defaultScheme(id);
  const activeScheme = scheme(schemeId);

  useEffect(() => {
    const s = createViewerScene(canvasRef.current!);
    sceneRef.current = s;
    s.onClip(setActive);
    s.onPlayback(setPlayback);
    return () => { s.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadedId(''); setError(''); setClips([]); setSlots([]);
    // The specimen on stage leaves before the next one is fetched: watching the last creature
    // repaint into the new one's colours, then pop out of frame, read as a glitch.
    if (requestedId.current !== id) sceneRef.current?.clear();
    requestedId.current = id;
    // Set the scheme before the model is built so it never appears in the wrong palette first.
    sceneRef.current?.setScheme(picksRef.current[id] ?? defaultScheme(id));
    // The yaw is the generated mesh's alone: the shipped body and the twin are already built to
    // the engine's convention and must not be turned.
    sceneRef.current?.show({ ...def, model: modelPath, previewYaw: showGenerated ? def.previewYaw : 0 }, { preserveView: true })
      .then((names) => {
        if (cancelled) return;
        // A sculpt made this session follows the creature back onto the stage, full or reduced.
        const sculpt = getSculpt(id);
        if (sculpt && !isIdentity(sculpt)) sceneRef.current?.applySculpt(warp(sculpt), true);
        const stretch = showGenerated ? getStretch(id) : undefined;
        if (stretch && stretch.model === modelPath && !stretchIsIdentity(stretch)) sceneRef.current?.applySculpt(stretchWarp(stretch), true);
        setClips(names); setSlots(sceneRef.current?.activeSlots() ?? []); setLoading(false); setLoadedId(id);
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id, modelPath, showGenerated, def.previewYaw]);

  useEffect(() => { sceneRef.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { sceneRef.current?.setScheme(schemeId); }, [schemeId]);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(picks)); } catch { /* private mode: picks stay in memory */ }
  }, [picks]);

  function exportColors() {
    const payload = {
      generated: new Date().toISOString(),
      note: 'Colour scheme picked per creature in the viewer. Slots are assigned from GLB material names by slotFor() in src/shared/palettes.ts.',
      creatures: Object.fromEntries(roster.map((c) => {
        const s = scheme(picks[c.key] ?? defaultScheme(c.key));
        return [c.id, { scheme: s.id, name: s.name, colors: s.colors }];
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection}-colour-schemes.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Only count picks that differ from what the game already uses — those are the proposed changes.
  const changed = roster.filter((c) => (picks[c.key] ?? defaultScheme(c.key)) !== defaultScheme(c.key)).length;

  return (
    <div className={`viewer ${mode === 'sculpt' ? 'sculpting' : mode === 'stretch' ? 'stretching' : mode === 'mark' ? 'marking' : ''}`} data-mode={mode}>
      <div className="stage">
        <canvas ref={canvasRef} className="viewer-canvas" />
        {/* The notice sits on the stage, over where the specimen will stand. `status` stays in the
            class list because the QA tools wait on it (tools/devonian/browser.mjs and friends). */}
        {(loading || error) && (
          <div className={`status stage-status ${error ? 'error' : ''}`} role="status">
            {!error && <i className="spinner" aria-hidden="true" />}
            <span>{error || `Loading ${def.name}…`}</span>
          </div>
        )}
      </div>

      {/* Sculpt mode lays its drawings over the stage cell (same grid area, stacked above the canvas)
          and puts its panel where the info card was. */}
      {mode === 'sculpt' && canSculpt && sceneRef.current && (
        <SculptEditor key={id} scene={sceneRef.current} specimen={def} onExit={() => setMode('view')} />
      )}
      {mode === 'stretch' && canStretch && sceneRef.current && (
        <StretchEditor key={`${id}-stretch`} scene={sceneRef.current} specimen={def} model={modelPath} onExit={() => setMode('view')} />
      )}

      {/* Mark mode keeps the ordinary single-stage layout — the brush paints on the orbit view
          itself — and only takes the info card's place with its panel. The marks are indices into
          the body actually on stage, so the editor is keyed by that as well as by the specimen. */}
      {mode === 'mark' && canMark && sceneRef.current && canvasRef.current && (
        <MarkEditor key={`${id}|${modelPath}`} scene={sceneRef.current} specimen={def} model={modelPath}
          sha256={showGenerated ? def.generatedSha256 : undefined}
          canvas={canvasRef.current} onExit={() => setMode('view')} />
      )}

      <aside className="specimens" aria-label="Specimens">
        <header>
          <a className="back" href="../">← Cambrian Conquest</a>
          <h1>Specimens</h1>
          <label className="collection-pick"><span className="sr-only">Specimen collection</span>
            <select aria-label="Specimen collection" value={collection} onChange={e => {
              const next = e.target.value as CollectionId;
              const first = SPECIMENS.find(c => c.collection === next);
              if (first) { setCollection(next); setId(first.key); }
            }}>{COLLECTIONS.map(c => <option key={c.id} value={c.id} disabled={!SPECIMENS.some(s => s.collection === c.id)}>{c.name}</option>)}</select>
          </label>
        </header>
        <ul>
          {roster.map((c) => (
            <li key={c.key}>
              <button className={`specimen ${c.key === id ? 'active' : ''}`} aria-pressed={c.key === id} onClick={() => setId(c.key)}>
                <>{c.image ? <img src={`${ASSET_BASE}${c.image}`} alt="" draggable={false}/> : <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSET_BASE} schemeId={picks[c.key] ?? defaultScheme(c.key)} alt="" draggable={false} />}</>
                <span>
                  <b>{c.name}</b>
                  <small>{c.species}</small>
                  <ModelStatusBadge status={c.modelStatus} note={c.modelNote} compact />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="info">
        <span className="role">{def.role}</span>
        <h2 className={def.name.length > 11 ? 'long-name' : undefined}>{def.name}</h2>
        <ModelStatusBadge status={def.modelStatus} note={def.modelNote} />
        {def.kind && <p className="kind-line"><b className="kind">{def.kind}</b>{def.species}</p>}
        <p>{def.provenance ?? 'Burgess Shale'} · {clips.length} clips</p>
        {def.kindNote && <p className="specimen-description">{def.kindNote}</p>}
        {def.description && <p className="specimen-description">{def.description}</p>}
        {def.lengthMeters != null && <p className="specimen-scale">Representative length: {new Intl.NumberFormat('en', { maximumSignificantDigits: 3 }).format(def.lengthMeters)} m · views individually framed</p>}
        {collection !== 'cambrian' && <p className="specimen-downloads"><a href={`${ASSET_BASE}${def.model}`} download>Full model</a>{def.lod && <a href={`${ASSET_BASE}${def.lod}`} download>Reduced model</a>}{def.puppet && <a href={`${ASSET_BASE}${def.puppet}`} download>Procedural twin</a>}{def.generated && <a href={`${ASSET_BASE}${def.generated}`} download>Generated mesh</a>}</p>}
        {def.lod && <label className="scheme-pick">
          <span>Model detail</span>
          <select aria-label="Model detail" value={detail} disabled={loading} onChange={e => setDetail(e.target.value as 'full' | 'reduced')}>
            <option value="full">Full model</option>
            <option value="reduced">Reduced model</option>
          </select>
        </label>}
        {def.lod && <p className="hint">Switch detail to compare at the same view and animation time. Missing clips return to rest.</p>}
        {(def.puppet || def.generated) && <label className="scheme-pick">
          <span>Body</span>
          <select aria-label="Which body" value={body} disabled={loading} onChange={e => setBody(e.target.value as 'model' | 'puppet' | 'generated')}>
            <option value="model">{def.inReview ? 'Authored model (in review)' : def.generated ? 'Borrowed body (in play)' : 'Authored model'}</option>
            {def.puppet && <option value="puppet">Procedural twin</option>}
            {def.generated && <option value="generated">Generated mesh (no rig)</option>}
          </select>
        </label>}
        {def.inReview && <p className="hint">
          <strong>Awaiting review:</strong> this animal's own body, twin and clips are built, but it
          is not in <code>shipped.json</code> yet — so the game still draws the body it borrows and
          the animal keeps its warning. Everything on this page is the real thing; what is being
          decided is whether it ships. The raw mesh it was built from is still under <em>Body</em>.
        </p>}
        {def.generated && <p className="hint">
          <strong>Generated mesh:</strong> the raw body this animal will be built from. It has no
          skeleton, no animation clips and no anchors, so it sits still. Its facing and its size here
          are <em>estimates</em> — the mesh arrives pointing wherever it was generated and normalized
          to one unit, and it has been turned to face the way the shipped bodies do{def.previewLength
            ? ` and taken up to the ${def.previewLength} units the roster gives the animal` : ''}. Both
          are redone properly when the body is cleaned and rigged, and every bit of this preview is
          thrown away the day the real one lands. Until then the animal still borrows another era's
          body in play.
        </p>}
        {def.puppet && <p className="hint">
          The twin is rebuilt to this body's own volume on the same skeleton, and is where the clips
          are animated before they are applied here. Switching holds the view and the frame, so a
          difference between the two reads as movement. {def.puppetNote}
        </p>}
        <p className="hint">Drag to orbit · right-drag to pan · scroll to zoom</p>
        <div className="info-actions">
          <button className="ghost" onClick={() => sceneRef.current?.resetCamera()}>Reset view</button>
          {sculptable && ownBody && <button className="ghost" onClick={() => setMode('sculpt')} disabled={!canSculpt} title="Reshape the body on side and top drawings and export the change as a sculpt file">
            Edit sculpt{(() => { const d = getSculpt(id); return d && !isIdentity(d) ? ' (edited)' : ''; })()}
          </button>}
          {def.generated && <button className="ghost" onClick={() => { setBody('generated'); setMode('stretch'); }} disabled={!ready} title="Lengthen a run of this raw generation — a neck, a tail — between two cuts, and export the change to be baked into the GLB">
            Stretch{(() => { const d = getStretch(id); return d && !stretchIsIdentity(d) ? ' (edited)' : ''; })()}
          </button>}
          {!isPropCollection(collection) && <button className="ghost" onClick={() => setMode('mark')} disabled={!canMark} title="Paint the geometry that should not be there and export it as a region file for tools/triassic/cut-region.py">
            Mark region
          </button>}
        </div>

        {!isPropCollection(collection) && <section className="scheme" aria-label="Colour scheme">
          <h3>Colours</h3>
          <label className="scheme-pick">
            <span className="sr-only">Colour scheme for {def.name}</span>
            <select value={schemeId} onChange={(e) => setPicks((p) => ({ ...p, [id]: e.target.value }))}>
              {paletteFor(def.collection).schemes.map((s) => <option key={s.id} value={s.id} title={s.note}>{s.name}</option>)}
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
        </section>}
      </div>

      <section className="clips" aria-label="Animations" data-loaded-specimen={loadedId} data-loaded-model={loadedId ? modelPath : ''}>
        <div className="clips-head">
          <h3>Animations</h3>
          {(clips.length > 0 || loading) && <><label className="toggle">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
            <span>Loop one-shots</span>
          </label>
          <div className="speeds" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button key={s} className={`speed ${s === speed ? 'active' : ''}`} aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div></>}
        </div>
        {!loading && clips.length > 0 && <div className="timeline">
          <button className="ghost" onClick={() => sceneRef.current?.setPaused(!playback.paused)}>
            {playback.paused ? 'Resume' : 'Pause'}
          </button>
          <label>
            <span className="sr-only">Animation time</span>
            <input type="range" min={0} max={playback.duration} step="any" value={playback.time}
              aria-valuetext={`${active}, ${playback.time.toFixed(2)} of ${playback.duration.toFixed(2)} seconds`}
              onKeyDown={e => {
                const target = e.key === 'Home' ? 0 : e.key === 'End' ? playback.duration
                  : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? playback.time - 1 / 30
                  : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? playback.time + 1 / 30 : undefined;
                if (target != null) { e.preventDefault(); sceneRef.current?.seek(target); }
              }}
              onChange={e => sceneRef.current?.seek(Number(e.target.value))} />
          </label>
          <output>{playback.time.toFixed(2)} / {playback.duration.toFixed(2)} s</output>
        </div>}
        {!loading && !clips.length && <p className="hint">Static specimen</p>}
        <div className="clip-grid">
          {clips.filter((n) => !isReplaced(n)).map((name) => {
            // A clip queued for rework is flagged on its own button rather than on the creature:
            // the body is finished, this motion is not, and that is what a viewer wants to know.
            const queued = def.clipNotes?.[name];
            return (
              <button key={name} className={`clip ${name === active ? 'active' : ''}${queued ? ' clip-queued' : ''}`}
                aria-pressed={name === active} onClick={() => sceneRef.current?.play(name, loop)}>
                {name}
                {queued && <ClipQueuedBadge name={name} note={queued} />}
              </button>
            );
          })}
        </div>
        {clips.some(isReplaced) && <>
          {/* A re-authored clip keeps its predecessor in the file as replaced/<Name>, so the two
              can be played side by side and the old one restored if the new one is worse. The
              game never asks for these names; only this page shows them. */}
          <h4 className="clips-replaced-head">Replaced</h4>
          <div className="clip-grid clip-grid-replaced">
            {clips.filter(isReplaced).map((name) => (
              <button key={name} className={`clip clip-replaced ${name === active ? 'active' : ''}`} aria-pressed={name === active}
                title={`The clip ${replacedName(name)} superseded; kept for comparison`} onClick={() => sceneRef.current?.play(name, loop)}>
                {replacedName(name)}
              </button>
            ))}
          </div>
        </>}
      </section>

    </div>
  );
}
