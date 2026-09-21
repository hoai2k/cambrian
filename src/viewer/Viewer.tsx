import { ClipQueuedBadge, ModelStatusBadge } from '../shared/ModelStatusBadge';
import { CreaturePortrait } from '../app/CreaturePortrait';
import { useEffect, useRef, useState } from 'react';
import { COLLECTIONS, isPropCollection, paletteFor, SPECIMENS, specimenByKey, type CollectionId, type ViewerSpecimen } from './catalogue';
import { scheme, SLOT_LABEL, type Slot } from '../shared/palettes';
import { ASSET_BASE, createViewerScene, isReplaced, replacedName, type PlaybackState, type ViewerScene } from './scene';
import { SculptEditor } from './sculpt/SculptEditor';
import { MarkEditor } from './mark/MarkEditor';
import { getSculpt } from './sculpt/store';
import { isIdentity, warp } from './sculpt/profile';
import { StretchEditor } from './stretch/StretchEditor';
import { getStretch } from './stretch/store';
import { isIdentity as stretchIsIdentity, warp as stretchWarp } from './stretch/stretch';
import { MouthEditor } from './mouth/MouthEditor';
import type { AppliesTo } from './mouth/mouth';
import type { AppliesTo as BendAppliesTo } from './bend/bend';
import { BendEditor } from './bend/BendEditor';
import { clampTime, intentMissing, tracksIntent, type ClipIntent } from './playback/selection';
import { getIntent, setIntent } from './playback/store';

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

/**
 * What the page is doing with the specimen: looking at it, reshaping it, lengthening a run of it,
 * turning a run of it, marking it up, or aiming its mouth.
 */
type Mode = 'view' | 'sculpt' | 'mark' | 'stretch' | 'mouth' | 'bend';

/**
 * The page remembers which specimen it is showing in the URL (`?specimen=<key>`, and `&mode=sculpt`,
 * `&mode=mark`, `&mode=stretch`, `&mode=mouth` or `&mode=bend` while editing), so a reload — or a
 * link — comes back to the same creature. Nothing else is kept there: the view, the clip, any
 * sculpt in progress, any marked region, any mouth cut and any bend start over.
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
  const asking = asked === 'mark' || asked === 'stretch' || asked === 'mouth' || asked === 'bend' || (asked === 'sculpt' && collection !== 'triassic');
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
  /**
   * Raised while an editor is holding a preview — the mouth's gape is the one — so the viewer can
   * take its own chrome off the screen and leave the animal alone with what is being looked at.
   * The chrome only fades: hiding it outright would change the grid and reframe the camera under
   * a reviewer mid-drag, which is the one thing a preview must not do.
   */
  const [previewing, setPreviewing] = useState(false);
  /**
   * What can be on stage, as one list rather than two crossed axes.
   *
   * There used to be a *Model detail* control (full / reduced) and a *Body* control (authored /
   * twin / generated), and for the Triassic they overlapped: a paired body's LOD1 **is** its
   * procedural twin — the same file, byte for byte, on all four delivered bodies — so "Reduced
   * model" and "Procedural twin" were two names for one thing under two dropdowns. The other eras
   * have no twin at all, so their Body control never appeared and only the detail axis was real.
   *
   * So there is one control, and it lists what this specimen actually has. An animal whose own
   * body is not built has no full model to offer — `model` resolves for it to the body it borrows
   * in play — so the raw generation stands in at the head of the list, which is what the roster's
   * preview badge already says about it.
   */
  type Stage = { id: string; label: string; model: string; kind: 'full' | 'reduced' | 'twin' | 'generated' | 'borrowed' | 'origpose' | 'backup' };
  const stages = (c: ViewerSpecimen): Stage[] => {
    const own = !c.generated || !!c.inReview;
    const out: Stage[] = [];
    if (own) out.push({ id: 'full', label: c.inReview ? 'Full model (in review)' : 'Full model', model: c.model, kind: 'full' });
    // A paired body's twin *is* its reduced model, so it is named once, as the thing it is.
    if (c.puppet) out.push({ id: 'twin', label: 'Procedural twin · reduced', model: c.puppet, kind: 'twin' });
    else if (c.lod && own) out.push({ id: 'reduced', label: 'Reduced model', model: c.lod, kind: 'reduced' });
    if (c.generated) out.push({ id: 'generated', label: 'Generated mesh (no rig)', model: c.generated, kind: 'generated' });
    // Where a builder moved the mesh before binding, the shipped body rests in a shape the
    // generation never held. Both are offered: the full model IS the base pose every clip is
    // authored from, and this is what Tripo made.
    if (c.backup) out.push({ id: 'backup', label: 'Backup Model', model: c.backup, kind: 'backup' });
    if (c.origPose) out.push({ id: 'origpose', label: 'Original pose (no rig)', model: c.origPose, kind: 'origpose' });
    // An off-roster subject is in no sea, so there is no body it borrows to offer.
    if (!own && !c.offRoster) out.push({ id: 'borrowed', label: 'Borrowed body (in play)', model: c.model, kind: 'borrowed' });
    return out;
  };
  /**
   * Which of them is on stage. Swapping happens in place — the stage is not cleared, the camera is
   * preserved and the clip keeps playing — because the point of a pair is seeing one become the
   * other, and a difference you have to hold in your head across two list entries is not seen.
   *
   * A specimen opens on the head of its own list: its full model where it has one, the raw
   * generation where it does not. The editing modes are the exception, and for the same reason in
   * both: the body an edit *applies to* is not the body the viewer would otherwise show.
   *
   * A stretch is an edit to the raw generation, so it opens on that. **A bend is aimed on a body
   * no builder has moved**, and on an animal whose builder carried a correction into the bind
   * there is nothing left to aim on the shipped one — Askeptosaurus' rest already holds T3D-26's
   * whole 67.7 degree head correction, so bend mode opening on `full` showed a reviewer a head
   * that had already been straightened and invited them to straighten it again. It opens on the
   * original pose where the animal publishes one, and falls back to the raw generation.
   */
  const opening = (key: string, mode?: Mode): string => {
    const list = stages(specimenByKey.get(key)!);
    if (mode === 'stretch' && list.some(o => o.kind === 'generated')) return 'generated';
    if (mode === 'bend') {
      const aimable = list.find(o => o.kind === 'origpose') ?? list.find(o => o.kind === 'generated');
      if (aimable) return aimable.id;
    }
    return list[0].id;
  };
  const [stageId, setStageId] = useState<string>(() => opening(initial.current.key, initial.current.mode));
  const requestedId = useRef('');
  const def = specimenByKey.get(id)!;
  const choices = stages(def);
  const stage = choices.find(o => o.id === stageId) ?? choices[0];
  const showPuppet = stage.kind === 'twin';
  // The raw generated mesh, for an animal whose own body has not shipped: it is still borrowing
  // somebody else's in play, and this is the only way to see the surface it will be built from.
  const showGenerated = stage.kind === 'generated';
  const modelPath = stage.model;
  const roster = SPECIMENS.filter(c => c.collection === collection);
  // Both eras are on this page, so a specimen's palette comes from its own pack, not ACTIVE_ERA.
  const defaultScheme = (key: string) => {
    const c = specimenByKey.get(key)!;
    const p = paletteFor(c.collection);
    return p.defaults[c.id] ?? p.schemes[0].id;
  };
  const [clips, setClips] = useState<string[]>([]);
  /**
   * Whether to draw the authored mouth geometry — the palate and floor that close each jaw, the
   * hinge tissue, a cephalopod's beak. **Off by default, and off in the game entirely**, because
   * its first form read as gum filling the mouth; on shows what is currently authored, off shows
   * the mouth the generation actually arrived with. It survives a change of specimen on purpose:
   * comparing mouths means comparing across animals.
   */
  const [oralGeometry, setOralGeometry] = useState(false);
  const [hasOral, setHasOral] = useState(false);
  const [active, setActive] = useState('');
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playback, setPlayback] = useState<PlaybackState>({ time: 0, duration: 0, paused: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedId, setLoadedId] = useState('');
  const [picks, setPicks] = useState<Picks>(readPicks);
  const [slots, setSlots] = useState<readonly Slot[]>([]);
  /**
   * The reviewer's standing selection — which clip, where in it, paused or not — kept in the
   * session store (`./playback/store`) so it crosses from one animal to the next, and mirrored
   * here only so the pane can draw what is being asked for. The store is the truth: every writer
   * below goes through `remember`, which sets both, and the load effect reads `getIntent()` rather
   * than this copy so it can never be a render behind.
   *
   * What is *playing* is `active`, which the scene reports. The two are deliberately different
   * things: a body without the chosen clip plays its `Idle` and the intent stands, so the next
   * animal along that does have it gets it back.
   */
  const [intent, setIntentMirror] = useState<ClipIntent | undefined>(getIntent);
  const remember = (next: ClipIntent) => { setIntent(next); setIntentMirror(next); };
  /** Picking a clip, or the base pose, *is* the selection: it names what was meant from here on. */
  const chooseClip = (name: string) => {
    remember({ clip: name, time: 0, paused: playback.paused });
    sceneRef.current?.play(name, loop);
  };
  const chooseBasePose = () => {
    remember({ clip: null, time: 0, paused: playback.paused });
    sceneRef.current?.setRestPose(true);
  };
  /**
   * Pausing changes only the pause. It deliberately does not re-aim the selection at whatever is
   * on screen: a reviewer pausing a body that fell back to its `Idle` has not given up on the clip
   * they asked for, and the next animal that has it should still play it — paused.
   */
  const choosePaused = (next: boolean) => {
    sceneRef.current?.setPaused(next);
    const standing = getIntent();
    remember(standing ? { ...standing, paused: next } : { clip: active || null, time: playback.time, paused: next });
  };
  /** Scrubbing names the clip under the scrubber, because a position is a position *in* one clip. */
  const scrubTo = (seconds: number) => {
    // Clamped here as well as in the scene: an arrow key at either end asks for a time outside the
    // clip, and what is written down has to be the position the body was actually put in.
    const t = clampTime(seconds, playback.duration);
    sceneRef.current?.seek(t);
    remember({ clip: active || null, time: t, paused: true });
  };
  useEffect(() => { writeUrlState(id, mode); }, [id, mode]);
  // Re-pick the opening model when the specimen changes, and only then: a reviewer who has chosen
  // to look at the twin keeps looking at it. What the list opens on is `opening()` above — for an
  // animal still borrowing a body in play that is its own raw generation, because opening on the
  // Devonian fish it borrows made the page look like it had never been told the generation existed.
  const opened = useRef(id);
  useEffect(() => {
    if (opened.current === id) return;   // not a specimen change: leave a reviewer's own choice alone
    opened.current = id;
    setStageId(opening(id));
  }, [id]);
  // Sculpting needs a creature on stage; a prop or a load in progress has nothing to sculpt.
  // Not on the twin: a sculpt is the hand-off that goes into a builder's profile rows for the body
  // that ships, and one exported off the comparison body would name the right creature and describe
  // the wrong mesh.
  /**
   * Ready means **the body on stage is the body this UI is describing**, which is stricter than
   * "the last load finished" and has to be. The Bend button changes the mode and the model in one
   * commit (`opening()`), a child's effects run before its parent's, and the load effect below is
   * the parent's — so an editor mounted in that commit measures whatever the scene is still
   * holding. On Askeptosaurus that is the shipped body, and because the bend document is cached
   * under the *new* model's key, the panel then said `origpose` over numbers taken from the built
   * body and never re-measured. Asking the scene what it is drawing is answered synchronously and
   * cannot be a commit behind.
   */
  const ready = !loading && !error && loadedId === id && sceneRef.current?.loadedModel() === modelPath;
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
  // Marking works on whatever body is on stage, the generated mesh above all: that raw surface is
  // the one carrying fins nobody asked for, and it is the reason the mode exists. A prop is the
  // only thing it refuses — there is nothing on a stromatolite for a builder to cut away.
  const canMark = !isPropCollection(collection) && ready;
  // The mouth editor takes whatever body is on stage as well: a cut is aimed on one file, and the
  // file it is most wanted on is the raw generation, before any builder has measured a mouth on
  // it. What the export says the file *is* follows the stage rather than the animal.
  const canMouth = canMark;
  const appliesTo: AppliesTo = stage.kind === 'generated' ? 'preview' : stage.kind === 'origpose' ? 'generation' : stage.kind === 'twin' ? 'twin' : 'built';
  /**
   * The same answer for the bend editor, which tells the original pose apart from the generation.
   *
   * The mouth editor does not need to: a cut aimed on either is aimed on geometry no builder has
   * moved. A bend does, and by the whole size of the thing it is about — Askeptosaurus' shipped
   * rest already carries the 67.7° head correction its builder put into the bind, so a bend
   * measured on `built` and one measured on `origpose` are opposite claims about the same animal.
   */
  const bendAppliesTo: BendAppliesTo = stage.kind === 'origpose' ? 'origpose' : appliesTo;
  /** The untouched generation this specimen publishes, for the bend panel to point a reviewer at. */
  const origPoseStage = choices.find(o => o.kind === 'origpose');
  const origPoseNote = origPoseStage && def.origPoseChanged?.length
    ? { label: origPoseStage.label, changed: def.origPoseChanged }
    : undefined;
  /**
   * Whether `model` is this animal's own body or one it borrows in play.
   *
   * An animal with a generated mesh and nothing built yet resolves `model` to a Devonian fish, and
   * a sculpt of that would name the right creature and describe somebody else's body — so it is
   * not offered one. An animal whose body is built and waiting on a human has both, and there the
   * sculpt is exactly right.
   */
  const ownBody = !def.generated || !!def.inReview;
  const canStretch = !isPropCollection(collection) && !showPuppet && ready && (showGenerated || ownBody);
  /**
   * Bend sits exactly where stretch does, because it asks the same kind of question about the same
   * run of body: stretch changes a span's *length* and bend changes its *direction*, and neither
   * can be baked into a rigged body. So it is offered on a raw generation (where the warp on stage
   * is the edit) and on a built body (where the rig is held at rest and the export is a measurement
   * for the builder), and refused on the comparison twin and on props for stretch's own reasons —
   * a measurement exported off the twin would name the right creature and describe the wrong mesh.
   */
  const canBend = canStretch;
  useEffect(() => {
    if (mode === 'sculpt' && (!sculptable || showPuppet || showGenerated)) setMode('view');
    // Stretch is the one mode a *built* body still answers: there it is a measurement rather than
    // an edit, so all it refuses is a prop and the comparison twin.
    if ((mode === 'stretch' || mode === 'bend') && (isPropCollection(collection) || showPuppet)) setMode('view');
    if ((mode === 'mark' || mode === 'mouth') && isPropCollection(collection)) setMode('view');
  }, [mode, collection, sculptable, showPuppet, showGenerated]);

  // The show effect must not re-run when a pick changes, so it reads the picks through a ref.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  // Same for the loop switch: toggling it must not reload the body.
  const loopRef = useRef(loop);
  loopRef.current = loop;
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
    setLoading(true); setLoadedId(''); setError(''); setClips([]); setSlots([]); setHasOral(false);
    // The specimen on stage leaves before the next one is fetched: watching the last creature
    // repaint into the new one's colours, then pop out of frame, read as a glitch.
    if (requestedId.current !== id) sceneRef.current?.clear();
    requestedId.current = id;
    // Set the scheme before the model is built so it never appears in the wrong palette first.
    sceneRef.current?.setScheme(picksRef.current[id] ?? defaultScheme(id));
    // The yaw is the generated mesh's alone: the shipped body and the twin are already built to
    // the engine's convention and must not be turned.
    // The standing selection is read from the store rather than from the mirror above, and the
    // loop switch through a ref, so that neither puts this effect — a model load — back on the
    // dependency list. What this body can give the selection is decided in `scene.show`.
    sceneRef.current?.show({ ...def, model: modelPath, previewYaw: showGenerated ? def.previewYaw : 0 },
      { preserveView: true, intent: getIntent(), loop: loopRef.current })
      .then((names) => {
        if (cancelled) return;
        // A sculpt made this session follows the creature back onto the stage, full or reduced.
        const sculpt = getSculpt(id);
        if (sculpt && !isIdentity(sculpt)) sceneRef.current?.applySculpt(warp(sculpt), true);
        // Only a raw generation keeps its stretch on the stage; a rigged one would flail once a clip played.
        const stretch = showGenerated ? getStretch(id) : undefined;
        if (stretch && stretch.model === modelPath && !stretchIsIdentity(stretch)) sceneRef.current?.applySculpt(stretchWarp(stretch), true);
        setClips(names); setSlots(sceneRef.current?.activeSlots() ?? []); setLoading(false); setLoadedId(id);
        setHasOral(sceneRef.current?.hasOralGeometry() ?? false);
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id, modelPath, showGenerated, def.previewYaw]);

  useEffect(() => { sceneRef.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { sceneRef.current?.setScheme(schemeId); }, [schemeId]);
  useEffect(() => { sceneRef.current?.setOralGeometry(oralGeometry); }, [oralGeometry, loadedId]);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(picks)); } catch { /* private mode: picks stay in memory */ }
  }, [picks]);
  /**
   * A running clip carries the reviewer's position along with it, so the position that crosses to
   * the next animal is where they had got to — but **only while what is playing is what was asked
   * for**. On a body that fell back to its `Idle`, that clock belongs to a clip nobody chose, and
   * writing it back would quietly replace the intended position with somebody else's idle frame.
   *
   * Only the store is written, not the mirror: this runs on every playback report and none of it
   * changes what the pane draws.
   */
  useEffect(() => {
    if (!ready || playback.paused) return;
    const standing = getIntent();
    if (!tracksIntent(standing, active) || standing!.time === playback.time) return;
    setIntent({ ...standing!, time: playback.time });
  }, [playback, active, ready]);

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
    <div className={`viewer ${mode === 'sculpt' ? 'sculpting' : mode === 'stretch' ? 'stretching' : mode === 'mark' ? 'marking' : mode === 'mouth' ? 'mouthing' : mode === 'bend' ? 'bending' : ''} ${previewing ? 'previewing' : ''}`}
      data-mode={mode} data-previewing={previewing ? 'yes' : 'no'}>
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
      {/* Mouth mode is the same shape as mark mode — handles on the orbit view, a panel where the
          info card was — and is keyed by the body on stage for the same reason: the cut is aimed
          on one file. */}
      {mode === 'mouth' && canMouth && sceneRef.current && canvasRef.current && (
        <MouthEditor key={`${id}|${modelPath}|mouth`} scene={sceneRef.current} specimen={def} model={modelPath}
          sha256={showGenerated ? def.generatedSha256 : undefined} appliesTo={appliesTo}
          canvas={canvasRef.current} onPreview={setPreviewing} onExit={() => setMode('view')} />
      )}
      {/* Bend mode is the same shape again — handles on the orbit view, a panel where the info card
          was — and is keyed by the body on stage because a span is placed on one file. */}
      {mode === 'bend' && canBend && sceneRef.current && canvasRef.current && (
        <BendEditor key={`${id}|${modelPath}|bend`} scene={sceneRef.current} specimen={def} model={modelPath}
          sha256={showGenerated ? def.generatedSha256 : undefined} appliesTo={bendAppliesTo}
          stageLabel={stage.label} origPose={origPoseNote}
          /* The mode *opens* on the unbent body and must not be a cage: the info card carries the
             Model control and an editing mode replaces it, so bend mode carries its own. The twin
             is left out because `canBend` refuses it anyway (the effect above drops straight back
             to the view), and offering a choice that quietly ends the mode is worse than not
             offering it. Everything the panel says about which body it is describing follows the
             swap for free: the editor is keyed by the model, and `appliesTo`, `stageLabel` and the
             corrected-body warning are all derived from the stage. */
          stages={choices.filter(o => o.kind !== 'twin').map(o => ({ id: o.id, label: o.label }))}
          stageId={stage.id} onStage={setStageId}
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
        {collection !== 'cambrian' && <p className="specimen-downloads">{!def.offRoster && <a href={`${ASSET_BASE}${def.model}`} download>Full model</a>}{def.lod && <a href={`${ASSET_BASE}${def.lod}`} download>Reduced model</a>}{def.puppet && <a href={`${ASSET_BASE}${def.puppet}`} download>Procedural twin</a>}{def.generated && <a href={`${ASSET_BASE}${def.generated}`} download>Generated mesh</a>}{def.backup && <a href={`${ASSET_BASE}${def.backup}`} download>Backup Model</a>}</p>}
        {choices.length > 1 && <label className="scheme-pick">
          <span>Model</span>
          <select aria-label="Which model" value={stage.id} disabled={loading} onChange={e => setStageId(e.target.value)}>
            {choices.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>}
        {choices.length > 1 && <p className="hint">Swapping holds the view and the animation time, so a difference between two of these reads as movement. Missing clips return to rest.</p>}
        {hasOral && <><label className="toggle">
          <input type="checkbox" checked={oralGeometry} onChange={(e) => setOralGeometry(e.target.checked)} />
          <span>Mouth geometry</span>
        </label>
        <p className="hint">
          The palate and floor that close each jaw, the tissue at the hinge, and a beak where there
          is one, are <em>authored</em> rather than generated. <strong>The game does not draw any of
          it</strong> and this starts off, because the first form of it read as gum filling the
          mouth; turn it on to see what is currently authored, and off for the mouth the generation
          arrived with. The setting follows you from one animal to the next.
        </p></>}
        {def.inReview && <p className="hint">
          <strong>Awaiting review:</strong> this animal's own body, twin and clips are built, but it
          is not in <code>shipped.json</code> yet — so the game still draws the body it borrows and
          the animal keeps its warning. Everything on this page is the real thing; what is being
          decided is whether it ships. The raw mesh it was built from is still in the <em>Model</em> list.
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
        {def.origPose && <p className="hint">
          <strong>Two poses.</strong> This generation arrived too strongly posed to rig, so its
          builder moved the mesh before binding: {def.origPoseChanged?.join('; ')}. <em>Full
          model</em> is the <strong>base pose</strong> — the rig at rest, and what every clip is
          authored from. <em>Original pose</em> is the untouched generation, with no rig, so it sits
          still. Swapping holds the view, so the difference between them reads as movement.
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
          {!isPropCollection(collection) && <button className="ghost" onClick={() => { if (def.generated && !def.inReview) setStageId('generated'); setMode('stretch'); }} disabled={!canStretch}
            title={def.generated && !def.inReview
              ? 'Lengthen a run of this raw generation — a neck, a tail — between two cuts, and export the change to be baked into the GLB'
              : 'Lengthen a run of this body between two cuts and measure it. A built body is held at rest and cannot be baked: the numbers go to its builder.'}>
            Stretch{(() => { const d = getStretch(id); return d && !stretchIsIdentity(d) ? ' (edited)' : ''; })()}
          </button>}
          {!isPropCollection(collection) && <button className="ghost" onClick={() => { setStageId(opening(id, 'bend')); setMode('bend'); }} disabled={!canBend}
            title="Turn a run of this body between two cuts — a neck off its trunk — and read the angle before and after. On a built body it is a measurement for its builder.">
            Bend
          </button>}
          {!isPropCollection(collection) && <button className="ghost" onClick={() => setMode('mark')} disabled={!canMark} title="Paint the geometry that should not be there and export it as a region file for tools/triassic/cut-region.py">
            Mark region
          </button>}
          {!isPropCollection(collection) && <button className="ghost" onClick={() => setMode('mouth')} disabled={!canMouth} title="Aim the mouth cut on this body — how far back the hinge goes, where the line sits, its angle — and export it for the builder">
            Mouth
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

      {/* `data-clip-intent` is what was asked for and `data-clip-playing` what this body could
          give it — the two are the same except while a body without the chosen clip is standing
          in, and keeping them both on the pane is what lets a browser drive prove the difference.
          The base pose says so by name, since it is a selection with no clip in it. */}
      <section className="clips" aria-label="Animations" data-loaded-specimen={loadedId} data-loaded-model={loadedId ? modelPath : ''}
        data-clip-intent={intent ? intent.clip ?? 'base' : ''}
        data-clip-playing={!loadedId ? '' : !clips.length ? 'none' : active || 'base'}>
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
          <button className="ghost" onClick={() => choosePaused(!playback.paused)}>
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
                if (target != null) { e.preventDefault(); scrubTo(target); }
              }}
              onChange={e => scrubTo(Number(e.target.value))} />
          </label>
          <output>{playback.time.toFixed(2)} / {playback.duration.toFixed(2)} s</output>
        </div>}
        {!loading && !clips.length && <p className="hint">Static specimen</p>}
        {/* The intent is invisible while it is not being met, and an invisible intent reads as the
            pane having forgotten what was chosen. So it says so, and says it is still standing. */}
        {!loading && clips.length > 0 && intentMissing(intent, clips) && <p className="hint clip-fallback">
          <strong>{intent!.clip}</strong> is not one of this animal's clips, so {active || 'the base pose'} is standing
          in. The choice holds: the next animal that has {intent!.clip} plays it, where you left off.
        </p>}
        <div className="clip-grid">
          {/* The rig at rest is the neutral pose: jaw shut, body straight, limbs where the builder
              bound them, which is the shape every clip here is authored from. It is a pose rather
              than a clip, so it is offered beside them as one — the way to see what the animations
              start from, and to check that a body whose generation arrived bent or gaping was
              actually unbent and shut before binding rather than posed that way by its Idle. */}
          {!loading && clips.length > 0 && (
            <button className={`clip clip-base ${active === '' ? 'active' : ''}`} aria-pressed={active === ''}
              title="The rig at rest: the neutral pose every clip is authored from"
              onClick={chooseBasePose}>
              Base pose
            </button>
          )}
          {clips.filter((n) => !isReplaced(n)).map((name) => {
            // A clip queued for rework is flagged on its own button rather than on the creature:
            // the body is finished, this motion is not, and that is what a viewer wants to know.
            const queued = def.clipNotes?.[name];
            return (
              <button key={name} className={`clip ${name === active ? 'active' : ''}${queued ? ' clip-queued' : ''}`}
                aria-pressed={name === active} onClick={() => chooseClip(name)}>
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
                title={`The clip ${replacedName(name)} superseded; kept for comparison`} onClick={() => chooseClip(name)}>
                {replacedName(name)}
              </button>
            ))}
          </div>
        </>}
      </section>

    </div>
  );
}
