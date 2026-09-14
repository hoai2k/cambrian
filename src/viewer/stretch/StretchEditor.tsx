import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ViewerSpecimen } from '../catalogue';
import { rootFramePositions, type OrthoView, type Rect, type ViewerScene } from '../scene';
import { History } from '../sculpt/history';
import {
  MAX_FACTOR, MAX_TILT, MIN_FACTOR, axes, exportDoc, flipForward, headFractionAt, isIdentity, levelTilt,
  measureStretch, regionLength, resetAll, resetFactor, setAxis, setFactor, setPlaneAt, setTilt, shiftOf,
  stretchDirection, warp, type PlaneName, type StretchDoc,
} from './stretch';
import { getStretch, setStretch } from './store';

/**
 * Stretch mode: lengthen a run of a raw generated body.
 *
 * Two drawings and a preview, like sculpt, but the edit is a much smaller one. Each drawing shows
 * two cut lines across the animal — *from*, where the neck leaves the body, and *to*, where the
 * head begins — with a round handle at each end. Drag a line along the body to move that cut; drag
 * either of its handles to angle the lengthening, which re-angles both cuts together because they
 * are square to the one direction. Then the slider draws the part between them out: the body
 * behind the first cut never moves, the head past the second is carried along whole, and the arrow
 * on the drawing shows where it is going.
 *
 * Everything the editor knows is in `stretch.ts`; this file is the drawings, the drags and the
 * panel. Undo and redo are ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z, O toggles the preview against the generated
 * mesh, and nothing is saved: the edit leaves through *Export stretch* and is baked into the GLB
 * by `tools/triassic/stretch.mjs`.
 */

interface Props {
  scene: ViewerScene;
  specimen: ViewerSpecimen;
  /**
   * Which of that specimen's bodies is on stage — the generated mesh, here.
   *
   * Separate from `specimen` rather than spread into a copy of it, because the copy would be a new
   * object on every render of the page, and the page re-renders on every animation frame. The
   * measure effect below keys off both, so a new object each time meant re-measuring, and silently
   * throwing away the undo history, sixty times a second.
   */
  model: string;
  onExit(): void;
}

type ViewName = 'side' | 'top';
interface Camera2D { centre: [number, number]; upp: number }
interface Drag {
  kind: 'plane' | 'handle' | 'pan';
  view: ViewName;
  which?: PlaneName;
  startX: number; startY: number;
  startCentre?: [number, number];
  startAt?: number;
}

const HANDLE_R = 6;
const MAX_UPP_FACTOR = 12, MIN_UPP_FACTOR = .02;
/** How far a cut line is drawn either side of the body's centre line, as a share of its section. */
const CUT_REACH = .85;

export function StretchEditor({ scene, specimen, model, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cellRefs = { side: useRef<HTMLDivElement>(null), top: useRef<HTMLDivElement>(null), main: useRef<HTMLDivElement>(null) };
  const [doc, setDocState] = useState<StretchDoc | null>(null);
  const historyRef = useRef<History<StretchDoc> | null>(null);
  const [active, setActive] = useState<PlaneName>('to');
  const [previewOriginal, setPreviewOriginal] = useState(false);
  const previewRef = useRef(false);
  previewRef.current = previewOriginal;
  const [cams, setCams] = useState<Record<ViewName, Camera2D> | null>(null);
  const [rects, setRects] = useState<Record<ViewName | 'main', Rect> | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const dragRef = useRef<Drag | null>(null);
  const [error, setError] = useState('');

  // ---- measure once per specimen, or take up the session's document ----
  useEffect(() => {
    const target = scene.sculptTarget();
    if (!target) { setError('Nothing on stage to stretch'); return; }
    const chunks = target.meshes.map((m) => rootFramePositions(m.base, m.toRoot));
    let d = getStretch(specimen.key);
    if (!d || d.model !== model) {
      try {
        d = measureStretch(
          { chunks, mouth: target.mouth, yaw: specimen.previewYaw, rigged: target.skinned },
          { key: specimen.key, id: specimen.id, collection: specimen.collection, model });
      } catch (e) { setError((e as Error).message); return; }
    }
    historyRef.current = new History(d);
    setDocState(d);
    setActive('to'); setPreviewOriginal(false);
    scene.setRestPose(true);
    scene.applySculpt(isIdentity(d) ? null : warp(d), true);
    const rigged = target.skinned;
    return () => {
      // A raw generation keeps its stretch on the stage, the way a sculpt does. A built body must
      // not: the warp is written into the bind pose, and once a clip plays its vertices are swung
      // about joints that were left where they were — a neck that stretches correctly at rest and
      // flails the moment it moves. It is put back on the way out.
      if (rigged) scene.applySculpt(null, true);
      scene.setRestPose(false);
    };
  }, [scene, specimen, model]);

  // ---- every document change reaches the scene and the session store ----
  const commitDoc = useCallback((next: StretchDoc, finalize: boolean) => {
    setDocState(next);
    setStretch(next.key, next);
    if (!previewRef.current) scene.applySculpt(isIdentity(next) ? null : warp(next), finalize);
  }, [scene]);

  const step = useCallback((next: StretchDoc) => { historyRef.current?.push(next); commitDoc(next, true); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const drag = useCallback((next: StretchDoc) => { historyRef.current?.replace(next); commitDoc(next, false); }, [commitDoc]);
  const endDrag = useCallback(() => {
    const h = historyRef.current;
    if (h?.inGesture) { h.commit(); commitDoc(h.present, true); setHistoryTick((t) => t + 1); }
  }, [commitDoc]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; commitDoc(h.undo(), true); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; commitDoc(h.redo(), true); setHistoryTick((t) => t + 1); }, [commitDoc]);

  const setPreview = useCallback((original: boolean) => {
    setPreviewOriginal(original);
    previewRef.current = original;
    const d = historyRef.current?.present;
    if (!d) return;
    scene.applySculpt(original || isIdentity(d) ? null : warp(d), true);
  }, [scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); setPreview(!previewRef.current); return; }
      if (!mod) return;
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setPreview]);

  // ---- layout: where the three cells sit on the canvas ----
  const measureCells = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = stage.getBoundingClientRect();
    const rel = (el: HTMLDivElement | null): Rect => {
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left - s.left, y: r.top - s.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 };
    };
    setRects({ side: rel(cellRefs.side.current), top: rel(cellRefs.top.current), main: rel(cellRefs.main.current) });
  }, [cellRefs.main, cellRefs.side, cellRefs.top]);

  useLayoutEffect(() => {
    measureCells();
    const ro = new ResizeObserver(measureCells);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [measureCells]);

  // Frame both drawings on the whole body. Generous: a doubled neck has to stay on screen, so the
  // views are fitted to the animal plus half its length again.
  const fit = useCallback(() => {
    if (!doc || !rects) return;
    const pad = 1.5;
    const ca = (doc.bounds.axisMin + doc.bounds.axisMax) / 2;
    const fitView = (r: Rect, spanA: number, spanV: number, centre: [number, number]): Camera2D => ({
      centre, upp: Math.max(spanA * pad / Math.max(r.width, 1), spanV * pad / Math.max(r.height, 1)),
    });
    setCams({
      side: fitView(rects.side, doc.bounds.length, doc.bounds.height, [ca, doc.bounds.upMid]),
      top: fitView(rects.top, doc.bounds.length, doc.bounds.width, [ca, latMid(doc)]),
    });
  }, [doc, rects]);
  useEffect(() => { if (!cams) fit(); }, [cams, fit]);

  useEffect(() => {
    if (!rects) return;
    scene.setLayout('split', rects.main);
    if (doc && cams) for (const view of ['side', 'top'] as const) {
      const v: OrthoView = { rect: rects[view], centre: cams[view].centre, unitsPerPixel: cams[view].upp, axis: doc.frame.axis };
      scene.setOrthoView(view, v);
    }
  }, [scene, rects, cams, doc]);
  useEffect(() => () => scene.setLayout('single'), [scene]);

  // ---- pixel ↔ model ----
  const toPx = (view: ViewName, a: number, v: number): [number, number] => {
    const r = rects![view], c = cams![view];
    return [r.width / 2 + (a - c.centre[0]) / c.upp, r.height / 2 - (v - c.centre[1]) / c.upp];
  };
  const fromPx = (view: ViewName, px: number, py: number): [number, number] => {
    const r = rects![view], c = cams![view];
    return [c.centre[0] + (px - r.width / 2) * c.upp, c.centre[1] - (py - r.height / 2) * c.upp];
  };

  // ---- pointer handling on the drawings ----
  function onPointerDown(view: ViewName, e: React.PointerEvent<SVGSVGElement>) {
    if (!doc || !cams) return;
    const target = e.target as SVGElement;
    const kind = target.dataset.kind as Drag['kind'] | undefined;
    e.currentTarget.setPointerCapture(e.pointerId);
    const base: Drag = { kind: 'pan', view, startX: e.clientX, startY: e.clientY, startCentre: [...cams[view].centre] as [number, number] };
    if (kind === 'plane' || kind === 'handle') {
      const which = target.dataset.plane as PlaneName;
      setActive(which);
      dragRef.current = { ...base, kind, which, startAt: doc[which] };
    } else dragRef.current = base;
  }

  function onPointerMove(view: ViewName, e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current;
    if (!d || d.view !== view || !doc || !cams) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    const upp = cams[view].upp;
    if (d.kind === 'pan') {
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      setCams({ ...cams, [view]: { ...cams[view], centre: [d.startCentre![0] - dx * upp, d.startCentre![1] + dy * upp] } });
      return;
    }
    const present = historyRef.current!.present;
    if (d.kind === 'plane') {
      // Along the body only: a cut's place is where it crosses the axis, and dragging it up and
      // down would be a second way to say what the handles already say.
      drag(setPlaneAt(present, d.which!, d.startAt! + dx * upp));
    } else {
      // The handle: wherever the pointer is, the line through the cut's centre points at it, and
      // the direction is square to that line. `tiltFromLine` turns the one into the other.
      const box = e.currentTarget.getBoundingClientRect();
      const [a, v] = fromPx(view, e.clientX - box.left, e.clientY - box.top);
      const [ca, cv] = cutCentre(present, view, d.which!);
      const t = tiltFromLine(present, view, a - ca, v - cv);
      if (t === null) return;                                   // pointer on the centre: no angle yet
      drag(setTilt(present, view, t));
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (d && d.kind !== 'pan') endDrag();
  }

  function onWheel(view: ViewName, e: React.WheelEvent<SVGSVGElement>) {
    if (!cams || !rects || !doc) return;
    e.preventDefault();
    const c = cams[view];
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const [a, v] = fromPx(view, px, py);
    const factor = Math.exp(e.deltaY * .0015);
    const base = doc.bounds.length / Math.max(rects[view].width, 1);
    const upp = Math.min(base * MAX_UPP_FACTOR, Math.max(base * MIN_UPP_FACTOR, c.upp * factor));
    setCams({ ...cams, [view]: { centre: [a - (px - rects[view].width / 2) * upp, v + (py - rects[view].height / 2) * upp], upp } });
  }

  // A handle double-clicked is a cut put back square across the body — the counterpart of the
  // sculpt editor's double-click to release a tangent.
  function onDoubleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (doc && (e.target as SVGElement).dataset.kind === 'handle') step(levelTilt(doc));
  }

  function exportStretch() {
    if (!doc) return;
    const payload = exportDoc(doc);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.id}-stretch.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const h = historyRef.current;
  void historyTick;
  const edited = !!doc && !isIdentity(doc);
  const length = doc ? regionLength(doc) : 0;

  const panel = (
    <aside className="sculpt-panel stretch-panel" aria-label="Stretch">
      <div className="sculpt-head">
        <span className="role">STRETCH</span>
        <h2 className={specimen.name.length > 11 ? 'long-name' : undefined}>{specimen.name}</h2>
      </div>
      {error && <p className="sculpt-error">{error}</p>}
      <div className="sculpt-actions">
        <button className="ghost" onClick={undo} disabled={!h?.canUndo} title="⌘/Ctrl+Z">Undo</button>
        <button className="ghost" onClick={redo} disabled={!h?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
        <button className="ghost" onClick={fit}>Fit</button>
      </div>
      <div className="sculpt-toggle" role="group" aria-label="Preview" title="O toggles">
        <button className={!previewOriginal ? 'active' : ''} aria-pressed={!previewOriginal} onClick={() => setPreview(false)}>Stretched</button>
        <button className={previewOriginal ? 'active' : ''} aria-pressed={previewOriginal} onClick={() => setPreview(true)} disabled={!edited}>Generated</button>
      </div>

      {doc && <>
        <h3>Length</h3>
        <div className="stretch-readout">
          <b>{fmt(length)}</b> → <b className={edited ? 'changed' : undefined}>{fmt(length * doc.factor)}</b>
          <small>{pctOfBody(doc)}% of the body → {pctOfBody(doc, doc.factor)}% · the head moves {fmt(shiftOf(doc), true)}</small>
        </div>
        <label className="stretch-slider">
          <span className="sr-only">Stretch factor</span>
          <input type="range" min={MIN_FACTOR} max={MAX_FACTOR} step={.01} value={doc.factor}
            aria-valuetext={`${doc.factor.toFixed(2)} times`}
            onChange={(e) => drag(setFactor(doc, Number(e.target.value)))}
            onPointerUp={endDrag} onKeyUp={endDrag} onBlur={endDrag} />
          <output>{doc.factor.toFixed(2)}×</output>
        </label>
        <div className="sculpt-actions">
          {[.5, 1, 1.5, 2, 3].map((f) => (
            <button key={f} className={`ghost ${Math.abs(doc.factor - f) < .005 ? 'primary' : ''}`} onClick={() => step(setFactor(doc, f))}>{f}×</button>
          ))}
        </div>

        <h3>Cuts</h3>
        <section className="sculpt-station" aria-label="Cuts">
          {(['from', 'to'] as const).map((which) => (
            <label key={which} className={which === active ? 'active' : undefined}>
              <span>{which === 'from' ? 'From · body side' : 'To · head side'}</span>
              <NumberField value={doc[which]} step={doc.bounds.length / 400} onChange={(v) => step(setPlaneAt(doc, which, v))} />
              <small>{Math.round(headFractionAt(doc, doc[which]) * 100)}% back from the nose</small>
            </label>
          ))}
          <label>
            <span>Direction</span>
            <div className="stretch-angles">
              <NumberField value={deg(doc.tiltSide)} step={1} places={1} range={[-70, 70]} onChange={(v) => step(setTilt(doc, 'side', rad(v)))} />
              <NumberField value={deg(doc.tiltTop)} step={1} places={1} range={[-70, 70]} onChange={(v) => step(setTilt(doc, 'top', rad(v)))} />
            </div>
            <small>side ° · top ° — 0 is straight down the body</small>
          </label>
        </section>
        <div className="sculpt-actions">
          <button className="ghost" onClick={() => step(levelTilt(doc))} disabled={!doc.tiltSide && !doc.tiltTop}>Level</button>
          <button className="ghost" onClick={() => step(resetFactor(doc))} disabled={!edited}>Reset stretch</button>
          <button className="ghost" onClick={() => step(resetAll(doc))}>Reset all</button>
        </div>
        <h3>Orientation</h3>
        <p className="hint">{FRAME_NOTE[doc.frameSource]}</p>
        <div className="sculpt-actions">
          {(['x', 'z'] as const).map((a) => (
            <button key={a} className={`ghost ${doc.frame.axis === a ? 'primary' : ''}`} aria-pressed={doc.frame.axis === a}
              onClick={() => step(setAxis(doc, a))} title="Which way the body runs. Changing it re-frames both drawings and puts the cuts back at the defaults.">
              Body along {a.toUpperCase()}
            </button>
          ))}
          <button className="ghost" onClick={() => step(flipForward(doc))} title="Which end the head is at. Flipping turns the lengthening round and leaves the cuts where they are drawn.">
            Head {doc.frame.forward === 1 ? 'right' : 'left'} →
          </button>
        </div>
      </>}

      <p className="hint">
        Drag a cut line along the body to move it; drag either handle on it to aim the lengthening,
        which turns both cuts together. Double-click a handle to square them again. The body behind
        the first cut never moves and the head past the second is carried whole.
      </p>
      <div className="sculpt-foot">
        <button className="ghost primary" onClick={exportStretch} disabled={!doc}>Export stretch</button>
        <button className="ghost" onClick={onExit}>Back to view</button>
        <p className="hint">{doc?.rigged
          ? 'Nothing is saved, and a built body cannot be baked: its clips re-specify every joint on every frame. The exported file is the measurement to take to the builder.'
          : <>Nothing is saved. The exported file is baked into the GLB by <code>npm run triassic:stretch</code>.</>}</p>
      </div>
    </aside>
  );

  const drawingProps = { active, toPx, onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick };
  return (
    <>
      <div className="sculpt-stage stretch-stage" ref={stageRef}>
        <div className="sculpt-cell sculpt-side" ref={cellRefs.side}>
          <span className="sculpt-label">Side · where the neck leaves and the head begins</span>
          {doc && cams && rects && <Drawing view="side" doc={doc} rects={rects} cams={cams} {...drawingProps} />}
        </div>
        <div className="sculpt-cell sculpt-top" ref={cellRefs.top}>
          <span className="sculpt-label">Top · the same two cuts from above</span>
          {doc && cams && rects && <Drawing view="top" doc={doc} rects={rects} cams={cams} {...drawingProps} />}
        </div>
        <div className="sculpt-cell sculpt-main" ref={cellRefs.main}>
          <span className="sculpt-label">Preview · {previewOriginal ? 'generated' : 'stretched'} · drag to orbit</span>
        </div>
      </div>
      {panel}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The drawing: two cut lines and an arrow, over an orthographic render
// ---------------------------------------------------------------------------------------------

interface DrawingProps {
  view: ViewName;
  doc: StretchDoc;
  rects: Record<ViewName | 'main', Rect>;
  cams: Record<ViewName, Camera2D>;
  active: PlaneName;
  toPx(view: ViewName, a: number, v: number): [number, number];
  onPointerDown(view: ViewName, e: React.PointerEvent<SVGSVGElement>): void;
  onPointerMove(view: ViewName, e: React.PointerEvent<SVGSVGElement>): void;
  onPointerUp(e: React.PointerEvent<SVGSVGElement>): void;
  onWheel(view: ViewName, e: React.WheelEvent<SVGSVGElement>): void;
  onDoubleClick(e: React.MouseEvent<SVGSVGElement>): void;
}

function Drawing(p: DrawingProps) {
  const { view, doc, rects, active, toPx } = p;
  const r = rects[view];
  const svgRef = useRef<SVGSVGElement>(null);
  // Wheel must be non-passive to stop the page scrolling; React's onWheel is passive.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => p.onWheel(view, e as unknown as React.WheelEvent<SVGSVGElement>);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  });

  const reach = CUT_REACH * (view === 'side' ? doc.bounds.height : doc.bounds.width);
  const [dA, dV] = viewDirection(doc, view);
  // The cut's line is square to the direction, in this view's own coordinates.
  const lineA = -dV, lineV = dA;

  const cut = (which: PlaneName) => {
    const [ca, cv] = cutCentre(doc, view, which);
    const ends = ([1, -1] as const).map((s) => toPx(view, ca + lineA * reach * s, cv + lineV * reach * s));
    return { which, mid: toPx(view, ca, cv), ends };
  };
  const from = cut('from'), to = cut('to');

  // Where the far cut ends up, and the arrow that says so. Both are the edit itself rather than a
  // decoration: the dashed line is the new place of the skull, which is the thing being judged.
  const shift = shiftOf(doc);
  const [fa, fv] = cutCentre(doc, view, 'to');
  const movedMid = toPx(view, fa + dA * shift, fv + dV * shift);
  const movedEnds = ([1, -1] as const).map((s) => toPx(view, fa + dA * shift + lineA * reach * s, fv + dV * shift + lineV * reach * s));
  const arrowFrom = toPx(view, ...cutCentre(doc, view, 'from'));

  return (
    <svg ref={svgRef} className="sculpt-svg" width={r.width} height={r.height} viewBox={`0 0 ${r.width} ${r.height}`}
      onPointerDown={(e) => p.onPointerDown(view, e)} onPointerMove={(e) => p.onPointerMove(view, e)}
      onPointerUp={p.onPointerUp} onPointerCancel={p.onPointerUp} onDoubleClick={p.onDoubleClick}>
      {/* The region, so what is about to be stretched is never in doubt. */}
      <polygon className="stretch-region" points={[from.ends[0], from.ends[1], to.ends[1], to.ends[0]].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
      {Math.abs(shift) > 1e-9 && <>
        <polyline className="stretch-moved" points={movedEnds.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
        <line className="stretch-arrow" x1={arrowFrom[0]} y1={arrowFrom[1]} x2={movedMid[0]} y2={movedMid[1]} markerEnd="url(#stretch-head)" />
      </>}
      <defs>
        <marker id="stretch-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="stretch-arrow-head" />
        </marker>
      </defs>
      {[from, to].map((c) => (
        <g key={c.which} className={`stretch-cut ${c.which} ${c.which === active ? 'active' : ''}`}>
          {/* A fat invisible line takes the drag, so the thin drawn one is still easy to grab. */}
          <line data-kind="plane" data-plane={c.which} className="stretch-grab"
            x1={c.ends[0][0]} y1={c.ends[0][1]} x2={c.ends[1][0]} y2={c.ends[1][1]} />
          <line className="stretch-line" x1={c.ends[0][0]} y1={c.ends[0][1]} x2={c.ends[1][0]} y2={c.ends[1][1]} />
          {c.ends.map(([x, y], i) => (
            <circle key={i} data-kind="handle" data-plane={c.which} className="stretch-handle" cx={x} cy={y} r={HANDLE_R} />
          ))}
          <text className="stretch-cut-label" x={c.mid[0] + 8} y={c.mid[1] - 8}>{c.which === 'from' ? 'from' : 'to'}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// View geometry
// ---------------------------------------------------------------------------------------------

/** The lateral midline as the top view draws it (the scene's top camera has +x up for a z body, −z up for an x body). */
const latSign = (doc: StretchDoc) => (doc.frame.axis === 'z' ? 1 : -1);
const latMid = (doc: StretchDoc) => latSign(doc) * doc.bounds.lateralMid;

/** The stretch direction as this view draws it: (along the axis, up the screen). */
function viewDirection(doc: StretchDoc, view: ViewName): [number, number] {
  const d = stretchDirection(doc);
  const { A, L, U } = axes(doc.frame);
  return view === 'side' ? [d[A], d[U]] : [d[A], latSign(doc) * d[L]];
}

/** A cut's centre in this view's (along, up the screen) model coordinates. */
function cutCentre(doc: StretchDoc, view: ViewName, which: PlaneName): [number, number] {
  return [doc[which], view === 'side' ? doc.bounds.upMid : latMid(doc)];
}

/**
 * The tilt a dragged handle asks for: the cut's line is to pass through the pointer, so the
 * direction is square to it.
 *
 * Taken as a perpendicular and an `atan2` rather than by dividing one offset by the other, so a
 * handle dragged past the horizontal stays stable instead of running through infinity. The
 * perpendicular is chosen to point up the body (towards the head), because a normal reversed is
 * the same plane but the opposite stretch.
 */
function tiltFromLine(doc: StretchDoc, view: ViewName, da: number, dv: number): number | null {
  if (Math.abs(da) + Math.abs(dv) < 1e-9) return null;
  const f = doc.frame.forward;
  let nA = dv, nV = -da;
  if (nA * f < 0) { nA = -nA; nV = -nV; }
  const angle = Math.atan2(nV, nA * f);
  const t = view === 'side' ? angle : latSign(doc) * angle;
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, t));
}

/** Where the frame came from, in the panel's words. The guess is the one worth flagging. */
const FRAME_NOTE: Record<StretchDoc['frameSource'], string> = {
  mouth: 'Taken from the mouth socket: this body says where its own head is.',
  yaw: 'Taken from the generation\u2019s authored turn, which says where its head was before it was faced forward.',
  bounds: 'Guessed from the bounding box \u2014 the only signal this body carries. If the drawings look like a view from the front, the box\u2019s longest side runs across the animal (wide flippers do this): set the axis yourself.',
  manual: 'Set by hand.',
};

const fmt = (v: number, signed = false) => `${signed && v > 0 ? '+' : ''}${Number.isFinite(v) ? v.toFixed(3) : '—'}`;
const deg = (r: number) => Math.round(r * 180 / Math.PI * 10) / 10;
const rad = (d: number) => d * Math.PI / 180;
const pctOfBody = (doc: StretchDoc, factor = 1) => (regionLength(doc) * factor / doc.bounds.length * 100).toFixed(1);

/**
 * A number the user types into, shown to a fixed number of places.
 *
 * Rounded for display only: the document keeps the value the drag produced. Without this a cut
 * dragged across the body reads as "0.15999999999999998", which is a true number and an unusable
 * label.
 */
function NumberField({ value, step, range, places = 3, onChange }: { value: number; step: number; range?: [number, number]; places?: number; onChange(v: number): void }) {
  const shown = (v: number) => v.toFixed(places);
  const [text, setText] = useState(shown(value));
  useEffect(() => { setText(shown(value)); }, [value]);
  const commit = () => {
    const v = Number(text);
    if (!Number.isFinite(v)) { setText(shown(value)); return; }
    const c = range ? Math.min(range[1], Math.max(range[0], v)) : v;
    if (c !== value) onChange(c); else setText(shown(value));
  };
  return (
    <input type="number" step={step} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
  );
}
