/**
 * Skin lag: does the skin round a joint travel with the joint, and does the jaw cut stay closed?
 *
 *   node tools/triassic/lag.mjs <glb> [--verbose] [--json <file>]
 *   node tools/triassic/lag.mjs --all [--json <file>]
 *
 * This is the diagnostic that found two jaw-cut faults `skin-tears.mjs` and `idle-bones.mjs` could
 * not see (Aphaneramma's and Mystriosuchus' right forelimbs cut into the mandible shell, rigid on
 * `jaw` at weight 1: the foot's skin travelled 0.45 of the distance its own joint did where every
 * other foot was 1.04 to 1.11). Both of those tools measure the edges a mesh has; neither can see
 * a joint whose skin is *owned by somebody else*, and neither can see the seam between two shells,
 * because no edge crosses it. On every jawed Triassic body the mandible is exactly that: a separate
 * shell cut off the head at the hinge plane, so the junction the owner sees tear -- the jaw's rear
 * rim swinging away from the throat and cheek it was cut from -- is invisible to an edge test.
 *
 * Per joint, over 17 phases of every clip, with the skin inside a ball round the joint's head:
 *
 * **lag** -- the mean distance that skin travelled over the distance the joint's head travelled,
 * on the clip that carries the head furthest. 1.0 is skin that goes where its joint goes; 0.45 was
 * the foot cut into a jaw shell. A hinge that turns in place (a jaw in `Bite`) carries its head
 * nowhere and is measured on the clip that moves the whole head instead.
 *
 * **follows** -- over the vertices in the ball the joint itself owns (its dominant bone), how far
 * each actually travelled *along the direction the joint would have carried it rigidly*, over how
 * far the joint would have carried it. This is the hinge's own figure: a mandible whose rear half
 * is weighted to the skull reads well under 1 in `Bite`.
 *
 * **share** -- what fraction of the skin weight in the ball is the joint's own, and which other
 * bone holds the most of the rest. The Aphaneramma tell (64.5 % of the neighbourhood round
 * `fore_foot_R` read as `jaw`); descriptive rather than a threshold, since a hinge is always
 * surrounded by the bone it hinges on.
 *
 * Per body, the **seam**: every pair of vertices on different skin meshes that coincide at rest is
 * one point on the animal the cut drew twice, the mandible a party to each. The pairs at the *cut*
 * -- at or behind the hinge's own station, or the rim's own rearmost point where a kit seats the
 * hinge behind its cut -- must stay together in every pose, and the worst separation there over every clip, in body
 * lengths, is the gap the junction opens. The pairs on the *lip* are the mouth and part by design;
 * their opening is the gape and is reported for scale only. A rigid mandible against a
 * skull-weighted throat opens the cut by the rim's distance from the hinge times the gape angle,
 * and nothing else in the toolset reports it. The corner of the mouth is one vertex on both, so a
 * point or two parting there is the lip; a cut that opens opens along its length.
 *
 * The oral lining, tooth rows, eyes and hinge tissue are left out of all of it (matched by the
 * pattern `src/shared/oral-geometry.ts` uses, plus eyes and teeth): they are rigid shells hidden
 * in play, and a floor that rides the jaw next to a palate that rides the skull is not a lag.
 *
 * Exits non-zero when a jaw's `follows` is outside [FOLLOW_LOW, FOLLOW_HIGH], a limb joint lags
 * under LAG_LOW, or the cut opens past CUT_FAIL of a body length along more than CUT_OPEN_SHARE of
 * its rim.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const VERBOSE = args.includes('--verbose');
const jsonAt = args.indexOf('--json');
const JSON_OUT = jsonAt >= 0 ? args[jsonAt + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && !(jsonAt >= 0 && i === jsonAt + 1));
if (!ALL && !files.length) { console.error('usage: node tools/triassic/lag.mjs <glb>|--all [--verbose] [--json <file>]'); process.exit(2); }

const PHASES = 17;
/** Skin round a joint that travels less than this share of the joint's own travel is somebody else's. */
const LAG_LOW = 0.6;
/** A jaw whose own skin follows it by less than this is held by the skull ... */
const FOLLOW_LOW = 0.6;
/** ... and by more than this is being flung by something faster. */
const FOLLOW_HIGH = 1.6;
/** A cut-plane rim point counts as open when its two copies part by more than this of a body. */
const CUT_OPEN = 0.002;
/** The worst cut-plane opening a body may ship with, in body lengths ... */
const CUT_FAIL = 0.005;
/** ... when more than this share of the cut's rim points open past CUT_OPEN (see the flag below). */
const CUT_OPEN_SHARE = 0.08;
/** Not skin: the hidden oral shells, the teeth and the eyes. */
const NOT_SKIN = /lining|mouth[ _]interior|hinge[ _]tissue|beak|palate|tooth|teeth|fang|eye/i;
const ROOT = /^(root|armature|skeleton)$/i;
/** The joints whose lag fails the run: limbs, paddles, fins and the jaw. */
const LIMB = /fore|hind|paddle|foot|hand|pec|pelvic|fin_|flipper|^jaw$/i;

const DIR = 'public/assets/triassic/creatures';
const targets = ALL
  ? JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures.map((id) => `${DIR}/${id}.glb`)
  : files;

const report = [];
let failed = 0;
for (const file of targets) {
  const buf = fs.readFileSync(file);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const skinned = [];
  gltf.scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const names = [o.name, ...[o.material].flat().map((m) => m?.name ?? '')].join(' ');
    if (!NOT_SKIN.test(names)) skinned.push(o);
  });
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const bones = skinned[0].skeleton.bones;

  const pose = (clip, t) => {
    mixer.stopAllAction();
    if (clip) { mixer.clipAction(clip).play(); mixer.setTime(0); mixer.setTime(t); } else mixer.setTime(0);
    gltf.scene.updateMatrixWorld(true);
    for (const m of skinned) m.skeleton.update();
  };

  // --- the skin at rest: world positions, and per vertex its dominant bone and its weights
  const v3 = new THREE.Vector3();
  const rest = [], local = [], owner = [], weightOf = [], meshOf = [];
  pose(null, 0);
  skinned.forEach((m, mi) => {
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    m.userData.base = owner.length;
    for (let i = 0; i < pos.count; i++) {
      m.getVertexPosition(i, v3).applyMatrix4(m.matrixWorld);
      rest.push(v3.x, v3.y, v3.z);
      local.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      let bi = 0, bw = -1; const w = new Map();
      for (let k = 0; k < 4; k++) {
        const ww = sw.getComponent(i, k); if (ww <= 0) continue;
        const b = si.getComponent(i, k);
        w.set(b, (w.get(b) ?? 0) + ww);
        if (ww > bw) { bw = ww; bi = b; }
      }
      owner.push(bi); weightOf.push(w); meshOf.push(mi);
    }
  });
  const N = owner.length;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < rest.length; i += 3) for (let k = 0; k < 3; k++) {
    if (rest[i + k] < mn[k]) mn[k] = rest[i + k];
    if (rest[i + k] > mx[k]) mx[k] = rest[i + k];
  }
  const L = Math.max(...mx.map((v, i) => v - mn[i]));
  const at = (i) => v3.set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);

  // --- joints: head position at rest, a ball radius from the neighbouring joints along the chain
  const head = bones.map((b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
  const radius = bones.map((b, k) => {
    const near = [];
    const pk = bones.indexOf(b.parent);
    if (pk >= 0) near.push(head[k].distanceTo(head[pk]));
    for (const c of b.children) { const ck = bones.indexOf(c); if (ck >= 0) near.push(head[k].distanceTo(head[ck])); }
    const proxy = near.length ? near.reduce((a, c) => a + c, 0) / near.length : L * 0.1;
    // A joint sits inside the flesh, so the ball has to reach the skin: never less than twice the
    // distance to the nearest skin vertex, or a hinge deep in a broad head owns an empty ball.
    let nearest = Infinity;
    for (let i = 0; i < N; i++) nearest = Math.min(nearest, head[k].distanceTo(at(i)));
    return Math.min(Math.max(proxy * 0.6, nearest * 2, L * 0.02), L * 0.12);
  });
  const ball = bones.map(() => []);
  for (let i = 0; i < N; i++) for (let k = 0; k < bones.length; k++) if (at(i).distanceTo(head[k]) < radius[k]) ball[k].push(i);
  const share = bones.map((b, k) => {
    const acc = new Map(); let total = 0;
    for (const i of ball[k]) for (const [bi, w] of weightOf[i]) { acc.set(bi, (acc.get(bi) ?? 0) + w); total += w; }
    const other = [...acc.entries()].filter(([bi]) => bi !== k).sort((a, c) => c[1] - a[1])[0];
    return { own: total ? (acc.get(k) ?? 0) / total : 0, other: other ? bones[other[0]].name : '-', otherShare: other && total ? other[1] / total : 0 };
  });

  // --- the seam: rest-coincident vertex pairs across different skin meshes, split into the cut
  // plane (the transverse rim loop at the hinge) and the lip (everything forward of it)
  const cell = L * 1e-4;
  const grid = new Map();
  const key = (x, y, z) => `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)}`;
  for (let i = 0; i < N; i++) {
    const k = key(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const jawK = bones.findIndex((b) => b.name === 'jaw'), skullK = bones.findIndex((b) => b.name === 'skull');
  // Which mesh is the mandible: named for it, else the smaller party to the pairs. Only pairs the
  // mandible is party to are the jaw's seam: Placodus' gastral armour is a separate shell too, and
  // its rim against the belly (1.3 % in Crawl) is a different question from the jaw's.
  const jawMesh = skinned.findIndex((m) => /lower[ _]jaw|_jaw$/i.test(m.name));
  const pairs = [];
  for (const list of grid.values()) {
    if (list.length < 2) continue;
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const i = list[a], j = list[b];
      if (meshOf[i] === meshOf[j]) continue;
      if (jawMesh >= 0 && meshOf[i] !== jawMesh && meshOf[j] !== jawMesh) continue;
      if (Math.hypot(rest[i * 3] - rest[j * 3], rest[i * 3 + 1] - rest[j * 3 + 1], rest[i * 3 + 2] - rest[j * 3 + 2]) < cell) pairs.push([i, j]);
    }
  }
  // The body's long axis, head end positive: from the jaw's parent (the skull) back to the rig's
  // trunk is not reliable on every rig, so take it from the skin's own extent through the hinge.
  const axis = new THREE.Vector3(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  { const c = [0, 1, 2].map((k) => Math.abs(axis.getComponent(k))); const kk = c.indexOf(Math.max(...c)); axis.set(0, 0, 0).setComponent(kk, 1); }
  if (jawK >= 0 && skullK >= 0) {
    const centre = new THREE.Vector3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
    if (head[jawK].clone().sub(centre).dot(axis) < 0) axis.negate();
  }
  const along = (i) => at(i).dot(axis);
  // Boundary edges per mesh (one face), so a shared vertex can say which way the rim runs at it.
  const boundaryDirs = skinned.map((m) => {
    const idx = m.geometry.index, count = new Map(), dirs = new Map();
    const k = (a, b) => (a < b ? a * 1e7 + b : b * 1e7 + a);
    for (let t = 0; t < idx.count; t += 3) {
      const tri = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      for (let e = 0; e < 3; e++) { const key = k(tri[e], tri[(e + 1) % 3]); count.set(key, (count.get(key) ?? 0) + 1); }
    }
    for (let t = 0; t < idx.count; t += 3) {
      const tri = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      for (let e = 0; e < 3; e++) {
        const a = tri[e], b = tri[(e + 1) % 3];
        if (count.get(k(a, b)) !== 1) continue;
        const d = new THREE.Vector3(rest[(m.userData.base + b) * 3] - rest[(m.userData.base + a) * 3], rest[(m.userData.base + b) * 3 + 1] - rest[(m.userData.base + a) * 3 + 1], rest[(m.userData.base + b) * 3 + 2] - rest[(m.userData.base + a) * 3 + 2]).normalize();
        for (const vv of [a, b]) { if (!dirs.has(vv)) dirs.set(vv, []); dirs.get(vv).push(Math.abs(d.dot(axis))); }
      }
    }
    return dirs;
  });
  let cut = [], lip = pairs;
  if (jawK >= 0 && pairs.length) {
    // The cut is the rim that runs *round* the head at the hinge; the lip runs *along* it. So a
    // shared vertex whose boundary edges on the mandible run transverse to the body, in the rear
    // two fifths of the mandible's shared extent, is the cut; everything else -- the mouth line,
    // and a front cut where a builder took the mandible off an overhanging snout -- parts by
    // design. A band of stations behind the hinge was tried first and took the first 0.03 of the
    // lip with it on Mixosaurus, which reads as a cut opening 0.34 % on a body whose cut is closed.
    const shellSide = pairs.map(([i, j]) => (meshOf[i] === jawMesh ? i : meshOf[j] === jawMesh ? j : (skinned[meshOf[i]].geometry.attributes.position.count < skinned[meshOf[j]].geometry.attributes.position.count ? i : j)));
    const stations = shellSide.map((i) => along(i));
    const lo = Math.min(...stations), hi = Math.max(...stations);
    const rearEnd = lo + (hi - lo) * 0.4;
    const transverse = (i) => {
      const local = i - skinned[meshOf[i]].userData.base;
      const d = boundaryDirs[meshOf[i]].get(local);
      return d && d.length && d.reduce((a, c) => a + c, 0) / d.length < 0.5;
    };
    // **The cut is at or behind the hinge's own station**, and nothing ahead of it is. Three
    // other readings were tried and each took something else for the cut: a band of stations took
    // the first 0.03 of the lip (Mixosaurus, 0.34 % "open" on a closed cut); the direction of the
    // rim's edges took the lip where it curves round the corner (Mystriosuchus, 0.4 of a body
    // ahead) and missed a labelled rim that zigzags along the generation's own edges (Hybodus);
    // and anything within a few hundredths ahead of the hinge took the seam's cut through the
    // generation's own oral cavity, where the floor parts from the roof at the back of the mouth
    // (Cymbospondylus, 12 midline points at 1 %) -- a hole into the throat, which is the mouth
    // rule's business and not the junction's. A hair of tolerance covers meshopt's quantisation.
    // ... and the shore kit seats its jaw bone *behind* the plane it cuts at (Coelophysis,
    // Macrocnemus, Tanystropheus), so the station is the hinge's or the rim's own rearmost point,
    // whichever is further forward.
    const hingeStation = Math.max(head[jawK].dot(axis), Math.min(...stations)) + L * 0.002;
    const isCut = (n) => stations[n] <= hingeStation;
    void transverse; void rearEnd;
    cut = pairs.filter((pr, n) => isCut(n));
    lip = pairs.filter((pr, n) => !isCut(n));
  }

  // --- the rigid expectation: where bone k alone would carry a vertex of mesh m
  const bind = skinned.map((m) => m.bindMatrix.clone()), unbind = skinned.map((m) => m.bindMatrixInverse.clone());
  const rigidMatrix = (mi, k) => {
    const m = skinned[mi];
    return new THREE.Matrix4().multiplyMatrices(m.matrixWorld, unbind[mi])
      .multiply(bones[k].matrixWorld).multiply(m.skeleton.boneInverses[k]).multiply(bind[mi]);
  };
  {
    let worst = 0;
    for (let i = 0; i < N; i += 97) {
      const M = rigidMatrix(meshOf[i], owner[i]);
      v3.set(local[i * 3], local[i * 3 + 1], local[i * 3 + 2]).applyMatrix4(M);
      worst = Math.max(worst, Math.hypot(v3.x - rest[i * 3], v3.y - rest[i * 3 + 1], v3.z - rest[i * 3 + 2]));
    }
    if (worst > L * 1e-3) console.warn(`  ${file}: rest pose is ${(worst / L * 100).toFixed(2)} % of a body off the bind pose; follows figures are approximate`);
  }

  // --- sweep every clip
  const bestLag = bones.map(() => null), bestFollow = bones.map(() => null);
  const jawFollow = {};
  const gapOf = (i, j, P) => Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]);
  let cutWorst = { gap: 0, clip: '', phase: 0, pair: null }, lipWorst = { gap: 0, clip: '', phase: 0 };
  const cutOpen = new Set();
  const cur = new Float64Array(N * 3);
  const e3 = new THREE.Vector3();
  for (const clip of gltf.animations) {
    const lagAcc = bones.map(() => ({ skin: 0, joint: 0, phases: 0 }));
    const folAcc = bones.map(() => ({ along: 0, expected: 0, n: 0 }));
    for (let p = 0; p < PHASES; p++) {
      pose(clip, clip.duration * (p / (PHASES - 1)));
      let base = 0;
      for (const m of skinned) {
        const c = m.geometry.attributes.position.count;
        for (let i = 0; i < c; i++) {
          m.getVertexPosition(i, v3).applyMatrix4(m.matrixWorld);
          cur[(base + i) * 3] = v3.x; cur[(base + i) * 3 + 1] = v3.y; cur[(base + i) * 3 + 2] = v3.z;
        }
        base += c;
      }
      for (const [i, j] of cut) {
        const gap = gapOf(i, j, cur);
        if (gap > CUT_OPEN * L) cutOpen.add(i);
        if (gap > cutWorst.gap) cutWorst = { gap, clip: clip.name, phase: p / (PHASES - 1), pair: [i, j] };
      }
      for (const [i, j] of lip) {
        const gap = gapOf(i, j, cur);
        if (gap > lipWorst.gap) lipWorst = { gap, clip: clip.name, phase: p / (PHASES - 1) };
      }
      for (let k = 0; k < bones.length; k++) {
        if (ROOT.test(bones[k].name) || !ball[k].length) continue;
        // lag: the ball's mean travel over the head's own travel, on phases where the head moves
        const h = new THREE.Vector3().setFromMatrixPosition(bones[k].matrixWorld);
        const hd = h.distanceTo(head[k]);
        if (hd > L * 0.01) {
          let s = 0;
          for (const i of ball[k]) s += Math.hypot(cur[i * 3] - rest[i * 3], cur[i * 3 + 1] - rest[i * 3 + 1], cur[i * 3 + 2] - rest[i * 3 + 2]);
          lagAcc[k].skin += s / ball[k].length; lagAcc[k].joint += hd; lagAcc[k].phases++;
        }
        // follows: the joint's own skin along the rigid carry
        const M = new Map();
        for (const i of ball[k]) {
          if (owner[i] !== k) continue;
          const mi = meshOf[i];
          if (!M.has(mi)) M.set(mi, rigidMatrix(mi, k));
          e3.set(local[i * 3], local[i * 3 + 1], local[i * 3 + 2]).applyMatrix4(M.get(mi));
          const ex = e3.x - rest[i * 3], ey = e3.y - rest[i * 3 + 1], ez = e3.z - rest[i * 3 + 2];
          const el = Math.hypot(ex, ey, ez);
          if (el < L * 0.002) continue;
          const ax = cur[i * 3] - rest[i * 3], ay = cur[i * 3 + 1] - rest[i * 3 + 1], az = cur[i * 3 + 2] - rest[i * 3 + 2];
          folAcc[k].along += (ax * ex + ay * ey + az * ez) / el;
          folAcc[k].expected += el;
          folAcc[k].n++;
        }
      }
    }
    for (let k = 0; k < bones.length; k++) {
      const la = lagAcc[k], fa = folAcc[k];
      if (la.phases && (!bestLag[k] || la.joint > bestLag[k].joint)) bestLag[k] = { clip: clip.name, lag: la.skin / la.joint, joint: la.joint };
      if (fa.n) {
        const row = { clip: clip.name, follows: fa.along / fa.expected, expected: fa.expected };
        if (k === jawK) jawFollow[clip.name] = row.follows;
        if (!bestFollow[k] || fa.expected > bestFollow[k].expected) bestFollow[k] = row;
      }
    }
  }

  // --- report
  const rows = bones.map((b, k) => ({
    bone: b.name, ball: ball[k].length, own: ball[k].filter((i) => owner[i] === k).length, share: share[k],
    lag: bestLag[k]?.lag ?? NaN, lagClip: bestLag[k]?.clip ?? '-',
    follows: bestFollow[k]?.follows ?? NaN, followsClip: bestFollow[k]?.clip ?? '-',
  })).filter((r) => !ROOT.test(r.bone));
  const jaw = rows.find((r) => r.bone === 'jaw');
  const jawMouth = Object.fromEntries(['Bite', 'Attack', 'Heavy', 'Eat'].filter((c) => c in jawFollow).map((c) => [c, jawFollow[c]]));
  const seam = {
    pairs: pairs.length, cutPairs: cut.length, cutOpen: cutOpen.size, cutWorst: cutWorst.gap / L, cutClip: cutWorst.clip, cutPhase: cutWorst.phase,
    lipPairs: lip.length, lipWorst: lipWorst.gap / L, lipClip: lipWorst.clip,
  };
  const flags = [];
  if (jaw && Number.isFinite(jaw.follows) && (jaw.follows < FOLLOW_LOW || jaw.follows > FOLLOW_HIGH)) flags.push(`jaw follows its bone by ${jaw.follows.toFixed(2)}, outside [${FOLLOW_LOW}, ${FOLLOW_HIGH}]`);
  // Only a limb or the jaw fails on lag: Ceratites' `head` reads 0.49 in Guard because the skin
  // round that joint is half rigid shell, which is the shell doing what T3D-02a made it do.
  for (const r of rows) if (LIMB.test(r.bone) && Number.isFinite(r.lag) && r.lag < LAG_LOW) flags.push(`${r.bone}: skin round the joint travels ${r.lag.toFixed(2)} of the joint's travel in ${r.lagClip}`);
  // A cut that opens opens along its length (Mixosaurus 56 of 62 rim points, Hybodus 101 of 110,
  // Cartorhynchus 68 of 80 before repair); a handful of points parting past the threshold is the
  // corner of the mouth, one vertex on both the lip and the cut, opening by the gape times its
  // short radius (Cartorhynchus 4 of 77 after repair, Coelophysis 2 of 237, Saurichthys 1 of 151).
  if (seam.cutWorst > CUT_FAIL && seam.cutOpen > CUT_OPEN_SHARE * seam.cutPairs) flags.push(`the jaw cut opens ${(seam.cutWorst * 100).toFixed(2)} % of a body at ${seam.cutClip}@${seam.cutPhase.toFixed(2)} (${seam.cutOpen} of ${seam.cutPairs} rim points past ${CUT_OPEN * 100} %)`);
  if (flags.length) failed++;

  console.log(`\n${file}   ${N} skin vertices · ${bones.length} joints · ${gltf.animations.length} clips · body ${L.toFixed(3)}`);
  console.log(`  ${'joint'.padEnd(16)} ${'ball'.padStart(5)} ${'own'.padStart(5)} ${'share'.padStart(6)}  ${'held by'.padEnd(16)} ${'lag'.padStart(5)} ${'in'.padEnd(10)} ${'follows'.padStart(7)} in`);
  for (const r of rows) {
    const odd = (Number.isFinite(r.lag) && r.lag < LAG_LOW) || (Number.isFinite(r.follows) && (r.follows < FOLLOW_LOW || r.follows > FOLLOW_HIGH));
    if (!odd && r.bone !== 'jaw' && r.bone !== 'skull' && !VERBOSE) continue;
    const f = (x) => (Number.isFinite(x) ? x.toFixed(2) : '-');
    console.log(`  ${r.bone.padEnd(16)} ${String(r.ball).padStart(5)} ${String(r.own).padStart(5)} ${(r.share.own * 100).toFixed(0).padStart(5)}%  ${(r.share.other + ' ' + (r.share.otherShare * 100).toFixed(0) + '%').padEnd(16)} ${f(r.lag).padStart(5)} ${r.lagClip.padEnd(10)} ${f(r.follows).padStart(7)} ${r.followsClip}${odd ? '   <--' : ''}`);
  }
  if (jaw) console.log(`  jaw follows its bone: ${Object.entries(jawMouth).map(([c, l]) => `${c} ${l.toFixed(2)}`).join(' · ') || '(no mouth clip moves it)'}`);
  console.log(`  seam: ${seam.pairs} rest-coincident cross-mesh pairs; cut plane ${seam.cutPairs}, ${seam.cutOpen} open past ${CUT_OPEN * 100} %, worst ${(seam.cutWorst * 100).toFixed(2)} % of a body` +
    (seam.cutPairs ? ` at ${seam.cutClip}@${seam.cutPhase.toFixed(2)}` : '') + `; lip ${seam.lipPairs}, gape ${(seam.lipWorst * 100).toFixed(1)} %${seam.lipPairs ? ` at ${seam.lipClip}` : ''}`);
  if (VERBOSE && cutWorst.pair) {
    const w = (i) => [...weightOf[i]].map(([b, x]) => `${bones[b].name} ${x.toFixed(3)}`).join(' ');
    const show = (i, j, label) => console.log(`  ${label} at rest (${[0, 1, 2].map((k) => rest[i * 3 + k].toFixed(3)).join(', ')}): ${skinned[meshOf[i]].name} {${w(i)}} against ${skinned[meshOf[j]].name} {${w(j)}}`);
    console.log(`  axis (${axis.toArray().map((c) => c.toFixed(0)).join(', ')}), jaw head at (${head[jawK].toArray().map((c) => c.toFixed(3)).join(', ')}), hinge station ${head[jawK].dot(axis).toFixed(3)}, rim stations ${Math.min(...cut.map(([i]) => along(i))).toFixed(3)}..${Math.max(...cut.map(([i]) => along(i))).toFixed(3)}`);
    show(...cutWorst.pair, 'worst cut pair');
    const open = cut.filter(([i]) => cutOpen.has(i)).slice(0, 12);
    for (const [i, j] of open) if (i !== cutWorst.pair[0]) show(i, j, 'open cut pair');
  }
  for (const fl of flags) console.log(`  FAIL: ${fl}`);
  report.push({
    file, length: L, flags, seam,
    jaw: jaw ? { follows: jaw.follows, followsClip: jaw.followsClip, lag: jaw.lag, lagClip: jaw.lagClip, share: jaw.share, byClip: jawMouth } : null,
    joints: rows.map((r) => ({ bone: r.bone, lag: r.lag, lagClip: r.lagClip, follows: r.follows, followsClip: r.followsClip, share: r.share.own, heldBy: r.share.other })),
  });
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + '\n');
if (ALL) console.log(`\n${failed ? `${failed} of ${targets.length} bodies fail: a joint's skin lags, a jaw is held, or a cut opens` : `${targets.length} Triassic bodies: every joint's skin travels with it and every jaw cut stays closed`}`);
process.exit(failed ? 1 : 0);
