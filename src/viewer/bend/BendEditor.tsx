import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewerSpecimen } from '../catalogue';
import { rootFramePositions, type BendHandle, type ViewerScene } from '../scene';
import { useMeasuredHash } from '../file-hash';
import { History } from '../sculpt/history';
import { NumberField } from '../stretch/StretchEditor';
import {
  MAX_TURN, aimAxisAt, bendBasis, describeReadingText, exportDoc, flipForward, isIdentity, jointTurns,
  measureBend, moveEnd, pinch, readBend, refLabel, refMoves, reseat, resetTurn, rollForAxis, setAxis,
  setAxisRoll, setChain, setRef, setReach, setTurn, setWindow, spanDirection, spanLength, totalTurn,
  traces, turnToTarget, warp, type BendDoc, type Reading, type Vec3,
} from './bend';
import { bendKey, getBend, setBend } from './store';

/**
 * Bend mode: turn a run of a body, and — the point of it — *measure* the turn.
 *
 * Three handles on the orbit view. The **base** (amber) and **tip** (lagoon) are the two ends of
 * the span: drag either one anywhere on the animal and the cuts, the span's direction and its
 * length all follow, because the span is two points rather than four numbers. The **axle** (magenta)
 * stands out square to the span: drag it round to turn the bend plane. Every vertex inside the span
 * is lit as you go, and the two traced centrelines the geometry reading is taken from are drawn on
 * the body — so a trace that has set off down a flipper is seen rather than believed.
 *
 * Right-drag orbits, as in mark and mouth mode, because a mode where left-drag moves a handle has
 * to leave the model turnable without a modifier nobody would find. The rig goes to its bind pose:
 * a swimming body is drawn somewhere its vertex positions are not, and a span placed on the
 * swimming pose would bend the bind pose somewhere else.
 *
 * Nothing is saved. The document lives in the session's store so a trip through view mode does not
 * lose it, and a reload starts from the body's own guess. What leaves is the bend file, with the
 * hash of the exact body it was measured on (`docs/viewer-bend.md`).
 */

interface Props {
  scene: ViewerScene;
  specimen: ViewerSpecimen;
  /** The body actually on stage — a span is placed on one file, not on "the animal". */
  model: string;
  /** That file's hash where a manifest knows it; the editor measures its own regardless. */
  sha256?: string;
  /** What kind of body that is, for the export to say which file the bend describes. */
  appliesTo: 'generation' | 'preview' | 'built' | 'twin';
  /** The stage canvas: the handles listen on it directly, because the orbit already owns it. */
  canvas: HTMLCanvasElement;
  onExit(): void;
}

interface Drag {
  handle: BendHandle;
  /** The document the drag started from, so each move is measured from it rather than accumulated. */
  from: BendDoc;
  /** Where the handle was when the drag began, root frame: the drag plane passes through it. */
  anchor: Vec3;
  /** Where the pointer first landed on that plane, so a grab off the handle's centre does not jump it. */
  start: Vec3;
}

export function BendEditor({ scene, specimen, model, sha256, appliesTo, canvas, onExit }: Props) {
  const [doc, setDocState] = useState<BendDoc | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [hover, setHover] = useState<BendHandle | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const historyRef = useRef<History<BendDoc> | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const dragRef = useRef<Drag | null>(null);
  const key = bendKey(specimen.key, model);

  /** The span on stage: the helpers, the traces, and every vertex the turn would carry, lit. */
  const show = useCallback((d: BendDoc) => {
    const b = bendBasis(d);
    const t = traces(d, chunksRef.current);
    const span = spanLength(d);
    const reach = Math.max(span * 0.45, d.bounds.height * 0.35, 1e-3);
    const dir = spanDirection(d);
    const inSpan = (x: number, y: number, z: number) => {
      const s = ((x - d.base[0]) * dir[0] + (y - d.base[1]) * dir[1] + (z - d.base[2]) * dir[2]) / span;
      return s > 0 && s < 1;
    };
    scene.showBend({
      base: d.base, tip: d.tip, forward: b.forward, up: b.up, axis: b.axis, reach,
      baseTrace: t.base?.points ?? [], tipTrace: t.tip?.points ?? [],
    }, inSpan);
    scene.applySculpt(isIdentity(d) ? null : warp(d), true);
  }, [scene]);

  // ---- measure once per body, or take up the session's document ----
  useEffect(() => {
    const target = scene.sculptTarget();
    if (!target || !target.meshes.length) { setError('Nothing on stage to bend'); return; }
    const chunks = target.meshes.map((m) => rootFramePositions(m.base, m.toRoot));
    chunksRef.current = chunks;
    const kept = getBend(key);
    let d = kept?.doc;
    if (!d) {
      try {
        d = measureBend(
          { chunks, mouth: target.mouth, yaw: specimen.previewYaw, rigged: target.skinned, bones: target.bones as { name: string; parent: string | null; head: Vec3 }[] },
          { key: specimen.key, id: specimen.id, collection: specimen.collection, model });
      } catch (e) { setError((e as Error).message); return; }
    }
    if (kept?.note) setNote(kept.note);
    historyRef.current = new History(d);
    setDocState(d);
    scene.setRestPose(true);
    scene.setMarkInteraction(true);
    show(d);
    const rigged = target.skinned;
    return () => {
      scene.showBend(null, null);
      // A raw generation keeps its bend on the stage, the way a stretch does. A built body must
      // not: the warp is written into the bind pose, and once a clip plays its vertices are swung
      // about joints that were left where they were — a neck that bends correctly at rest and
      // flails the moment it moves. It is put back on the way out.
      if (rigged) scene.applySculpt(null, true);
      scene.setMarkInteraction(false);
      scene.setRestPose(false);
      canvas.style.cursor = '';
    };
  }, [scene, key, show, canvas, specimen, model]);

  // ---- the hash of the file on stage, measured rather than trusted (`file-hash.ts`) ----
  const measured = useMeasuredHash(model);

  // ---- every document change reaches the scene and the session store ----
  const noteRef = useRef(note); noteRef.current = note;
  const commitDoc = useCallback((next: BendDoc) => {
    setDocState(next);
    setBend(key, next, noteRef.current);
    show(next);
  }, [key, show]);
  useEffect(() => { const h = historyRef.current; if (h) setBend(key, h.present, note); }, [note, key]);

  const step = useCallback((next: BendDoc) => { historyRef.current?.push(next); commitDoc(next); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const drag = useCallback((next: BendDoc) => { historyRef.current?.replace(next); commitDoc(next); }, [commitDoc]);
  const endDrag = useCallback(() => {
    const h = historyRef.current;
    if (h?.inGesture) { h.commit(); commitDoc(h.present); setHistoryTick((t) => t + 1); }
  }, [commitDoc]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; commitDoc(h.undo()); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; commitDoc(h.redo()); setHistoryTick((t) => t + 1); }, [commitDoc]);

  // ---- the handles, on the canvas ----
  useEffect(() => {
    if (error) return;
    const handleAnchor = (d: BendDoc, handle: BendHandle): Vec3 => {
      if (handle === 'base') return d.base;
      if (handle === 'tip') return d.tip;
      const b = bendBasis(d);
      const reach = Math.max(spanLength(d) * 0.45, d.bounds.height * 0.35, 1e-3) * 1.4;
      return [d.base[0] + b.axis[0] * reach, d.base[1] + b.axis[1] * reach, d.base[2] + b.axis[2] * reach];
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;      // the right button is the orbit's; the handles only take the left
      const h = historyRef.current;
      if (!h) return;
      const handle = scene.bendPick(e.offsetX, e.offsetY);
      if (!handle) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const anchor = handleAnchor(h.present, handle);
      const start = scene.dragPoint(e.offsetX, e.offsetY, anchor) ?? anchor;
      dragRef.current = { handle, from: h.present, anchor, start };
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) {
        const over = scene.bendPick(e.offsetX, e.offsetY) ?? null;
        setHover(over);
        canvas.style.cursor = over ? 'grab' : '';
        return;
      }
      const p = scene.dragPoint(e.offsetX, e.offsetY, d.anchor);
      if (!p) return;
      const delta: Vec3 = [p[0] - d.start[0], p[1] - d.start[1], p[2] - d.start[2]];
      if (d.handle === 'axis') {
        // The axle handle asks for a plane, not a place: where it has been dragged to, about the
        // span's own base, is the axis it names.
        const aim: Vec3 = [d.anchor[0] + delta[0] - d.from.base[0], d.anchor[1] + delta[1] - d.from.base[1], d.anchor[2] + delta[2] - d.from.base[2]];
        const roll = rollForAxis(d.from, aim);
        if (roll !== null) drag(setAxisRoll(d.from, roll));
      } else {
        drag(moveEnd(d.from, d.handle, delta));
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (d) endDrag();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [canvas, scene, error, drag, endDrag]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---- the readings, which are what the tool is for ----
  const readings = useMemo(() => (doc ? readBend(doc, chunksRef.current) : null), [doc]);
  const residuals = useMemo(() => {
    if (!doc) return { base: null, tip: null } as { base: number | null; tip: number | null };
    const t = traces(doc, chunksRef.current);
    return { base: t.base?.residual ?? null, tip: t.tip?.residual ?? null };
  }, [doc]);

  function exportBend() {
    const d = historyRef.current?.present;
    if (!d || !readings) return;
    const payload = exportDoc(d, {
      sha256: measured ?? sha256 ?? null,
      sha256Source: measured ? 'measured' : sha256 ? 'manifest' : null,
      appliesTo, note, authoredAt: new Date().toISOString(),
      readings, pinch: pinch(d, chunksRef.current), traceResidual: residuals,
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${specimen.id}-bend.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const h = historyRef.current;
  void historyTick;
  const hash = measured ?? sha256 ?? null;
  const edited = !!doc && !isIdentity(doc);
  const boneNames = doc?.bones.map((b) => b.name) ?? [];
  const squeeze = doc ? pinch(doc, chunksRef.current) : 1;

  return (
    <>
      <div className="mark-stage bend-stage">
        <span className="mark-label">Bend · left-drag a handle · right-drag orbits · shift+right pans · scroll zooms</span>
        <ul className="mouth-legend bend-legend" aria-label="Handles">
          <li className={`base ${hover === 'base' ? 'hover' : ''}`}><i />base · the end the bend is anchored at</li>
          <li className={`tip ${hover === 'tip' ? 'hover' : ''}`}><i />tip · the end that is carried round</li>
          <li className={`axis ${hover === 'axis' ? 'hover' : ''}`}><i />axle · drag to turn the bend plane</li>
        </ul>
      </div>
      <aside className="sculpt-panel bend-panel" aria-label="Bend">
        <div className="sculpt-head">
          <span className="role">BEND</span>
          <h2 className={specimen.name.length > 11 ? 'long-name' : undefined}>{specimen.name}</h2>
        </div>
        {error && <p className="sculpt-error">{error}</p>}
        <p className="hint">
          Put the two ends on the animal, turn the span, and read what it measures. The file
          names <code>{model.split('/').pop()}</code> by its hash, so a bend measured here cannot be
          read back against a body that has changed since.
        </p>

        {doc && readings && <>
          <h3>What it measures</h3>
          <Readout name="Geometry" what={geometryWhat(doc)} before={readings.geometry.before} after={readings.geometry.after}
            edited={edited} residual={Math.max(residuals.base ?? 0, residuals.tip ?? 0)} />
          {doc.refs
            ? <Readout name="Bone chain" what={`${refLabel(doc.refs.base)}${refMoves(doc, doc.refs.base) ? ' (moves with the bend)' : ''} against ${refLabel(doc.refs.tip)}${refMoves(doc, doc.refs.tip) ? ' (moves with the bend)' : ''}`}
              before={readings.bones.before} after={readings.bones.after} edited={edited} />
            : <p className="hint bend-no-rig">No rig on this body, so there is only the geometry's answer. On a built one the bone chain's answer sits beside it, because those are the two that disagree.</p>}
          <div className="sculpt-actions">
            <button className="ghost" onClick={() => readings.geometry.before && step(aimAxisAt(doc, readings.geometry.before))}
              disabled={!readings.geometry.before} title="Turn the bend plane onto the plane the measured turn actually lies in">
              Aim the plane
            </button>
            <button className="ghost" onClick={() => readings.geometry.before && step(turnToTarget(doc, readings.geometry.before, 0))}
              disabled={!readings.geometry.before} title="Turn the span so the geometry reading comes out at zero">
              Straighten it
            </button>
            <button className="ghost" onClick={() => step(resetTurn(doc))} disabled={!edited}>No turn</button>
          </div>

          <h3>Turn</h3>
          <div className="bend-readout">
            <b className={edited ? 'changed' : undefined}>{degrees(totalTurn(doc))}°</b>
            <small>across a span {(spanLength(doc) / doc.bounds.length * 100).toFixed(1)}% of the body · inside squeezed to {squeeze.toFixed(2)}{squeeze < 0 ? ' — the bend has folded the body through itself' : ''}</small>
          </div>
          <section className="sculpt-station bend-fields" aria-label="Turn">
            {([['baseTurn', 'At the base'], ['tipTurn', 'At the tip']] as const).map(([which, label]) => (
              <label key={which}>
                <span>{label}</span>
                <NumberField value={degrees(doc[which])} step={1} places={1} range={[-MAX_DEG, MAX_DEG]} onChange={(v) => step(setTurn(doc, which, radians(v)))} />
                <small>degrees across the whole span</small>
              </label>
            ))}
            <label>
              <span>Bend plane</span>
              <NumberField value={degrees(doc.axisRoll)} step={5} places={1} range={[-180, 180]} onChange={(v) => step(setAxisRoll(doc, radians(v)))} />
              <small>0 lifts the tip · 90 swings it to +lateral</small>
            </label>
          </section>

          <h3>Span</h3>
          <p className="hint bend-seat-note" data-base={doc.baseSource} data-tip={doc.tipSource}>{SEAT_NOTE[doc.baseSource === 'manual' || doc.tipSource === 'manual' ? 'manual' : 'trace']}</p>
          {(['base', 'tip'] as const).map((which) => (
            <section key={which} className="sculpt-station bend-fields" aria-label={which === 'base' ? 'Base end' : 'Tip end'}>
              {([0, 1, 2] as const).map((i) => (
                <label key={i}>
                  <span>{which === 'base' ? 'Base' : 'Tip'} {'XYZ'[i]}</span>
                  <NumberField value={doc[which][i]} step={doc.bounds.length / 400}
                    onChange={(v) => { const p: Vec3 = [...doc[which]] as Vec3; p[i] = v; step(moveEnd(doc, which, [p[0] - doc[which][0], p[1] - doc[which][1], p[2] - doc[which][2]])); }} />
                  {i === 0 && <small>{Math.round(headFraction(doc, which) * 100)}% back from the nose</small>}
                </label>
              ))}
            </section>
          ))}
          <div className="sculpt-actions">
            <button className="ghost" onClick={() => step(reseat(doc, chunksRef.current))} title="Put both ends back where the body's own centre is near them">Re-seat on the body</button>
          </div>

          <h3>How it is measured</h3>
          <section className="sculpt-station bend-fields" aria-label="Measurement">
            <label>
              <span>Window</span>
              <NumberField value={doc.window * 100} step={1} places={1} range={[1, 50]} onChange={(v) => step(setWindow(doc, v / 100))} />
              <small>% of the body each trace runs over, beyond its own cut</small>
            </label>
            <label>
              <span>Reach</span>
              <NumberField value={doc.reach * 100} step={0.5} places={2} range={[0.5, 50]} onChange={(v) => step(setReach(doc, v / 100))} />
              <small>% of the body a vertex may sit off the trace and still count</small>
            </label>
          </section>
          {doc.chain && <>
            <p className="hint">The joint table follows one run of the rig. A limb hanging off the span is not part of it, and this is where that is settled.</p>
            <section className="sculpt-station bend-fields bend-chain" aria-label="Chain">
              {(['from', 'to'] as const).map((end) => (
                <label key={end}>
                  <span>Chain {end === 'from' ? 'starts at' : 'ends at'}</span>
                  <select value={doc.chain![end]} onChange={(e) => step(setChain(doc, end, e.target.value))}>
                    {boneNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              ))}
            </section>
          </>}
          {doc.refs && <>
            <p className="hint">And the bone reading is between two chords you name. <strong>Which two is the whole question</strong> — on this roster three defensible readings of one animal&rsquo;s trunk sat 43° apart.</p>
            {(['base', 'tip'] as const).map((side) => (
              <section key={side} className="sculpt-station bend-fields bend-refs" aria-label={side === 'base' ? 'Base reference' : 'Tip reference'}>
                {(['from', 'to'] as const).map((end) => (
                  <label key={end}>
                    <span>{side === 'base' ? 'Base' : 'Tip'} reference {end}</span>
                    <select value={doc.refs![side][end]} onChange={(e) => step(setRef(doc, side, end, e.target.value))}>
                      {boneNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                ))}
              </section>
            ))}
          </>}

          {doc.rigged && <>
            <h3>Per joint</h3>
            <p className="hint">What the turn asks of each joint of the chain — the form a builder poses a rig with. <code>local</code> is that joint&rsquo;s own rotation; they compose down the chain.</p>
            <ul className="bend-joints" aria-label="Per joint">
              {jointTurns(doc).map((j) => (
                <li key={j.bone}><code>{j.bone}</code><b>{degrees(j.local)}°</b><small>{degrees(j.accumulated)}° accumulated</small></li>
              ))}
              {!jointTurns(doc).length && <li className="hint">No joint of the chain lies inside the span.</li>}
            </ul>
          </>}

          <h3>Orientation</h3>
          <p className="hint bend-frame-note" data-frame={doc.frameSource}>{FRAME_NOTE[doc.frameSource]}</p>
          <div className="sculpt-actions">
            {(['x', 'z'] as const).map((a) => (
              <button key={a} className={`ghost ${doc.frame.axis === a ? 'primary' : ''}`} aria-pressed={doc.frame.axis === a}
                onClick={() => step(setAxis(doc, a, chunksRef.current))} title="Which way the body runs. Changing it starts the span again on the new axis.">
                Body along {a.toUpperCase()}
              </button>
            ))}
            <button className="ghost" onClick={() => step(flipForward(doc))} title="Which end the head is at. Flipping leaves the span exactly where it is drawn and turns round which of its ends is the base.">
              Head at {doc.frame.forward === 1 ? 'high' : 'low'} {doc.frame.axis.toUpperCase()} →
            </button>
          </div>
        </>}

        <div className="sculpt-actions">
          <button className="ghost" onClick={undo} disabled={!h?.canUndo} title="⌘/Ctrl+Z">Undo</button>
          <button className="ghost" onClick={redo} disabled={!h?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
        </div>
        <label className="mark-note">
          <span>What is this bend?</span>
          <textarea rows={2} value={note} placeholder="the neck should leave the shoulder twenty degrees lower" onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="hint bend-hash" data-hash={hash ?? ''} data-hash-source={measured ? 'measured' : sha256 ? 'manifest' : 'none'}>
          {measured === undefined ? 'Hashing the file on stage…'
            : measured ? <>File hash <code>{measured.slice(0, 12)}…</code>, measured here.</>
            : sha256 ? <>File hash <code>{sha256.slice(0, 12)}…</code> from the manifest; this page could not measure its own.</>
            : 'This page could not hash the file on stage and no manifest knows it, so the export names it by path alone. A consumer will ask to be told so.'}
        </p>
        <div className="sculpt-foot">
          <button className="ghost primary" onClick={exportBend} disabled={!doc}>Export bend</button>
          <button className="ghost" onClick={onExit}>Done · back to view</button>
          <p className="hint">{doc?.rigged
            ? 'Nothing is saved, and a built body cannot be baked: its clips re-specify every joint on every frame. The exported file is the measurement to take to the builder.'
            : 'Nothing is saved. The exported file is the span, the axis and the turn in the model’s own frame, for the animal’s builder.'}</p>
        </div>
      </aside>
    </>
  );
}

/** One reading, before and after, with the definition it was taken under written under it. */
function Readout({ name, what, before, after, edited, residual }: {
  name: string; what: string; before: Reading | null; after: Reading | null; edited: boolean; residual?: number;
}) {
  return (
    <div className="bend-reading" data-reading={name.toLowerCase().replace(/\s+/g, '-')}
      data-before={before ? (before.inPlane * 180 / Math.PI).toFixed(2) : ''}
      data-after={after ? (after.inPlane * 180 / Math.PI).toFixed(2) : ''}>
      <h4>{name}</h4>
      <p className="bend-reading-value">
        <b>{describeReadingText(before)}</b>
        {edited && <> → <b className="changed">{describeReadingText(after)}</b></>}
      </p>
      <small>between {what}</small>
      {residual !== undefined && <small className={residual > 0.05 ? 'bend-residual warn' : 'bend-residual'}>
        trace residual {residual.toFixed(3)}{residual > 0.05 ? ' — the trace wandered; move an end, shorten the window or narrow the reach' : ''}
      </small>}
    </div>
  );
}

const MAX_DEG = Math.round(MAX_TURN * 180 / Math.PI);
const degrees = (r: number) => Math.round(r * 180 / Math.PI * 10) / 10;
const radians = (d: number) => d * Math.PI / 180;

const geometryWhat = (doc: BendDoc) =>
  `the body’s own traced centre over the ${(doc.window * 100).toFixed(0)}% behind the base cut and the ${(doc.window * 100).toFixed(0)}% ahead of the tip cut`;

function headFraction(doc: BendDoc, which: 'base' | 'tip'): number {
  const A = doc.frame.axis === 'x' ? 0 : 2;
  const { axisMin, axisMax, length } = doc.bounds;
  const at = doc[which][A];
  return doc.frame.forward === 1 ? (axisMax - at) / length : (at - axisMin) / length;
}

/** Where the span's ends came from, in the panel's words. The guess is the one worth flagging. */
const SEAT_NOTE: Record<'trace' | 'manual', string> = {
  trace: 'Seated automatically: each end put where the body’s own centre is nearest to where it was asked for. That is a guess, and on a body whose limbs reach past its head it is a guess that lands on a limb — look at the two traces drawn on the animal before believing the geometry reading, and drag an end back onto the body if one has wandered.',
  manual: 'Set by hand, which is the expected end state on any animal whose limbs cross its own span.',
};

/** Where the frame came from, in the panel's words. */
const FRAME_NOTE: Record<BendDoc['frameSource'], string> = {
  mouth: 'Taken from the mouth socket: this body says where its own head is. The span itself need not follow that axis — it is two points on the animal.',
  yaw: 'Taken from the generation’s authored turn, which says where its head was before it was faced forward.',
  bounds: 'Guessed from the bounding box — the only signal this body carries. If “back from the nose” reads as nonsense, the box’s longest side runs across the animal (wide flippers do this): set the axis yourself.',
  manual: 'Set by hand.',
};
