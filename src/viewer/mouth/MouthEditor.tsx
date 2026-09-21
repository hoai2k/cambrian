import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerSpecimen } from '../catalogue';
import { rootFramePositions, type MouthHandle, type ViewerScene } from '../scene';
import { useMeasuredHash } from '../file-hash';
import { History } from '../sculpt/history';
import { NumberField } from '../stretch/StretchEditor';
import {
  DEFAULT_GAPE, MAX_ANGLE, MAX_GAPE, aimForward, aimHinge, countSides, cutBasis, describeSides, exportDoc, flipForward,
  gapeWarp, levelCut, mandibleTest, measureMouth, moveHinge, setAngle, setAxis, setDepth, setLateral, setUp,
  type AppliesTo, type MouthDoc, type Vec3,
} from './mouth';
import { getMouth, mouthKey, setMouth } from './store';

/**
 * Mouth mode: aim a mouth cut on the body on stage, and export it.
 *
 * Three handles in the orbit view. The **hinge** (amber) is the pivot: drag it and the whole cut
 * goes with it — along the body that is how deep the cut is, up and down where the mouth line
 * sits, across which side it is seated on. The **front** handle (lagoon) is out at the nose end of
 * the mouth line: drag it to angle the line in profile (pitch) and turn the hinge in plan (yaw).
 * The **side** handle (magenta) is out on the pivot: drag it up or down to tip the plane (roll).
 * Every vertex the cut would take onto the mandible is lit as the drag goes, and the panel counts
 * them, so what the jaw would carry is seen rather than inferred. The panel's numeric fields set
 * the same six numbers exactly.
 *
 * Right-drag orbits, as in mark mode, because a mode where left-drag moves a handle has to leave
 * the model turnable without a modifier nobody would find. The rig goes to its bind pose while the
 * cut is aimed: a swimming body is drawn somewhere its vertex positions are not.
 *
 * **Gape** is the preview, and it is a preview of the cut rather than of the animal. Playing the
 * body's own clips would answer the wrong question — they open the jaw the file was *built* with,
 * which is a cut somebody measured before this one, and the cut being aimed is nowhere in the rig
 * — so the slider swings the document's own mandible set about its own hinge instead, rigidly,
 * live. Holding it hides every piece of the editor's furniture (the handles, the planes, the lit
 * vertices, the panel itself, the specimen list) so what is on screen while the jaw moves is the
 * animal and nothing else; letting go brings it all back with the jaw still where it was left, so
 * the hinge can be dragged and the fields typed with the mouth open and the effect seen as it is
 * made. That is what makes the two questions one: *is the hinge in the right place* is answered
 * by watching this jaw swing, not by reading a count.
 *
 * Nothing is saved. The document lives in the session's store so a trip through view mode does
 * not lose it, and a reload starts from the body's own guess. What leaves is the mouth file, with
 * the hash of the exact body it was aimed on (`docs/viewer-mouth.md`).
 */

interface Props {
  scene: ViewerScene;
  specimen: ViewerSpecimen;
  /** The body actually on stage — a cut is aimed on one file, not on "the animal". */
  model: string;
  /** That file's hash where a manifest knows it; the editor measures its own regardless. */
  sha256?: string;
  /** What kind of body that is, for the export to say which file the cut describes. */
  appliesTo: AppliesTo;
  /** The stage canvas: the handles listen on it directly, because the orbit already owns it. */
  canvas: HTMLCanvasElement;
  /** Raised while the gape is being held, so the viewer can take its own chrome off the screen. */
  onPreview?(previewing: boolean): void;
  onExit(): void;
}

interface Drag {
  handle: MouthHandle;
  /** The document the drag started from, so each move is measured from it rather than accumulated. */
  from: MouthDoc;
  /** Where the handle was when the drag began, root frame: the drag plane passes through it. */
  anchor: Vec3;
  /** Where the pointer first landed on that plane, so a grab off the handle's centre does not jump it. */
  start: Vec3;
}

export function MouthEditor({ scene, specimen, model, sha256, appliesTo, canvas, onPreview, onExit }: Props) {
  const [doc, setDocState] = useState<MouthDoc | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [hover, setHover] = useState<MouthHandle | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [gape, setGapeState] = useState(0);
  const [previewing, setPreviewingState] = useState(false);
  const historyRef = useRef<History<MouthDoc> | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const dragRef = useRef<Drag | null>(null);
  // The gape and the hold are read from inside `show`, which every commit goes through, so they
  // are kept in refs as well as in state: `show` has to stay stable or the effect that measures
  // the body would re-run — and re-measure it — every time the slider moved.
  const gapeRef = useRef(0);
  const previewRef = useRef(false);
  const key = mouthKey(specimen.key, model);

  /**
   * The document on stage: the body's jaw swung to the current gape, the helpers sized to the
   * head, and every mandible-side vertex lit *where the swing has put it*. While the gape is
   * being held the furniture comes off entirely, so the animal is all that is drawn.
   */
  const show = useCallback((d: MouthDoc) => {
    const warp = gapeWarp(d, gapeRef.current);
    scene.setMouthGape(warp);
    if (previewRef.current) { scene.showMouthCut(null, null); return; }
    const b = cutBasis(d);
    scene.showMouthCut({ ...b, reach: Math.max(d.depth, d.head.height * 0.25), halfWidth: d.head.width / 2, height: d.head.height }, mandibleTest(d), warp);
  }, [scene]);

  // ---- measure once per body, or take up the session's document ----
  useEffect(() => {
    const target = scene.sculptTarget();
    if (!target || !target.meshes.length) { setError('Nothing on stage to cut'); return; }
    const chunks = target.meshes.map((m) => rootFramePositions(m.base, m.toRoot));
    chunksRef.current = chunks;
    const kept = getMouth(key);
    let d = kept?.doc;
    if (!d) {
      try {
        d = measureMouth(
          { chunks, mouth: target.mouth, mouthInside: target.mouthInside, jaw: target.jaw, yaw: specimen.previewYaw, rigged: target.skinned },
          { key: specimen.key, id: specimen.id, collection: specimen.collection, model });
      } catch (e) { setError((e as Error).message); return; }
    }
    if (kept?.note) setNote(kept.note);
    historyRef.current = new History(d);
    setDocState(d);
    scene.setRestPose(true);
    // The handles only claim the left button while the pointer is on one, so the stage keeps the
    // ordinary scheme: left orbits, right pans, the wheel and the middle button dolly.
    scene.setPointerScheme('view');
    show(d);
    return () => {
      scene.showMouthCut(null, null);
      scene.setMouthGape(null);
      // This also hands the orbit back enabled, whatever the pointer was sitting on on the way out.
      scene.setPointerScheme('view');
      scene.setRestPose(false);
      canvas.style.cursor = '';
    };
  }, [scene, key, show, canvas, specimen, model]);

  // ---- the hash of the file on stage, measured rather than trusted (`file-hash.ts`) ----
  const measured = useMeasuredHash(model);

  // ---- every document change reaches the scene and the session store ----
  const noteRef = useRef(note); noteRef.current = note;
  const commitDoc = useCallback((next: MouthDoc) => {
    setDocState(next);
    setMouth(key, next, noteRef.current);
    show(next);
  }, [key, show]);
  useEffect(() => { const h = historyRef.current; if (h) setMouth(key, h.present, note); }, [note, key]);

  const step = useCallback((next: MouthDoc) => { historyRef.current?.push(next); commitDoc(next); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const drag = useCallback((next: MouthDoc) => { historyRef.current?.replace(next); commitDoc(next); }, [commitDoc]);
  const endDrag = useCallback(() => {
    const h = historyRef.current;
    if (h?.inGesture) { h.commit(); commitDoc(h.present); setHistoryTick((t) => t + 1); }
  }, [commitDoc]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; commitDoc(h.undo()); setHistoryTick((t) => t + 1); }, [commitDoc]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; commitDoc(h.redo()); setHistoryTick((t) => t + 1); }, [commitDoc]);

  // ---- the gape, and the hold that clears the screen for it ----
  /**
   * Set the gape and redraw. The angle is the preview's and never the document's: it is not in
   * the export, it is not an undo step, and a body left with its mouth open is a body a reviewer
   * chose to look at that way, not a cut that has changed.
   */
  const applyGape = useCallback((radians: number) => {
    const next = Math.max(0, Math.min(MAX_GAPE, Number.isFinite(radians) ? radians : 0));
    gapeRef.current = next;
    setGapeState(next);
    const d = historyRef.current?.present;
    if (d) show(d);
  }, [show]);

  const setPreviewing = useCallback((on: boolean) => {
    if (previewRef.current === on) return;
    previewRef.current = on;
    setPreviewingState(on);
    onPreview?.(on);
    const d = historyRef.current?.present;
    if (d) show(d);
  }, [show, onPreview]);

  // A hold has to end wherever the pointer or the key comes up. The slider keeps the pointer
  // through a drag, but a release off the window, a cancelled touch or a key let go while focus
  // has moved would otherwise leave the screen cleared with nothing holding it.
  useEffect(() => {
    if (!previewing) return;
    const off = () => setPreviewing(false);
    window.addEventListener('pointerup', off);
    window.addEventListener('pointercancel', off);
    window.addEventListener('keyup', off);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('pointerup', off);
      window.removeEventListener('pointercancel', off);
      window.removeEventListener('keyup', off);
      window.removeEventListener('blur', off);
    };
  }, [previewing, setPreviewing]);

  // Leaving the mode, or the body changing under it, must not leave a jaw hanging open.
  useEffect(() => () => { onPreview?.(false); }, [onPreview]);

  // ---- the handles, on the canvas ----
  useEffect(() => {
    if (error) return;
    const handleAnchor = (d: MouthDoc, handle: MouthHandle): Vec3 => {
      const b = cutBasis(d);
      const reach = Math.max(d.depth, d.head.height * 0.25), wide = d.head.width * 0.65;
      if (handle === 'front') return [b.centre[0] + b.forward[0] * reach, b.centre[1] + b.forward[1] * reach, b.centre[2] + b.forward[2] * reach];
      if (handle === 'side') return [b.centre[0] + b.hinge[0] * wide, b.centre[1] + b.hinge[1] * wide, b.centre[2] + b.hinge[2] * wide];
      return b.centre;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;      // the right button is the orbit's; the handles only take the left
      const h = historyRef.current;
      if (!h) return;
      const handle = scene.mouthPick(e.offsetX, e.offsetY);
      if (!handle) return;            // off a handle the press is the orbit's, and the orbit has it
      // Belt and braces beside the hover suspension below: a press can arrive with no move before
      // it (a tap, a pointer that entered already down, a synthetic event out of a harness), and
      // OrbitControls checks `enabled` again in its own move handler, so a disable that lands
      // after its `pointerdown` still keeps the camera still.
      scene.setOrbitEnabled(false);
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const anchor = handleAnchor(h.present, handle);
      const start = scene.dragPoint(e.offsetX, e.offsetY, anchor) ?? anchor;
      dragRef.current = { handle, from: h.present, anchor, start };
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) {
        const over = scene.mouthPick(e.offsetX, e.offsetY) ?? null;
        setHover(over);
        canvas.style.cursor = over ? 'grab' : '';
        // The orbit is suspended for as long as the pointer is over a handle, which is what keeps
        // a press on one from also swinging the camera — see `ViewerScene.setOrbitEnabled` for why
        // it cannot be done by swallowing the event instead.
        scene.setOrbitEnabled(!over);
        return;
      }
      const p = scene.dragPoint(e.offsetX, e.offsetY, d.anchor);
      if (!p) return;
      const c = cutBasis(d.from).centre;
      if (d.handle === 'hinge') {
        drag(moveHinge(d.from, [p[0] - d.start[0], p[1] - d.start[1], p[2] - d.start[2]]));
      } else if (d.handle === 'front') {
        drag(aimForward(d.from, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]));
      } else {
        drag(aimHinge(d.from, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]));
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      // Back to whatever the pointer is now over: a drag that ends on a handle must not re-arm the
      // orbit under it, or the next press there would swing the camera as well as the handle.
      scene.setOrbitEnabled(!scene.mouthPick(e.offsetX, e.offsetY));
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

  // ---- export ----
  function exportMouth() {
    const d = historyRef.current?.present;
    if (!d) return;
    const payload = exportDoc(d, {
      sha256: measured ?? sha256 ?? null,
      sha256Source: measured ? 'measured' : sha256 ? 'manifest' : null,
      appliesTo, note, authoredAt: new Date().toISOString(),
      sides: countSides(chunksRef.current, d),
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${specimen.id}-mouth.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const h = historyRef.current;
  void historyTick;
  const sides = doc ? countSides(chunksRef.current, doc) : { mandible: 0, skull: 0, total: 0 };
  const gapeDeg = deg(gape);
  const squared = !!doc && !doc.pitch && !doc.yaw && !doc.roll;
  const hash = measured ?? sha256 ?? null;

  return (
    <>
      <div className={`mark-stage mouth-stage ${previewing ? 'previewing' : ''}`}>
        <span className="mark-label">Mouth · left-drag a handle · right-drag orbits · shift+right pans · scroll zooms</span>
        <ul className="mouth-legend" aria-label="Handles">
          <li className={`hinge ${hover === 'hinge' ? 'hover' : ''}`}><i />hinge · drag to move the cut</li>
          <li className={`front ${hover === 'front' ? 'hover' : ''}`}><i />front · drag to pitch and turn the line</li>
          <li className={`side ${hover === 'side' ? 'hover' : ''}`}><i />side · drag to tip the plane</li>
        </ul>
      </div>
      <aside className={`sculpt-panel mouth-panel ${previewing ? 'previewing' : ''}`} aria-label="Mouth"
        data-gape={gapeDeg} data-previewing={previewing ? 'yes' : 'no'}>
        <div className="sculpt-head">
          <span className="role">MOUTH</span>
          <h2 className={specimen.name.length > 11 ? 'long-name' : undefined}>{specimen.name}</h2>
        </div>
        {error && <p className="sculpt-error">{error}</p>}
        <p className="hint">
          Aim the mouth cut: how far back the hinge goes, where the line sits, and the angle of it.
          The lit vertices are what the jaw would carry. The file names <code>{model.split('/').pop()}</code> by
          its hash, so a cut aimed here cannot be applied to a body that has changed since.
        </p>
        <p className="mouth-count" data-mandible={sides.mandible} data-total={sides.total}>{describeSides(sides)}</p>

        <section className="mouth-gape" aria-label="Gape preview">
          <label>
            <span>Gape · swing the jaw <b>{gapeDeg.toFixed(0)}°</b></span>
            <input type="range" min={0} max={MAX_GAPE_DEG} step={0.5} value={gapeDeg} disabled={!doc}
              aria-label="Gape"
              onChange={(e) => applyGape(rad(Number(e.target.value)))}
              onPointerDown={() => setPreviewing(true)}
              onPointerUp={() => setPreviewing(false)}
              onKeyDown={() => setPreviewing(true)}
              onKeyUp={() => setPreviewing(false)}
              onBlur={() => setPreviewing(false)} />
          </label>
          <div className="sculpt-actions">
            <button className="ghost" onClick={() => applyGape(gape > 1e-6 ? 0 : DEFAULT_GAPE)} disabled={!doc}
              title="Open the jaw to the preview angle, or shut it again. The jaw stays where you leave it, so the cut can be aimed on an open mouth.">
              {gape > 1e-6 ? 'Shut the jaw' : 'Open the jaw'}
            </button>
          </div>
          <small>
            This is the cut being previewed, not the animal: the body’s own clips open the jaw it was
            <em> built</em> with, and the cut you are aiming is nowhere in its rig. Everything the cut takes
            onto the mandible swings rigidly about the hinge — where it tears away from the head is where
            the cut runs. Hold the slider and the handles, the planes and this panel come off the screen;
            let go and they come back with the jaw still open, so the hinge can be dragged and watched.
          </small>
        </section>

        <div className="sculpt-actions">
          <button className="ghost" onClick={undo} disabled={!h?.canUndo} title="⌘/Ctrl+Z">Undo</button>
          <button className="ghost" onClick={redo} disabled={!h?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
          <button className="ghost" onClick={() => doc && step(levelCut(doc))} disabled={squared} title="Level in profile, straight across, flat">Square</button>
        </div>

        {doc && <>
          <h3>Hinge</h3>
          <p className="hint mouth-seat-note" data-seat={doc.seatSource}>{SEAT_NOTE[doc.seatSource]}</p>
          <section className="sculpt-station mouth-fields" aria-label="Hinge">
            <label>
              <span>Depth · back from the nose</span>
              <NumberField value={doc.depth} step={doc.bounds.length / 400} onChange={(v) => step(setDepth(doc, v))} />
              <small>{(doc.depth / doc.bounds.length * 100).toFixed(1)}% of the body</small>
            </label>
            <label>
              <span>Height · the mouth line</span>
              <NumberField value={doc.up} step={doc.head.height / 200} onChange={(v) => step(setUp(doc, v))} />
              <small>{fmt(doc.up - doc.head.upMid, true)} from the head's middle</small>
            </label>
            <label>
              <span>Seat · across the head</span>
              <NumberField value={doc.lateral} step={doc.head.width / 200} onChange={(v) => step(setLateral(doc, v))} />
              <small>{fmt(doc.lateral - doc.head.lateralMid, true)} from the midline</small>
            </label>
          </section>
          <h3>Angle</h3>
          <section className="sculpt-station mouth-fields" aria-label="Angle">
            {(['pitch', 'yaw', 'roll'] as const).map((which) => (
              <label key={which}>
                <span>{ANGLE_LABEL[which]}</span>
                <NumberField value={deg(doc[which])} step={1} places={1} range={[-MAX_DEG, MAX_DEG]} onChange={(v) => step(setAngle(doc, which, rad(v)))} />
                <small>{ANGLE_NOTE[which]}</small>
              </label>
            ))}
          </section>
          <h3>Orientation</h3>
          <p className="hint mouth-frame-note" data-frame={doc.frameSource}>{FRAME_NOTE[doc.frameSource]}</p>
          <div className="sculpt-actions">
            {(['x', 'z'] as const).map((a) => (
              <button key={a} className={`ghost ${doc.frame.axis === a ? 'primary' : ''}`} aria-pressed={doc.frame.axis === a}
                onClick={() => step(setAxis(doc, a))} title="Which way the body runs. Changing it re-seats the hinge on the new axis.">
                Body along {a.toUpperCase()}
              </button>
            ))}
            <button className="ghost" onClick={() => step(flipForward(doc))} title="Which end the head is at. Flipping keeps the plane where it is drawn and turns round which side of the hinge is the jaw.">
              Head at {doc.frame.forward === 1 ? 'high' : 'low'} {doc.frame.axis.toUpperCase()} →
            </button>
          </div>
        </>}

        <label className="mark-note">
          <span>What is this cut?</span>
          <textarea rows={2} value={note} placeholder="the hinge belongs a fifth of a head further back" onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="hint mouth-hash" data-hash={hash ?? ''} data-hash-source={measured ? 'measured' : sha256 ? 'manifest' : 'none'}>
          {measured === undefined ? 'Hashing the file on stage…'
            : measured ? <>File hash <code>{measured.slice(0, 12)}…</code>, measured here.</>
            : sha256 ? <>File hash <code>{sha256.slice(0, 12)}…</code> from the manifest; this page could not measure its own.</>
            : 'This page could not hash the file on stage and no manifest knows it, so the export names it by path alone. A consumer will ask to be told so.'}
        </p>
        <div className="sculpt-foot">
          <button className="ghost primary" onClick={exportMouth} disabled={!doc}>Export mouth</button>
          <button className="ghost" onClick={onExit}>Done · back to view</button>
          <p className="hint">Nothing is saved. The exported file is the hinge and the plane in the model's own frame, for the animal's builder — exact or as guidance.</p>
        </div>
      </aside>
    </>
  );
}

const MAX_DEG = Math.round(MAX_ANGLE * 180 / Math.PI);
const MAX_GAPE_DEG = Math.round(MAX_GAPE * 180 / Math.PI);
const fmt = (v: number, signed = false) => `${signed && v > 0 ? '+' : ''}${Number.isFinite(v) ? v.toFixed(3) : '—'}`;
const deg = (r: number) => Math.round(r * 180 / Math.PI * 10) / 10;
const rad = (d: number) => d * Math.PI / 180;

const ANGLE_LABEL = { pitch: 'Pitch · in profile', yaw: 'Yaw · in plan', roll: 'Roll · from the front' } as const;
const ANGLE_NOTE = {
  pitch: 'positive lifts the line towards the nose',
  yaw: 'positive turns the hinge so the +lateral side sits forward',
  roll: 'positive lifts the +lateral corner of the mouth',
} as const;

/** Where the hinge was first put, in the panel's words. The guess is the one worth flagging. */
const SEAT_NOTE: Record<MouthDoc['seatSource'], string> = {
  jaw: 'Seated on the rig’s own jaw bone, with the mouth line aimed at its anchor_mouth socket: this body says where its hinge is.',
  socket: 'Seated at the height of the anchor_mouth socket; the depth is a guess, because this body has no jaw bone.',
  guess: 'Guessed: a head’s worth back from the nose, a little below the middle of the head’s section. Nothing on this body says where its mouth is, so this is somewhere to start dragging from.',
  manual: 'Set by hand.',
};

/** Where the frame came from, in the panel's words. */
const FRAME_NOTE: Record<MouthDoc['frameSource'], string> = {
  mouth: 'Taken from the mouth socket: this body says where its own head is.',
  yaw: 'Taken from the generation’s authored turn, which says where its head was before it was faced forward.',
  bounds: 'Guessed from the bounding box — the only signal this body carries. If the cut sits across the flippers rather than the head, the box’s longest side runs across the animal: set the axis yourself.',
  manual: 'Set by hand.',
};
