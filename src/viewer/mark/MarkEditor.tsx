import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerSpecimen } from '../catalogue';
import type { MarkTarget, ViewerScene } from '../scene';
import { History } from '../sculpt/history';
import { brushHits, buildRegion, cloneMarks, describeMarked, emptyMarks, markedCount, paintInto, totalVertices, type Marks } from './region';
import { getRegion, regionKey, setRegion } from './store';
import { useMeasuredHash } from '../file-hash';

/**
 * Mark mode: paint the geometry that should not be there, and export it.
 *
 * The raw generated bodies carry extra fins and spare tails welded into the one surface, so no
 * script can find them and only a human can point at them (docs/triassic/preview-mesh-defects.md).
 * This is the pointing. The brush is a sphere in world space: drag across the body with the left
 * button and every vertex inside it is marked, which is why the ring is drawn at the size it
 * actually catches rather than a fixed cursor. The brush owning the left button is what makes this
 * the one mode on the `paint` pointer scheme (`../pointer-scheme`): orbiting moves to the right
 * button and panning to the middle one, since the wheel already zooms and a mode with no pan at
 * all cannot be aimed once it is zoomed in. The mouth and bend editors keep the ordinary scheme,
 * because their handles want the left button only while the pointer is on one. The stage says
 * which in as many words.
 *
 * Nothing is saved: the marks live in the session's store so a trip through view mode does not
 * lose them, and a reload starts clean. What leaves is the region file.
 */

interface Props {
  scene: ViewerScene;
  specimen: ViewerSpecimen;
  /** The body actually on stage — a region is indices into one file, not into "the animal". */
  model: string;
  /** That file's hash where the manifest knows it, so a cut can refuse a stale region. */
  sha256?: string;
  /** The stage canvas: the brush listens on it directly, because the orbit already owns it. */
  canvas: HTMLCanvasElement;
  onExit(): void;
}

/** Brush radius as a share of the body's own radius: a hatchling and a shonisaur want the same grip. */
const BRUSH_MIN = 0.01, BRUSH_MAX = 0.3, BRUSH_DEFAULT = 0.06;

export function MarkEditor({ scene, specimen, model, sha256: manifestSha, canvas, onExit }: Props) {
  // Measured off the file on stage; the manifest's hash is the fallback where it cannot be.
  const measured = useMeasuredHash(model);
  const sha256 = measured ?? manifestSha;
  const [target, setTarget] = useState<MarkTarget | null>(null);
  const [error, setError] = useState('');
  const [marked, setMarked] = useState(0);
  const [brush, setBrush] = useState(BRUSH_DEFAULT);
  const [erase, setErase] = useState(false);
  const [note, setNote] = useState('');
  const [ring, setRing] = useState<{ x: number; y: number; r: number; on: boolean } | null>(null);
  /** The ring's last screen radius, for stepping a drag: a state read here would re-bind the listeners mid-stroke. */
  const ringRef = useRef(12);
  const [historyTick, setHistoryTick] = useState(0);
  const historyRef = useRef<History<Uint8Array[]> | null>(null);
  const strokeRef = useRef<{ marks: Uint8Array[]; last: [number, number] } | null>(null);
  // The pointer handlers live on the canvas for the life of the mode, so they read the current
  // brush and erase settings through refs rather than being re-bound on every slider tick.
  const brushRef = useRef(brush); brushRef.current = brush;
  const eraseRef = useRef(erase); eraseRef.current = erase;
  const targetRef = useRef<MarkTarget | null>(null);
  const key = regionKey(specimen.key, model);

  // ---- take up the body on stage ----
  useEffect(() => {
    const t = scene.markTarget();
    if (!t || !t.meshes.length) { setError('Nothing on stage to mark'); return; }
    targetRef.current = t;
    setTarget(t);
    const kept = getRegion(key);
    const fits = kept && kept.marks.length === t.meshes.length && kept.marks.every((m, i) => m.length === t.meshes[i].count);
    const marks = fits ? cloneMarks(kept!.marks) : emptyMarks(t.meshes);
    if (kept?.note) setNote(kept.note);
    historyRef.current = new History<Uint8Array[]>(marks);
    setMarked(markedCount(marks));
    // The rig goes to its bind pose: an animated body is drawn somewhere its vertex positions are
    // not, and a brush that marks the bind pose while the reviewer paints the swimming one marks
    // the wrong fin. A generated mesh has no rig and never moves anyway.
    scene.setRestPose(true);
    // The brush takes the left button, so the orbit moves to the right and the pan to the middle.
    scene.setPointerScheme('paint');
    scene.showMarks(marks);
    return () => {
      scene.setPointerScheme('view');
      scene.showMarks(null);
      scene.setRestPose(false);
    };
  }, [scene, key]);

  // The note belongs to the region rather than to a render, so the store gets whatever is typed.
  const noteRef = useRef(note); noteRef.current = note;
  const publish = useCallback((marks: Uint8Array[]) => {
    scene.showMarks(marks);
    setMarked(markedCount(marks));
    setRegion(key, marks, noteRef.current);
  }, [scene, key]);
  useEffect(() => { const h = historyRef.current; if (h) setRegion(key, h.present, note); }, [note, key]);

  const step = useCallback((marks: Uint8Array[]) => {
    historyRef.current?.push(marks);
    publish(marks);
    setHistoryTick((t) => t + 1);
  }, [publish]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; publish(h.undo()); setHistoryTick((t) => t + 1); }, [publish]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; publish(h.redo()); setHistoryTick((t) => t + 1); }, [publish]);
  const clearAll = useCallback(() => { const t = targetRef.current; if (t) step(emptyMarks(t.meshes)); }, [step]);

  // ---- the brush, on the canvas ----
  useEffect(() => {
    const t = targetRef.current;
    if (!t || error) return;
    const radius = () => brushRef.current * t.radius;

    const showRing = (px: number, py: number, point: readonly [number, number, number] | null) => {
      const p = scene.markProject(point ?? t.centre);
      if (!p) { setRing(null); return; }
      // Off the body the ring is drawn at the depth the body sits at, so it keeps meaning
      // something while the reviewer moves towards the fin rather than jumping about.
      const r = Math.max(2, radius() * p.scale);
      ringRef.current = r;
      setRing({ x: px, y: py, r, on: !!point });
    };

    const paintAt = (px: number, py: number) => {
      const stroke = strokeRef.current;
      if (!stroke) return false;
      const hit = scene.markPick(px, py);
      showRing(px, py, hit?.point ?? null);
      if (!hit) return false;
      let changed = 0;
      for (const mesh of t.meshes) {
        const hits = brushHits(mesh.world, hit.point[0], hit.point[1], hit.point[2], radius());
        changed += paintInto(stroke.marks[mesh.index], hits, eraseRef.current);
      }
      if (changed) { scene.showMarks(stroke.marks); setMarked(markedCount(stroke.marks)); }
      return changed > 0;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;      // the right button is the orbit's; the brush only takes the left
      const h = historyRef.current;
      if (!h) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      strokeRef.current = { marks: cloneMarks(h.present), last: [e.offsetX, e.offsetY] };
      paintAt(e.offsetX, e.offsetY);
    };
    const onMove = (e: PointerEvent) => {
      const stroke = strokeRef.current;
      if (!stroke) { showRing(e.offsetX, e.offsetY, scene.markPick(e.offsetX, e.offsetY)?.point ?? null); return; }
      // Painting is continuous along the drag, not one dab per event: the pointer can cross half a
      // fin between two moves, so the gap is walked in steps of a fraction of the brush.
      const [lx, ly] = stroke.last;
      const dist = Math.hypot(e.offsetX - lx, e.offsetY - ly);
      const stepPx = Math.max(2, ringRef.current * .5);
      const steps = Math.min(24, Math.max(1, Math.ceil(dist / stepPx)));
      for (let i = 1; i <= steps; i++) paintAt(lx + (e.offsetX - lx) * (i / steps), ly + (e.offsetY - ly) * (i / steps));
      stroke.last = [e.offsetX, e.offsetY];
    };
    const onUp = (e: PointerEvent) => {
      const stroke = strokeRef.current;
      strokeRef.current = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (!stroke) return;
      const h = historyRef.current!;
      // One pointer-down to pointer-up is one undo step, and a stroke that caught nothing is not
      // a step at all — a stray click on the water must not cost an undo.
      if (markedCount(stroke.marks) === markedCount(h.present)) { publish(h.present); return; }
      step(stroke.marks);
    };
    const onLeave = () => { if (!strokeRef.current) setRing(null); };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [canvas, scene, error, publish, step]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (mod) return;
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setErase((v) => !v); }
      else if (e.key === '[') { e.preventDefault(); setBrush((b) => Math.max(BRUSH_MIN, b / 1.2)); }
      else if (e.key === ']') { e.preventDefault(); setBrush((b) => Math.min(BRUSH_MAX, b * 1.2)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---- export ----
  function exportRegion() {
    const t = targetRef.current, h = historyRef.current;
    if (!t || !h) return;
    const file = buildRegion({
      id: specimen.id, model, sha256: sha256 ?? null, note, markedAt: new Date().toISOString(),
      meshes: t.meshes.map((m) => ({ index: m.index, name: m.name, count: m.count })),
      locals: t.meshes.map((m) => m.local),
      marks: h.present as Marks,
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${specimen.id}-region.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const h = historyRef.current;
  const total = target ? totalVertices(target.meshes) : 0;
  void historyTick;

  return (
    <>
      <div className="mark-stage">
        <span className="mark-label">Mark · left-drag paints · right-drag orbits · middle-drag pans · scroll zooms</span>
        {/* The brush ring is drawn at the size it actually catches, at the depth of the surface
            under the pointer, so what is about to be marked is visible before the button goes down. */}
        <svg className="mark-svg" aria-hidden="true">
          {ring && <circle className={`mark-ring ${erase ? 'erasing' : ''} ${ring.on ? '' : 'off'}`} cx={ring.x} cy={ring.y} r={ring.r} />}
        </svg>
      </div>
      <aside className="sculpt-panel mark-panel" aria-label="Mark region">
        <div className="sculpt-head">
          <span className="role">MARK REGION</span>
          <h2 className={specimen.name.length > 11 ? 'long-name' : undefined}>{specimen.name}</h2>
        </div>
        {error && <p className="sculpt-error">{error}</p>}
        <p className="hint">
          Paint over the geometry that should not be there — an extra fin, a spare tail — and export
          it. The file is a list of vertex indices into <code>{model.split('/').pop()}</code>;{' '}
          <code>tools/triassic/cut-region.py</code> cuts exactly those and nothing else.
        </p>
        <p className="mark-count" data-marked={marked} data-total={total}>{describeMarked(marked, total)}</p>
        <label className="mark-slider">
          <span>Brush · {(brush * 100).toFixed(0)}% of the body{'  '}<small>[ and ]</small></span>
          <input type="range" min={BRUSH_MIN} max={BRUSH_MAX} step={.005} value={brush}
            aria-label="Brush size" onChange={(e) => setBrush(Number(e.target.value))} />
        </label>
        <div className="sculpt-toggle" role="group" aria-label="Brush action" title="E toggles">
          <button className={!erase ? 'active' : ''} aria-pressed={!erase} onClick={() => setErase(false)}>Mark</button>
          <button className={erase ? 'active' : ''} aria-pressed={erase} onClick={() => setErase(true)}>Erase</button>
        </div>
        <div className="sculpt-actions">
          <button className="ghost" onClick={undo} disabled={!h?.canUndo} title="⌘/Ctrl+Z">Undo</button>
          <button className="ghost" onClick={redo} disabled={!h?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
          <button className="ghost" onClick={clearAll} disabled={!marked}>Clear all</button>
        </div>
        <label className="mark-note">
          <span>What is this region?</span>
          <textarea rows={2} value={note} placeholder="the three ventral fins" onChange={(e) => setNote(e.target.value)} />
        </label>
        {!sha256 && <p className="hint">
          {measured === undefined ? 'Hashing the file on stage…' : <>
            This file could not be hashed here (a plain http page cannot) and has no hash in
            <code>preview-bodies.json</code>, so the export cannot say which file it was marked on
            beyond its path. The cutting script will ask to be told so.
          </>}
        </p>}
        <div className="sculpt-foot">
          <button className="ghost primary" onClick={exportRegion} disabled={!marked}>Export region{marked ? ` (${marked.toLocaleString('en')})` : ''}</button>
          <button className="ghost" onClick={onExit}>Done · back to view</button>
        </div>
      </aside>
    </>
  );
}
