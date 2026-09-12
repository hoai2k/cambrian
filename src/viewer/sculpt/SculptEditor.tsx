import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ViewerSpecimen } from '../catalogue';
import type { OrthoView, Rect, SculptMesh, ViewerScene } from '../scene';
import { History } from './history';
import {
  CURVES, autoSlope, evaluate, exportDoc, eyesChanged, isIdentity, makeProbe, measure, mouthChanged, moveEyesOnCrown, moveEyesOnFlank,
  resetFeatures, resetStations, setEyeReach, setEyeScale, setMouth, setShift, setTangent, setValue, shiftRange, warp,
  type CurveName, type SculptDoc, type SurfaceProbe,
} from './profile';
import { getSculpt, setSculpt } from './store';

/**
 * Sculpt mode: the specimen as two drawings and a preview.
 *
 * The side view carries the dorsal and ventral lines, the top view the width; both are the
 * profile table of `profile.ts` drawn over an orthographic render of the model itself. Pick a
 * region and its stations appear as points on those lines: drag a point up or down (out or in,
 * on the top view) to change the value there, along the body to move the station, and pull the
 * handles of the active point to bend the spline into or out of it. The eyes and the mouth are
 * features rather than stations: drag the eye on the side view and it slides along the flank and
 * keeps its seat in the skin, drag it on the top view and it moves across the crown; the small
 * square on its rim resizes it. The mouth widens by its bar and deepens by its handle. The model
 * on the right, and every animation once you go back to View, is warped to match; the toggle
 * shows the shipped body for comparison. Undo and redo are ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y).
 * Nothing is saved: reloading the page returns to what ships.
 */

interface Props {
  scene: ViewerScene;
  specimen: ViewerSpecimen;
  onExit(): void;
}

type ViewName = 'side' | 'top';
type Feature = 'eyes' | 'mouth';
interface Camera2D { centre: [number, number]; upp: number }
interface Drag {
  kind: 'point' | 'handle' | 'pan' | 'eye' | 'eyeSize' | 'mouth' | 'mouthWidth' | 'mouthHeight';
  view: ViewName;
  station?: number;
  curve?: CurveName;
  /** Sign of the point's screen offset from the midline, so a mirrored point drags naturally. */
  mirror?: 1 | -1;
  /** Which handle: +1 ahead along the axis, -1 behind. */
  side?: 1 | -1;
  startX: number; startY: number;
  startCentre?: [number, number];
  startShift?: number;
  startValue?: number;
  /** Feature drags: where the feature's centre was, in model units of the view. */
  startA?: number; startV?: number;
  startScale?: number;
}

const POINT_R = 5.5, ACTIVE_R = 7, HANDLE_R = 4.5;
const MAX_UPP_FACTOR = 12, MIN_UPP_FACTOR = .02;

export function SculptEditor({ scene, specimen, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cellRefs = { side: useRef<HTMLDivElement>(null), top: useRef<HTMLDivElement>(null), main: useRef<HTMLDivElement>(null) };
  const [doc, setDocState] = useState<SculptDoc | null>(null);
  const historyRef = useRef<History<SculptDoc> | null>(null);
  const probeRef = useRef<SurfaceProbe | null>(null);
  const [region, setRegion] = useState(0);
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [activeCurve, setActiveCurve] = useState<CurveName>('dorsal');
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
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
    if (!target) { setError('Nothing on stage to sculpt'); return; }
    const body = target.meshes.filter((m) => !m.eye).map((m) => rootFramePositions(m.base, m.toRoot));
    const eyes = target.meshes.filter((m) => m.eye).map((m) => rootFramePositions(m.base, m.toRoot));
    let d = getSculpt(specimen.key);
    if (!d || d.model !== specimen.model) {
      try {
        d = measure({ chunks: body, eyes, mouth: target.mouth }, { key: specimen.key, id: specimen.id, collection: specimen.collection, model: specimen.model });
      } catch (e) { setError((e as Error).message); return; }
    }
    probeRef.current = makeProbe(body, d.frame, d.bounds.lateralMid);
    historyRef.current = new History(d);
    setDocState(d);
    setRegion(0); setActiveStation(null); setActiveFeature(null); setPreviewOriginal(false);
    scene.setRestPose(true);
    scene.applySculpt(isIdentity(d) ? null : warp(d), true);
    return () => { scene.setRestPose(false); };
  }, [scene, specimen]);

  // ---- every document change reaches the scene and the session store ----
  const commitDoc = useCallback((next: SculptDoc, finalize: boolean) => {
    setDocState(next);
    setSculpt(next.key, next);
    if (!previewRef.current) scene.applySculpt(isIdentity(next) ? null : warp(next), finalize);
  }, [scene]);

  const step = useCallback((next: SculptDoc) => { historyRef.current?.push(next); commitDoc(next, true); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const drag = useCallback((next: SculptDoc) => { historyRef.current?.replace(next); commitDoc(next, false); }, [commitDoc]);
  const endDrag = useCallback(() => {
    const h = historyRef.current;
    if (!h) return;
    if (h.inGesture) { h.commit(); commitDoc(h.present, true); setHistoryTick((t) => t + 1); }
  }, [commitDoc]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; commitDoc(h.undo(), true); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; commitDoc(h.redo(), true); setHistoryTick((t) => t + 1); }, [commitDoc]);

  // The preview toggle: the shipped body, or the edit. The drawings keep showing both.
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

  // Frame both drawings on the whole body when the document or the cells first exist.
  const fit = useCallback(() => {
    if (!doc || !rects) return;
    const pad = 1.25;
    const mid = latMid(doc);
    const half = doc.bounds.width / 2;
    const fitView = (r: Rect, spanA: number, spanV: number, centre: [number, number]): Camera2D => ({
      centre, upp: Math.max(spanA * pad / Math.max(r.width, 1), spanV * pad / Math.max(r.height, 1)),
    });
    const ca = (doc.bounds.axisMin + doc.bounds.axisMax) / 2;
    const ys = doc.stations.flatMap((s) => [s.base.dorsal, s.base.ventral]);
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    setCams({
      side: fitView(rects.side, doc.bounds.length, doc.bounds.height, [ca, cy]),
      top: fitView(rects.top, doc.bounds.length, half * 2, [ca, mid]),
    });
  }, [doc, rects]);
  useEffect(() => { if (!cams) fit(); }, [cams, fit]);

  // Hand the scene its viewports whenever anything about them changes.
  useEffect(() => {
    if (!rects) return;
    scene.setLayout('sculpt', rects.main);
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
    const el = e.currentTarget;
    const target = e.target as SVGElement;
    const kind = target.dataset.kind as Drag['kind'] | 'region' | undefined;
    el.setPointerCapture(e.pointerId);
    const base: Drag = { kind: 'pan', view, startX: e.clientX, startY: e.clientY, startCentre: [...cams[view].centre] as [number, number] };
    if (kind === 'point' || kind === 'handle') {
      const station = Number(target.dataset.station), curve = target.dataset.curve as CurveName;
      setActiveStation(station); setActiveCurve(curve); setActiveFeature(null);
      const s = doc.stations[station];
      dragRef.current = {
        ...base, kind, station, curve,
        mirror: (Number(target.dataset.mirror) || 1) as 1 | -1,
        side: (Number(target.dataset.side) || 1) as 1 | -1,
        startShift: s.shift, startValue: s.edit[curve],
      };
    } else if (kind === 'eye' || kind === 'eyeSize') {
      setActiveFeature('eyes'); setActiveStation(null);
      const eye = doc.eyes!;
      const [a, v] = featureScreen(doc, view, 'eyes', (Number(target.dataset.mirror) || 1) as 1 | -1);
      dragRef.current = { ...base, kind, mirror: (Number(target.dataset.mirror) || 1) as 1 | -1, startA: a, startV: v, startScale: eye.scale };
    } else if (kind === 'mouth' || kind === 'mouthWidth' || kind === 'mouthHeight') {
      setActiveFeature('mouth'); setActiveStation(null);
      const m = doc.mouth!;
      const [a, v] = featureScreen(doc, view, 'mouth', 1);
      dragRef.current = { ...base, kind, mirror: (Number(target.dataset.mirror) || 1) as 1 | -1, startA: a, startV: v, startScale: kind === 'mouthHeight' ? m.height : m.width };
    } else if (kind === 'region') {
      setRegion(Number(target.dataset.region)); setActiveFeature(null);
      dragRef.current = base;
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
    const h = historyRef.current!;
    const present = h.present;
    if (d.kind === 'point') {
      // Along the body the station moves; across it the value follows the pointer.
      const s = present.stations[d.station!];
      void s;
      let next = setShift(present, d.station!, d.startShift! + dx * upp);
      const dv = -dy * upp * (d.mirror ?? 1);
      next = setValue(next, d.station!, d.curve!, d.startValue! + dv);
      drag(next);
    } else if (d.kind === 'handle') {
      // The pointer's offset from the point, in model units, is the new slope; the handles stay
      // symmetric, so either one sets it. Too close to the point and the slope is meaningless.
      const s = present.stations[d.station!];
      const span = handleSpan(present, d.station!);
      const [px, py] = toPx(view, s.axis + s.shift, valueOnScreen(doc, view, d.curve!, s.edit[d.curve!], d.mirror ?? 1));
      const box = e.currentTarget.getBoundingClientRect();
      const da = (e.clientX - box.left - px) * upp, dv = -(e.clientY - box.top - py) * upp * (d.mirror ?? 1);
      if (Math.abs(da) < span * .15) return;
      drag(setTangent(present, d.station!, d.curve!, dv / da));
    } else if (d.kind === 'eye') {
      const probe = probeRef.current!;
      const a = d.startA! + dx * upp, v = d.startV! - dy * upp;
      if (view === 'side') drag(moveEyesOnFlank(present, probe, a, v));
      else {
        // The top view's vertical is the lateral offset from the midline, on whichever side was grabbed.
        const off = Math.abs(v - latMid(present)) / 1;
        drag(moveEyesOnCrown(present, probe, a, present.bounds.lateralMid + off));
      }
    } else if (d.kind === 'eyeSize') {
      // The rim square sits one radius out along the axis; its new distance is the new radius.
      const eye = present.eyes!;
      const [cx] = toPx(view, eye.edit.axis, 0);
      const box = e.currentTarget.getBoundingClientRect();
      const r = Math.max(2, (e.clientX - box.left - cx)) * upp;
      drag(setEyeScale(present, r / eye.radius));
    } else if (d.kind === 'mouth') {
      const a = d.startA! + dx * upp, v = d.startV! - dy * upp;
      if (view === 'side') drag(setMouth(present, { edit: { axis: a, up: v } }));
      else drag(setMouth(present, { edit: { axis: a } }));
    } else if (d.kind === 'mouthWidth') {
      const m = present.mouth!;
      const [cx] = toPx(view, m.edit.axis, 0);
      void cx;
      const [, cyPx] = toPx(view, m.edit.axis, latMid(present));
      const box = e.currentTarget.getBoundingClientRect();
      const off = Math.abs(e.clientY - box.top - cyPx) * upp;
      drag(setMouth(present, { width: off / Math.max(m.radius, 1e-6) }));
    } else if (d.kind === 'mouthHeight') {
      const m = present.mouth!;
      const [, cyPx] = toPx(view, m.edit.axis, m.edit.up);
      const box = e.currentTarget.getBoundingClientRect();
      const off = Math.abs(e.clientY - box.top - cyPx) * upp;
      drag(setMouth(present, { height: off / Math.max(m.radius, 1e-6) }));
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
    // Zoom about the cursor: the model point under it stays put.
    const centre: [number, number] = [a - (px - rects[view].width / 2) * upp, v + (py - rects[view].height / 2) * upp];
    setCams({ ...cams, [view]: { centre, upp } });
  }

  function onDoubleClick(e: React.MouseEvent<SVGSVGElement>) {
    const target = e.target as SVGElement;
    if (target.dataset.kind === 'handle' && doc) {
      step(setTangent(doc, Number(target.dataset.station), target.dataset.curve as CurveName, undefined));
    }
  }

  // ---- export ----
  function exportSculpt() {
    if (!doc) return;
    const payload = exportDoc(doc);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.id}-sculpt.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const h = historyRef.current;
  const reg = doc?.regions[region];
  const active = doc && activeStation != null ? doc.stations[activeStation] : null;
  void historyTick;
  const edited = !!doc && !isIdentity(doc);

  const panel = (
    <aside className="sculpt-panel" aria-label="Sculpt">
      <div className="sculpt-head">
        <span className="role">SCULPT</span>
        <h2 className={specimen.name.length > 11 ? 'long-name' : undefined}>{specimen.name}</h2>
      </div>
      {error && <p className="sculpt-error">{error}</p>}
      <div className="sculpt-actions">
        <button className="ghost" onClick={undo} disabled={!h?.canUndo} title="⌘/Ctrl+Z">Undo</button>
        <button className="ghost" onClick={redo} disabled={!h?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
        <button className="ghost" onClick={fit}>Fit</button>
      </div>
      <div className="sculpt-toggle" role="group" aria-label="Preview" title="O toggles">
        <button className={!previewOriginal ? 'active' : ''} aria-pressed={!previewOriginal} onClick={() => setPreview(false)}>Edited</button>
        <button className={previewOriginal ? 'active' : ''} aria-pressed={previewOriginal} onClick={() => setPreview(true)} disabled={!edited}>Original</button>
      </div>
      <h3>Regions</h3>
      <div className="sculpt-regions" role="group" aria-label="Regions">
        {doc?.regions.map((r, i) => (
          <button key={r.name} className={`clip ${i === region && !activeFeature ? 'active' : ''}`} aria-pressed={i === region && !activeFeature} onClick={() => { setRegion(i); setActiveStation(null); setActiveFeature(null); }}>
            {r.name}
            {regionChanged(doc, r) && <i className="sculpt-dot" title="Edited" />}
          </button>
        ))}
      </div>
      {doc && (doc.eyes || doc.mouth) && <>
        <h3>Features</h3>
        <div className="sculpt-features" role="group" aria-label="Features">
          {doc.eyes && <button className={`clip ${activeFeature === 'eyes' ? 'active' : ''}`} aria-pressed={activeFeature === 'eyes'} onClick={() => { setActiveFeature('eyes'); setActiveStation(null); }}>
            Eyes{eyesChanged(doc) && <i className="sculpt-dot" title="Edited" />}
          </button>}
          {doc.mouth && <button className={`clip ${activeFeature === 'mouth' ? 'active' : ''}`} aria-pressed={activeFeature === 'mouth'} onClick={() => { setActiveFeature('mouth'); setActiveStation(null); }}>
            Mouth{mouthChanged(doc) && <i className="sculpt-dot" title="Edited" />}
          </button>}
        </div>
      </>}
      <p className="hint">
        {activeFeature === 'eyes' ? 'Drag the eye on the side view to slide it along the flank (it keeps its seat in the skin), on the top view to bring the pair closer or further apart. The square on its rim resizes it.'
          : activeFeature === 'mouth' ? 'Drag the mouth to move it; drag the bar ends on the top view to widen it, the handle on the side view to deepen it. The region reach sets how much surrounding surface follows.'
          : 'Drag a point across the body to change it, along the body to move the station. Pull the active point\'s handles to bend the curve; double-click a handle to release it.'}
      </p>
      {doc && reg && !activeFeature && (
        <div className="sculpt-actions">
          <button className="ghost" onClick={() => step(resetStations(doc, reg.from, reg.to))} disabled={!regionChanged(doc, reg)}>Reset region</button>
          <button className="ghost" onClick={() => step(resetStations(doc))} disabled={!edited}>Reset all</button>
        </div>
      )}
      {doc && active && activeStation != null && !activeFeature && (
        <section className="sculpt-station" aria-label="Active station">
          <h3>Station {activeStation + 1} · {Math.round(active.headFraction * 100)}% from the nose</h3>
          <label>
            <span>Along the body</span>
            <NumberField value={active.axis + active.shift} step={doc.bounds.length / 400}
              range={(() => { const [lo, hi] = shiftRange(doc.stations, activeStation); return [active.axis + lo, active.axis + hi]; })()}
              onChange={(v) => step(setShift(doc, activeStation, v - active.axis))} />
            <small>base {fmt(active.axis)} · shift {fmt(active.shift, true)}</small>
          </label>
          {CURVES.map((c) => (
            <label key={c} className={c === activeCurve ? 'active' : undefined}>
              <span>{CURVE_LABEL[c]}</span>
              <NumberField value={active.edit[c]} step={doc.bounds.height / 400} onChange={(v) => step(setValue(doc, activeStation, c, v))} />
              <small>
                base {fmt(active.base[c])}{pct(active.base[c], active.edit[c])}
                {' · '}slope {fmt(active.tangent[c] ?? autoSlope(doc.stations, activeStation, c, 'edit'))}
                {active.tangent[c] !== undefined && <> <button className="link" onClick={() => step(setTangent(doc, activeStation, c, undefined))}>auto</button></>}
              </small>
            </label>
          ))}
        </section>
      )}
      {doc && doc.eyes && activeFeature === 'eyes' && (
        <section className="sculpt-station" aria-label="Eyes">
          <h3>Eyes{doc.eyes.mirrored ? ' · a mirrored pair' : ''}</h3>
          <label><span>Along the body</span>
            <NumberField value={doc.eyes.edit.axis} step={doc.bounds.length / 400} onChange={(v) => step(moveEyesOnFlank(doc, probeRef.current!, v, doc.eyes!.edit.up))} />
            <small>base {fmt(doc.eyes.base.axis)} · moved {fmt(doc.eyes.edit.axis - doc.eyes.base.axis, true)}</small></label>
          <label><span>Height on the flank</span>
            <NumberField value={doc.eyes.edit.up} step={doc.bounds.height / 400} onChange={(v) => step(moveEyesOnFlank(doc, probeRef.current!, doc.eyes!.edit.axis, v))} />
            <small>base {fmt(doc.eyes.base.up)} · seat depth {fmt(doc.eyes.depthLateral)}</small></label>
          <label><span>Distance from the midline</span>
            <NumberField value={Math.abs(doc.eyes.edit.lateral - doc.bounds.lateralMid)} step={doc.bounds.width / 400} onChange={(v) => step(moveEyesOnCrown(doc, probeRef.current!, doc.eyes!.edit.axis, doc.bounds.lateralMid + Math.abs(v)))} />
            <small>base {fmt(Math.abs(doc.eyes.base.lateral - doc.bounds.lateralMid))} · the pair moves together</small></label>
          <label><span>Size</span>
            <NumberField value={doc.eyes.scale} step={.05} onChange={(v) => step(setEyeScale(doc, v))} />
            <small>radius {fmt(doc.eyes.radius)}{pct(1, doc.eyes.scale)}</small></label>
          <label><span>Skin that follows (radii)</span>
            <NumberField value={doc.eyes.reach} step={.1} onChange={(v) => step(setEyeReach(doc, v))} />
            <small>the socket and orbit move with the eye out to this distance</small></label>
          <div className="sculpt-actions"><button className="ghost" onClick={() => step(resetFeatures(doc, 'eyes'))} disabled={!eyesChanged(doc)}>Reset eyes</button></div>
        </section>
      )}
      {doc && doc.mouth && activeFeature === 'mouth' && (
        <section className="sculpt-station" aria-label="Mouth">
          <h3>Mouth</h3>
          <label><span>Width</span>
            <NumberField value={doc.mouth.width} step={.05} onChange={(v) => step(setMouth(doc, { width: v }))} />
            <small>{pct(1, doc.mouth.width) || 'as shipped'}</small></label>
          <label><span>Height</span>
            <NumberField value={doc.mouth.height} step={.05} onChange={(v) => step(setMouth(doc, { height: v }))} />
            <small>{pct(1, doc.mouth.height) || 'as shipped'}</small></label>
          <label><span>Along the body</span>
            <NumberField value={doc.mouth.edit.axis} step={doc.bounds.length / 400} onChange={(v) => step(setMouth(doc, { edit: { axis: v } }))} />
            <small>base {fmt(doc.mouth.base.axis)} · moved {fmt(doc.mouth.edit.axis - doc.mouth.base.axis, true)}</small></label>
          <label><span>Height on the body</span>
            <NumberField value={doc.mouth.edit.up} step={doc.bounds.height / 400} onChange={(v) => step(setMouth(doc, { edit: { up: v } }))} />
            <small>base {fmt(doc.mouth.base.up)}</small></label>
          <label><span>Region radius</span>
            <NumberField value={doc.mouth.radius} step={doc.bounds.height / 200} onChange={(v) => step(setMouth(doc, { radius: v }))} />
            <small>× reach <NumberInline value={doc.mouth.reach} onChange={(v) => step(setMouth(doc, { reach: v }))} /> — the surface within this distance of the mouth socket changes</small></label>
          <div className="sculpt-actions"><button className="ghost" onClick={() => step(resetFeatures(doc, 'mouth'))} disabled={!mouthChanged(doc)}>Reset mouth</button></div>
        </section>
      )}
      <div className="sculpt-foot">
        <button className="ghost primary" onClick={exportSculpt} disabled={!doc}>Export sculpt{edited ? ' (edited)' : ''}</button>
        <button className="ghost" onClick={onExit}>Done · back to view</button>
      </div>
    </aside>
  );

  const drawingProps = { region, activeStation, activeCurve, activeFeature, toPx, onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick };
  return (
    <>
      <div className="sculpt-stage" ref={stageRef}>
        <div className="sculpt-cell sculpt-side" ref={cellRefs.side}>
          <span className="sculpt-label">Side · dorsal and ventral lines</span>
          {doc && cams && rects && <Drawing view="side" doc={doc} rects={rects} cams={cams} {...drawingProps} />}
        </div>
        <div className="sculpt-cell sculpt-top" ref={cellRefs.top}>
          <span className="sculpt-label">Top · width</span>
          {doc && cams && rects && <Drawing view="top" doc={doc} rects={rects} cams={cams} {...drawingProps} />}
        </div>
        <div className="sculpt-cell sculpt-main" ref={cellRefs.main}>
          <span className="sculpt-label">Preview · {previewOriginal ? 'original' : 'edited'} · drag to orbit</span>
        </div>
      </div>
      {panel}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The drawing: one SVG over an orthographic render
// ---------------------------------------------------------------------------------------------

interface DrawingProps {
  view: ViewName;
  doc: SculptDoc;
  rects: Record<ViewName | 'main', Rect>;
  cams: Record<ViewName, Camera2D>;
  region: number;
  activeStation: number | null;
  activeCurve: CurveName;
  activeFeature: Feature | null;
  toPx(view: ViewName, a: number, v: number): [number, number];
  onPointerDown(view: ViewName, e: React.PointerEvent<SVGSVGElement>): void;
  onPointerMove(view: ViewName, e: React.PointerEvent<SVGSVGElement>): void;
  onPointerUp(e: React.PointerEvent<SVGSVGElement>): void;
  onWheel(view: ViewName, e: React.WheelEvent<SVGSVGElement>): void;
  onDoubleClick(e: React.MouseEvent<SVGSVGElement>): void;
}

function Drawing(p: DrawingProps) {
  const { view, doc, rects, cams, region, activeStation, activeCurve, activeFeature, toPx } = p;
  const r = rects[view];
  const upp = cams[view].upp;
  const curves: { curve: CurveName; mirror: 1 | -1 }[] = view === 'side'
    ? [{ curve: 'dorsal', mirror: 1 }, { curve: 'ventral', mirror: 1 }]
    : [{ curve: 'width', mirror: 1 }, { curve: 'width', mirror: -1 }];
  const svgRef = useRef<SVGSVGElement>(null);
  // Wheel must be non-passive to stop the page scrolling; React's onWheel is passive.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => p.onWheel(view, e as unknown as React.WheelEvent<SVGSVGElement>);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  });

  const path = (curve: CurveName, which: 'base' | 'edit', mirror: 1 | -1) => {
    const pts: string[] = [];
    const n = doc.stations.length;
    for (let i = 0; i < n - 1; i++) {
      const s0 = doc.stations[i], s1 = doc.stations[i + 1];
      const steps = 6;
      for (let k = 0; k < steps; k++) {
        const a = s0.axis + (s1.axis - s0.axis) * (k / steps);
        const v = evaluate(doc.stations, curve, which, a);
        const aa = which === 'edit' ? remap(doc, a) : a;
        const [x, y] = toPx(view, aa, valueOnScreen(doc, view, curve, v, mirror));
        pts.push(`${pts.length ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
      }
    }
    const last = doc.stations[n - 1];
    const [x, y] = toPx(view, last.axis + (which === 'edit' ? last.shift : 0), valueOnScreen(doc, view, curve, last[which][curve], mirror));
    pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
    return pts.join(' ');
  };

  // Bands run between the midpoints to the neighbouring stations; the two end regions run off the
  // edge of the drawing whichever end of the axis the head happens to be at.
  const regionBands = doc.regions.map((reg, i) => {
    const a0 = reg.from === 0 ? doc.bounds.axisMin - doc.bounds.length : edge(doc, reg.from, -1);
    const a1 = reg.to === doc.stations.length - 1 ? doc.bounds.axisMax + doc.bounds.length : edge(doc, reg.to, 1);
    const [x0] = toPx(view, Math.min(a0, a1), 0), [x1] = toPx(view, Math.max(a0, a1), 0);
    return { reg, i, x0, x1 };
  });
  const sel = activeFeature ? undefined : doc.regions[region];
  const span = activeStation != null ? handleSpan(doc, activeStation) : 0;

  // ---- feature markers ----
  const eye = doc.eyes, mouth = doc.mouth;
  const eyeMarks = eye ? (view === 'top' && eye.mirrored ? [1, -1] as const : [1] as const).map((mirror) => {
    const [a, v] = featureScreen(doc, view, 'eyes', mirror);
    const [ba, bv] = featureScreen(doc, view, 'eyes', mirror, 'base');
    const [x, y] = toPx(view, a, v), [bx, by] = toPx(view, ba, bv);
    return { mirror, x, y, bx, by, rr: eye.radius * eye.scale / upp, br: eye.radius / upp };
  }) : [];
  const mouthMark = mouth ? (() => {
    const [a, v] = featureScreen(doc, view, 'mouth', 1);
    const [x, y] = toPx(view, a, v);
    const half = mouth.radius * (view === 'top' ? mouth.width : mouth.height) / upp;
    return { x, y, half, reach: mouth.radius * mouth.reach / upp };
  })() : null;

  return (
    <svg ref={svgRef} className="sculpt-svg" width={r.width} height={r.height} viewBox={`0 0 ${r.width} ${r.height}`}
      onPointerDown={(e) => p.onPointerDown(view, e)} onPointerMove={(e) => p.onPointerMove(view, e)}
      onPointerUp={p.onPointerUp} onPointerCancel={p.onPointerUp} onDoubleClick={p.onDoubleClick}>
      {regionBands.map(({ reg, i, x0, x1 }) => {
        // The label sits in the visible part of its band, so the end regions stay named at the edge.
        const v0 = Math.max(0, x0), v1 = Math.min(r.width, x1);
        return (
          <g key={reg.name}>
            <rect data-kind="region" data-region={i} className={`sculpt-band ${i === region && !activeFeature ? 'active' : ''}`} x={x0} y={0} width={Math.max(0, x1 - x0)} height={r.height} />
            {v1 > v0 + 24 && <text className="sculpt-band-label" x={(v0 + v1) / 2} y={r.height - 8} textAnchor="middle">{reg.name}</text>}
          </g>
        );
      })}
      {curves.map(({ curve, mirror }) => (
        <g key={`${curve}${mirror}`}>
          <path className="sculpt-curve base" d={path(curve, 'base', mirror)} />
          <path className={`sculpt-curve edit ${curve}`} d={path(curve, 'edit', mirror)} />
        </g>
      ))}
      {sel && curves.map(({ curve, mirror }) => Array.from({ length: sel.to - sel.from + 1 }, (_, k) => sel.from + k).map((i) => {
        const s = doc.stations[i];
        const [x, y] = toPx(view, s.axis + s.shift, valueOnScreen(doc, view, curve, s.edit[curve], mirror));
        const isActive = i === activeStation && curve === activeCurve;
        const changed = s.edit[curve] !== s.base[curve] || s.shift !== 0 || s.tangent[curve] !== undefined;
        const slope = s.tangent[curve] ?? autoSlope(doc.stations, i, curve, 'edit');
        return (
          <g key={`${curve}${mirror}${i}`}>
            {isActive && ([1, -1] as const).map((side) => {
              const hx = x + side * span / upp;
              const hy = y - side * slope * span / upp * mirror;
              return (
                <g key={side}>
                  <line className="sculpt-handle-line" x1={x} y1={y} x2={hx} y2={hy} />
                  <circle data-kind="handle" data-station={i} data-curve={curve} data-mirror={mirror} data-side={side}
                    className={`sculpt-handle ${s.tangent[curve] !== undefined ? 'pulled' : ''}`} cx={hx} cy={hy} r={HANDLE_R}>
                    <title>Tangent handle: drag to bend the curve, double-click for automatic</title>
                  </circle>
                </g>
              );
            })}
            <circle data-kind="point" data-station={i} data-curve={curve} data-mirror={mirror}
              className={`sculpt-point ${curve} ${isActive ? 'active' : ''} ${changed ? 'changed' : ''}`} cx={x} cy={y} r={isActive ? ACTIVE_R : POINT_R}>
              <title>{`${CURVE_LABEL[curve]} at station ${i + 1}: ${fmt(s.edit[curve])}${pct(s.base[curve], s.edit[curve])}`}</title>
            </circle>
          </g>
        );
      }))}
      {eye && eyeMarks.map((m) => (
        <g key={`eye${m.mirror}`}>
          {eyesChanged(doc) && <circle className="sculpt-feature base" cx={m.bx} cy={m.by} r={Math.max(2, m.br)} />}
          <circle data-kind="eye" data-mirror={m.mirror} className={`sculpt-feature ${activeFeature === 'eyes' ? 'active' : ''} ${eyesChanged(doc) ? 'changed' : ''}`} cx={m.x} cy={m.y} r={Math.max(3, m.rr)}>
            <title>{`Eye: drag to move ${view === 'side' ? 'along the flank' : 'across the crown'}`}</title>
          </circle>
          {activeFeature === 'eyes' && <rect data-kind="eyeSize" data-mirror={m.mirror} className="sculpt-size" x={m.x + Math.max(3, m.rr) - 4} y={m.y - 4} width={8} height={8}>
            <title>Drag to resize the eyes</title>
          </rect>}
          {activeFeature === 'eyes' && m.mirror === 1 && <text className="sculpt-feature-label" x={m.x} y={m.y - Math.max(3, m.rr) - 6} textAnchor="middle">eye</text>}
        </g>
      ))}
      {mouth && mouthMark && (
        <g>
          {activeFeature === 'mouth' && <circle className="sculpt-feature base" cx={mouthMark.x} cy={mouthMark.y} r={Math.max(2, mouthMark.reach)} />}
          {view === 'top'
            ? <line data-kind="mouthWidth" className="sculpt-mouth-bar" x1={mouthMark.x} y1={mouthMark.y - mouthMark.half} x2={mouthMark.x} y2={mouthMark.y + mouthMark.half}><title>Mouth width: drag an end</title></line>
            : <line data-kind="mouthHeight" className="sculpt-mouth-bar" x1={mouthMark.x} y1={mouthMark.y - mouthMark.half} x2={mouthMark.x} y2={mouthMark.y + mouthMark.half}><title>Mouth height: drag an end</title></line>}
          <circle data-kind="mouth" className={`sculpt-feature ${activeFeature === 'mouth' ? 'active' : ''} ${mouthChanged(doc) ? 'changed' : ''}`} cx={mouthMark.x} cy={mouthMark.y} r={6}>
            <title>Mouth: drag to move</title>
          </circle>
          {activeFeature === 'mouth' && <text className="sculpt-feature-label" x={mouthMark.x} y={mouthMark.y - 12} textAnchor="middle">mouth</text>}
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const CURVE_LABEL: Record<CurveName, string> = { dorsal: 'Dorsal (top line)', ventral: 'Ventral (bottom line)', width: 'Width (half, from the midline)' };

function rootFramePositions(base: Float32Array, toRoot: SculptMesh['toRoot']): Float32Array {
  const e = toRoot.elements;
  const out = new Float32Array(base.length);
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2];
    out[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return out;
}

/** The lateral midline as the top view draws it (the scene's top camera has +x up for a z body, −z up for an x body). */
const latSign = (doc: SculptDoc) => (doc.frame.axis === 'z' ? 1 : -1);
const latMid = (doc: SculptDoc) => latSign(doc) * doc.bounds.lateralMid;

/** A curve value as a screen-vertical model coordinate for its view. */
function valueOnScreen(doc: SculptDoc, view: ViewName, curve: CurveName, v: number, mirror: 1 | -1): number {
  if (view === 'side') return v;
  return latMid(doc) + mirror * v;
}

/** A feature's centre in a view's (along, vertical) model coordinates; `mirror` picks the other eye on the top view. */
function featureScreen(doc: SculptDoc, view: ViewName, which: Feature, mirror: 1 | -1, state: 'base' | 'edit' = 'edit'): [number, number] {
  const f = which === 'eyes' ? doc.eyes! : doc.mouth!;
  const pt = f[state];
  if (view === 'side') return [pt.axis, pt.up];
  const off = pt.lateral - doc.bounds.lateralMid;
  return [pt.axis, latMid(doc) + latSign(doc) * off * mirror];
}

function remap(doc: SculptDoc, a: number): number {
  const s = doc.stations;
  const n = s.length;
  if (a <= s[0].axis) return a + s[0].shift;
  if (a >= s[n - 1].axis) return a + s[n - 1].shift;
  let i = 0;
  while (i < n - 2 && s[i + 1].axis <= a) i++;
  const t = (a - s[i].axis) / (s[i + 1].axis - s[i].axis);
  return s[i].axis + s[i].shift + ((s[i + 1].axis + s[i + 1].shift) - (s[i].axis + s[i].shift)) * t;
}

/** The axial edge of a region: halfway to the neighbouring station. */
function edge(doc: SculptDoc, i: number, dir: 1 | -1): number {
  const s = doc.stations;
  const j = i + dir;
  if (j < 0 || j >= s.length) return s[i].axis + s[i].shift;
  return ((s[i].axis + s[i].shift) + (s[j].axis + s[j].shift)) / 2;
}

/** How far a tangent handle sits from its point: a third of the local span. */
function handleSpan(doc: SculptDoc, i: number): number {
  const s = doc.stations;
  const prev = i > 0 ? s[i].axis - s[i - 1].axis : s[i + 1].axis - s[i].axis;
  const next = i < s.length - 1 ? s[i + 1].axis - s[i].axis : prev;
  return Math.min(prev, next) / 3;
}

function regionChanged(doc: SculptDoc, r: { from: number; to: number }): boolean {
  for (let i = r.from; i <= r.to; i++) {
    const s = doc.stations[i];
    if (s.shift !== 0 || CURVES.some((c) => s.edit[c] !== s.base[c] || s.tangent[c] !== undefined)) return true;
  }
  return false;
}

const fmt = (v: number, signed = false) => `${signed && v > 0 ? '+' : ''}${Number.isFinite(v) ? v.toFixed(3) : '—'}`;
const pct = (b: number, e: number) => (Math.abs(b) < 1e-6 || b === e ? '' : ` (${e > b ? '+' : ''}${((e / b - 1) * 100).toFixed(1)}%)`);

function NumberField({ value, step, range, onChange }: { value: number; step: number; range?: [number, number]; onChange(v: number): void }) {
  const [text, setText] = useState(value.toFixed(3));
  useEffect(() => { setText(value.toFixed(3)); }, [value]);
  const commit = () => {
    const v = Number(text);
    if (!Number.isFinite(v)) { setText(value.toFixed(3)); return; }
    const c = range ? Math.min(range[1], Math.max(range[0], v)) : v;
    if (c !== value) onChange(c);
    else setText(value.toFixed(3));
  };
  return (
    <input type="number" step={step} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
  );
}

function NumberInline({ value, onChange }: { value: number; onChange(v: number): void }) {
  return <input className="sculpt-inline" type="number" step={.1} value={value} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(v); }} />;
}
