/**
 * Bundles an era's fetched references and canonical poses into `data.js`, and copies the shared
 * viewer page beside it, so `index.html` works when opened straight off the disk (a fetch() of a
 * local file is blocked by the browser; a script assignment is not).
 *
 *   node tools/research/viewer-bundle.mjs triassic      # npm run triassic:viewer
 *   node tools/research/viewer-bundle.mjs devonian      # npm run devonian:viewer
 *
 * It also writes the **deployable copy** into `public/research/<era>/`, which Vite copies
 * verbatim into `dist/` — so the viewer is reachable at `<site>/research/<era>/` and not only
 * off the disk. `docs/` is never deployed (only `dist/` is), which is why a `docs/...` URL on the
 * live site 404s. The copy carries web-sized canonical images rather than the full-resolution
 * PNGs the source set holds; those stay in git for anyone porting a model.
 *
 * Canonical images are matched by filename: `<subject-id>.png` (or .jpg/.webp), and
 * `<subject-id>-<anything>.png` for extra views (`keichousaurus-male`), which sort after the
 * plain one. Files ending in `-candidate<number>` are explicit replacement candidates, with
 * their own selection identity; bundling never promotes one or changes an existing decision.
 * The directory is the art's home, not a copy of it: see its README.
 *
 * Integrated `<id>-turnaround.png` views remain beside the pose. New images from
 * `canonical/model-inputs/<id>/` appear as read-only modelling references once the subject's
 * manifest status is `greenlit` or `delivered`. Legacy intake sheets are never ingested.
 */
import { readFile, writeFile, readdir, mkdir, stat, copyFile, rm } from 'node:fs/promises';
import { dirname, join, extname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eraFromArgv } from './eras.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const era = eraFromArgv(process.argv.slice(2), 'tools/research/viewer-bundle.mjs');
/** The era's own viewer directory: its subjects, its fetched references, its generated page. */
const HERE = join(ROOT, era.data);
/** Relative to HERE, because the page resolves canonical images against its own location. */
const CANON_DIR = relative(HERE, join(ROOT, era.canon));
const DEPLOY_DIR = join(ROOT, era.deploy);
const PAGE = join(ROOT, 'tools/research/viewer/index.html');
/** The deployed canonical images: big enough to judge a silhouette against a reference, small enough to ship. */
const DEPLOY_WIDTH = 1400, DEPLOY_QUALITY = 82;
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

// `subjects.json` is the authoritative roster. `images.json` is only the last successful
// Wikimedia snapshot and can legitimately lag a newly added subject, so merge by id instead of
// silently dropping rows that do not have fetched references yet.
const subjectData = JSON.parse(await readFile(join(HERE, 'subjects.json'), 'utf8'));
const imageData = JSON.parse(await readFile(join(HERE, 'images.json'), 'utf8'));
const fetchedById = new Map(imageData.groups.flatMap((g) => g.subjects).map((s) => [s.id, s.images ?? []]));
const data = {
  ...imageData,
  groups: subjectData.groups.map((group) => ({
    ...group,
    subjects: group.subjects.map((subject) => ({ ...subject, images: fetchedById.get(subject.id) ?? [] })),
  })),
};
const manifest = JSON.parse(await readFile(join(HERE, CANON_DIR, 'manifest.json'), 'utf8'));

/**
 * The decisions the repository already holds, read out of the canonical manifest and bundled
 * alongside the images. They are the page's starting state on every load, which is the whole
 * point: a reviewer's clicks live in the tab and nowhere else, so a reload shows what has
 * actually been applied to the codebase rather than what this browser last did.
 *
 * The manifest's vocabulary and the page's are the same decision seen from two ends —
 * `greenlit` names which of our images won (`greenlitImage`, absent when there is only the one
 * pose), `needs-rework` names the picture to steer the regeneration toward, and that picture may
 * be one of ours: "redraw this, the reading is right" is a real verdict and not a greenlight.
 */
function decisions(manifest) {
  const out = {};
  for (const [id, e] of Object.entries(manifest.subjects ?? {})) {
    if (e.canonical === 'delivered')
      out[id] = { verdict: 'delivered', choice: 'canonical', ref: e.greenlitImage || 'canonical', note: e.note || '', at: e.deliveredAt || e.greenlitAt, locked: true };
    else if (e.canonical === 'greenlit')
      out[id] = { verdict: 'greenlit', choice: 'canonical', ref: e.greenlitImage || 'canonical', note: e.note || '', at: e.decidedAt };
    else if (e.canonical === 'needs-rework') {
      const t = e.reworkToward ?? {};
      out[id] = {
        verdict: 'replace',
        choice: t.kind === 'web' ? 'web' : t.kind || 'canonical',
        ref: t.kind === 'web' ? t.title : t.label ?? 'canonical',
        note: e.reworkNote || '', at: e.decidedAt,
      };
    }
  }
  return out;
}
const decided = decisions(manifest);

let files = [];
try {
  files = (await readdir(join(HERE, CANON_DIR))).filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()));
} catch { /* the directory may not exist yet */ }

// Grid thumbnails: the canonical poses are ~3 MB each, and a grid of twenty-five of them at full
// size is a slow page for no benefit. 520 px webp is a tenth of a per cent of the bytes and the
// large view still loads the original.
async function thumbnail(src, stem) {
  const out = `thumbs/${stem}.webp`;
  const dst = join(HERE, out);
  try {
    const [a, b] = await Promise.all([stat(src), stat(dst).catch(() => null)]);
    if (b && b.mtimeMs >= a.mtimeMs) return out;                     // already current
    const { default: sharp } = await import('sharp');
    await mkdir(join(HERE, 'thumbs'), { recursive: true });
    await sharp(src).resize({ width: 520, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dst);
    return out;
  } catch (err) {
    console.warn(`  (no thumbnail for ${file}: ${err.message})`);
    return null;
  }
}

const ids = new Set(data.groups.flatMap((g) => g.subjects.map((s) => s.id)));
const canonical = {};
const orphans = [];
for (const file of files.sort()) {
  const stem = basename(file, extname(file));
  // longest matching id wins, so `cymbospondylus-buchseri` beats `cymbospondylus`
  const id = [...ids].filter((i) => stem === i || stem.startsWith(`${i}-`)).sort((a, b) => b.length - a.length)[0];
  if (!id) { orphans.push(file); continue; }
  const turn = stem.endsWith('-turnaround');
  const candidate = /-candidate\d+$/.test(stem);
  (canonical[id] ??= []).push({
    abs: join(HERE, CANON_DIR, file),
    src: `${CANON_DIR}/${file}`,
    thumb: await thumbnail(join(HERE, CANON_DIR, file), stem),
    kind: turn ? 'turnaround' : candidate ? 'candidate' : 'canonical',
    label: stem === id ? 'canonical' : turn ? '3D views' : stem.slice(id.length + 1).replace(/[-_]/g, ' '),
  });
}
// Canonical-derived inputs are inspection aids, never alternative canonical selections.
// The manifest gate is authoritative; metadata inside an input folder cannot approve a subject.
let modelReferences = 0;
for (const id of ids) {
  // Greenlit *or* delivered: a body having been built is not a reason to hide the images it was
  // built from — that is exactly when someone wants to look at them, to ask whether the model is
  // the animal the input asked for.
  if (!['greenlit', 'delivered'].includes(manifest.subjects?.[id]?.canonical)) continue;
  for (const name of ['input', 'three-quarter', 'turnaround']) {
    const rel = `${CANON_DIR}/model-inputs/${id}/${name}.png`;
    const abs = join(HERE, rel);
    if (!(await stat(abs).catch(() => null))) continue;
    (canonical[id] ??= []).push({
      abs, src: rel, thumb: await thumbnail(abs, `${id}-model-${name}`),
      kind: 'model-reference', label: `modelling reference · ${name.replaceAll('-', ' ')}`,
    });
    modelReferences++;
  }
}
const rank = (c) => (c.kind === 'model-reference' ? 3 : c.kind === 'turnaround' ? 2 : c.label === 'canonical' ? 0 : 1);
for (const list of Object.values(canonical)) list.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));

/** `abs` is this script's own business; it never reaches the page. */
const strip = (canon) => Object.fromEntries(Object.entries(canon).map(([id, list]) => [id, list.map(({ abs, ...rest }) => rest)]));
const eraForPage = { id: era.id, name: era.name, canon: era.canon, viewerCmd: era.viewerCmd, applyCmd: era.applyCmd };
const bundle = (canon) => `/* Generated by tools/research/viewer-bundle.mjs — do not edit. */\n`
  + `window.REFERENCE_ERA = ${JSON.stringify(eraForPage)};\n`
  + `window.REFERENCE_DATA = ${JSON.stringify(data)};\n`
  + `window.REFERENCE_CANONICAL = ${JSON.stringify(strip(canon))};\n`
  + `window.REFERENCE_DECIDED = ${JSON.stringify(decided)};\n`;
// The page is shared; each era gets a copy beside its own data so the folder opens off the disk.
await mkdir(HERE, { recursive: true });
await copyFile(PAGE, join(HERE, 'index.html'));
await writeFile(join(HERE, 'data.js'), bundle(canonical));

const withCanon = Object.values(canonical).filter((l) => l.some((c) => c.kind === 'canonical')).length;
const green = Object.values(decided).filter((d) => d.verdict === 'greenlit').length;
const built = Object.values(decided).filter((d) => d.verdict === 'delivered').length;
console.log(`data.js written — ${ids.size} subjects, ${withCanon} with a canonical image, ${ids.size - withCanon} without, ${modelReferences} modelling references`);
console.log(`  decisions carried from the manifest: ${built} delivered, ${green} greenlit, ${Object.keys(decided).length - green - built} to redo`);
if (orphans.length) console.log(`canonical files matching no subject id: ${orphans.join(', ')}`);

// ---- the deployable copy ----
// Everything the page needs beside itself, with the canonical images re-encoded for the web and
// every path made local, so the folder can be dropped anywhere. The reference images stay
// hotlinked to Wikimedia Commons, as they are off the disk.
const { default: sharp } = await import('sharp');
await rm(DEPLOY_DIR, { recursive: true, force: true });
await mkdir(join(DEPLOY_DIR, 'canonical'), { recursive: true });
await mkdir(join(DEPLOY_DIR, 'thumbs'), { recursive: true });
await copyFile(PAGE, join(DEPLOY_DIR, 'index.html'));

let bytes = 0;
const deployed = {};
for (const [id, list] of Object.entries(canonical)) {
  deployed[id] = [];
  for (const entry of list) {
    const fileStem = basename(entry.src, extname(entry.src));
    const stem = entry.kind === 'model-reference' ? `${id}-model-${fileStem}` : fileStem;
    const out = join(DEPLOY_DIR, 'canonical', `${stem}.webp`);
    await sharp(entry.abs).resize({ width: DEPLOY_WIDTH, withoutEnlargement: true }).webp({ quality: DEPLOY_QUALITY }).toFile(out);
    bytes += (await stat(out)).size;
    if (entry.thumb) { await copyFile(join(HERE, entry.thumb), join(DEPLOY_DIR, entry.thumb)); bytes += (await stat(join(DEPLOY_DIR, entry.thumb))).size; }
    const { abs, ...rest } = entry;
    deployed[id].push({ ...rest, src: `canonical/${stem}.webp`, thumb: entry.thumb ?? null });
  }
}
await writeFile(join(DEPLOY_DIR, 'data.js'), bundle(deployed));
await writeFile(join(DEPLOY_DIR, 'README.md'), `# Deployed copy — generated\n\nWritten by \`tools/research/viewer-bundle.mjs\` (\`${era.viewerCmd}\`) so the reference viewer ships\nwith the site at \`<site>/research/${era.id}/\`. Do not edit anything here: the page is\n\`tools/research/viewer/index.html\`, the data is \`${era.data}/\`, and the canonical images are the\nfull-resolution set in \`${era.canon}/\`, re-encoded here at ${DEPLOY_WIDTH} px for the web.\n`);
console.log(`deploy copy written to ${era.deploy} — ${(bytes / 1048576).toFixed(1)} MB of images at ${DEPLOY_WIDTH} px`);
