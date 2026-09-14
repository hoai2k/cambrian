#!/usr/bin/env node
/**
 * Applies a selection export from the Triassic reference viewer to the repository.
 *
 *   node tools/triassic/apply-selections.mjs ~/Downloads/triassic-canonical-selections-2026-09-13.json
 *   node tools/triassic/apply-selections.mjs <file> --dry-run
 *
 * The viewer (docs/research/triassic/viewer, live at <site>/research/triassic/) is where a human
 * decides, per subject, which single image the animal should be built from. Choosing our own
 * generated pose **greenlights** it: the modelling sheet and the Tripo generation are made from
 * that image and nothing else. Choosing a reference instead says the pose is not right yet, and
 * names the picture the regeneration should be steered toward.
 *
 * This turns those decisions into two things the repository keeps:
 *
 *   docs/triassic/canonical/manifest.json  — each subject's `canonical` state becomes `greenlit`
 *                                            or `needs-rework`, with the chosen reference recorded
 *   docs/triassic/canonical/review.md      — the brief: what is cleared to build, and for each
 *                                            rework the reference to use as generator input, its
 *                                            credit and licence, and the reviewer's note
 *   src/content/triassic/pending-refinements.json
 *                                          — the preview badge's reason in the specimen viewer,
 *                                            which is partly where the pose stands
 *
 * Nothing is invented here. A subject the export does not mention is left exactly as it was, so
 * the file can be applied a screenful at a time.
 */
import { readFile, writeFile, readdir, rename, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
// The file is optional. With no export the tool still runs, and reconciles the manifest with what
// is actually on disk — which models have shipped, which poses have been regenerated and are
// waiting to be looked at again. That reconciliation has to happen whether or not a human has
// just been through the viewer, so it cannot be something only an export triggers.
const file = args.find((a) => !a.startsWith('-'));

const MANIFEST = 'docs/triassic/canonical/manifest.json';
const REVIEW = 'docs/triassic/canonical/review.md';
const SUBJECTS = 'docs/research/triassic/viewer/subjects.json';   // tools/research/eras.mjs: triassic.data
const REFINEMENTS = 'src/content/triassic/pending-refinements.json';
const SHIPPED = 'tools/triassic/shipped.json';
const CANON_DIR = 'docs/triassic/canonical';


const exported = file ? JSON.parse(await readFile(file, 'utf8')) : { selections: [] };
let applied = 0;
// The viewer is shared between eras now, so an export says which era it came from and this
// refuses one from another. The old single-era schema is still accepted: a file exported before
// the split is a Triassic file by construction.
const SCHEMAS = new Set(['canonical-selections/1', 'triassic-canonical-selections/1']);
if (file && !SCHEMAS.has(exported.schema)) {
  console.error(`${file} is not a viewer selection export (schema: ${exported.schema ?? 'none'})`);
  process.exit(1);
}
if (file && exported.era && exported.era !== 'triassic') {
  console.error(`${file} is a ${exported.era} export; this tool applies Triassic decisions`);
  process.exit(1);
}
// An export with no decisions in it is not an error: it still writes an honest review.md saying
// nothing has been reviewed, which is how the file is seeded before the first real pass.
const selections = exported.selections ?? [];

// Subject names, so the write-up reads as animals rather than ids even for rows the export abbreviates.
const subjects = new Map();
for (const g of JSON.parse(await readFile(SUBJECTS, 'utf8')).groups)
  for (const s of g.subjects) subjects.set(s.id, { ...s, group: g.id, groupName: g.name });

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
manifest.subjects ??= {};
const before = JSON.stringify(manifest);
/** A subject the manifest has never heard of: the alternates and the scenery have no pose of their own. */
const hasPose = (id) => ['png', 'jpg', 'jpeg', 'webp'].some((e) => existsSync(`docs/triassic/canonical/${id}.${e}`));

const unknown = [], promotions = [];
for (const row of selections) {
  const subject = subjects.get(row.id);
  if (!subject) { unknown.push(row.id); continue; }
  const entry = (manifest.subjects[row.id] ??= { canonical: hasPose(row.id) ? 'approved' : 'none', turnaround: 'not-started' });
  if (row.verdict === 'delivered') {
    // The page reports what the manifest already told it. Nothing to apply; the state is derived
    // from the shipped list above, and a stale export must never be able to un-deliver a body.
    if (entry.canonical !== 'delivered') entry.reviewedCandidate ??= row.ref;
    continue;
  }
  if (row.ref && row.ref !== 'canonical') entry.reviewedCandidate = row.ref;
  if (row.verdict === 'greenlit') {
    // A greenlit candidate *becomes* the pose. Everything downstream — the modelling sheet, the
    // Tripo input, the portraits — reads `<id>.png` and nothing else, so leaving the winner beside
    // the picture it beat under a different name would send the loser to be built.
    if (row.image?.kind === 'candidate' || /^candidate/.test(row.ref ?? '')) promotions.push({ id: row.id, label: row.ref });
    entry.canonical = 'greenlit';
    // Which of our images is the canon, where a subject has more than one — the male Keichousaurus
    // rather than the female, a modelling sheet rather than the pose beside it. A plain pose leaves
    // this off, because there is nothing to disambiguate.
    if (row.ref && row.ref !== 'canonical') entry.greenlitImage = row.ref; else delete entry.greenlitImage;
    // A greenlit subject can carry a note too — a caveat the build should know about — and it has
    // to survive the round trip, or the viewer reloads without it and the reviewer retypes it.
    if (row.note) entry.note = row.note; else delete entry.note;
    delete entry.reworkToward; delete entry.reworkNote; delete entry.awaitingReview;
  } else {
    entry.canonical = 'needs-rework';
    // A redo does not have to name somebody else's picture. "Redraw this one — the reading is
    // right, the fin is wrong" steers by our own image, and then the note is the whole brief.
    entry.reworkToward = row.image?.kind === 'web'
      ? { kind: 'web', title: row.image.title, artist: row.image.artist, licence: row.image.licence,
          page: row.image.page, full: row.image.full, description: row.image.description }
      : { kind: row.image?.kind ?? row.chose, label: row.image?.label ?? row.ref };
    if (row.note) entry.reworkNote = row.note; else delete entry.reworkNote;
    delete entry.note;
  }
  entry.decidedAt = row.at ?? exported.generated;
  applied++;
}

/**
 * Promote each greenlit candidate to *be* the subject's canonical pose: the old pose is kept under
 * deleted, the candidate takes its place, and the prompt record that was waiting on a human
 * answer records the one it got. The candidate file itself goes, because two identical images
 * under two names in the viewer is a question a reviewer should never have to answer.
 */
const promoted = [];
for (const { id, label } of promotions) {
  const entry0 = manifest.subjects[id];
  // Already done. A viewer export re-states every standing decision, so the greenlight that
  // promoted a candidate comes back on every later pass — by which time the candidate file is
  // gone, because it *became* the pose. Without this the tool warns about a missing image on
  // every run and records the promoted label as though the pose were still one of two.
  if (entry0?.promotedFrom === label) {
    delete entry0.greenlitImage; delete entry0.reviewedCandidate;
    await retireCandidates(id);
    continue;
  }
  const ext = ['png', 'jpg', 'jpeg', 'webp'].find((e) => existsSync(`${CANON_DIR}/${id}-${label}.${e}`));
  if (!ext) { console.warn(`  ${id}: greenlit \`${label}\` but no such image beside the pose; left as it was`); continue; }
  const from = `${CANON_DIR}/${id}-${label}.${ext}`, to = `${CANON_DIR}/${id}.${ext}`;
  if (!dryRun) {
    // The pose it replaces is deleted rather than stashed. One greenlit image per subject is the
    // whole point of the canonical directory, and a shelf of the ones that lost is a second answer
    // to what the animal looks like — the failure mode this rule exists to prevent. Nothing is
    // lost: every one of them is in git history, recoverable by the same two commands
    // `intake/README.md` gives for a converted source.
    if (existsSync(to)) await rm(to);
    await rename(from, to);
  }
  const entry = manifest.subjects[id];
  delete entry.greenlitImage; delete entry.reviewedCandidate;
  delete entry.awaitingReview;
  entry.promotedFrom = label;
  promoted.push(`${id} (${label})`);
  // The candidates it beat go with the pose it replaced. They lost to the picture that is now the
  // canon, so leaving them anywhere leaves a second answer to what the animal looks like.
  await retireCandidates(id);
}
/** Delete every remaining candidate of a promoted subject: they lost to the picture that is now
 * the canon, and a subject keeps exactly one image once it is greenlit. Git history holds them. */
async function retireCandidates(id) {
  if (dryRun) return;
  const rest = (await readdir(CANON_DIR).catch(() => [])).filter((f) => f.startsWith(`${id}-candidate`));
  for (const f of rest) await rm(`${CANON_DIR}/${f}`);
}
// The prompt records stop asking: the candidate they were waiting on has had its answer.
if (promoted.length || selections.length) {
  for (const f of (await readdir(CANON_DIR).catch(() => []))) {
    if (!f.startsWith('prompts') || !f.endsWith('.json')) continue;
    const path = `${CANON_DIR}/${f}`;
    const j = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'));
    let touched = false;
    for (const [id, sub] of Object.entries(j.subjects ?? {})) {
      if (sub.status !== 'candidate-awaiting-human-greenlight') continue;
      const row = selections.find((r) => r.id === id);
      if (!row) continue;
      sub.status = row.verdict === 'greenlit' ? 'greenlit-and-promoted' : `reviewed-${row.verdict}`;
      sub.reviewedAt = row.at ?? exported.generated;
      if (row.note) sub.reviewerNote = row.note;
      touched = true;
    }
    if (touched && !dryRun) await writeFile(path, `${JSON.stringify(j, null, 2)}\n`);
  }
}

// ---- reconciling the manifest with the tree ----
// Two things happen to a subject without anybody opening the viewer, and both make the recorded
// decision wrong rather than merely old. They are derived here, from the repository itself, so the
// manifest cannot drift from what has actually been built and drawn.

/**
 * A model has shipped. The pose that was greenlit produced a body, and the roster's status for that
 * animal is no longer "cleared to build" but **delivered** — which is what a reviewer wants to see,
 * because the question has moved from *is this the right picture* to *is this the right animal*.
 * Derived from the shipped list the asset tooling already maintains, so it follows a delivery
 * rather than waiting to be typed in.
 */
const shipped = JSON.parse(await readFile(SHIPPED, 'utf8').catch(() => '{"creatures":[]}')).creatures ?? [];
for (const id of shipped) {
  const entry = manifest.subjects[id];
  if (!entry || entry.canonical === 'delivered') continue;
  if (entry.canonical === 'greenlit') entry.greenlitAt = entry.decidedAt;
  entry.canonical = 'delivered';
  entry.deliveredAt = new Date().toISOString().slice(0, 10);
  delete entry.reworkToward; delete entry.reworkNote; delete entry.awaitingReview;
}

// `awaitingReview` describes only the interval between a regenerated candidate landing and a
// human deciding it. Older manifests may retain the historical note after that human decision;
// clear it without changing the decision itself.
for (const entry of Object.values(manifest.subjects))
  if (entry.canonical === 'greenlit' || entry.canonical === 'delivered') delete entry.awaitingReview;

/**
 * A pose has been regenerated. The prompt records beside the poses mark a fresh candidate as
 * `candidate-awaiting-human-greenlight`, and the moment one exists the decision that asked for it
 * is spent: the subject is neither greenlit nor still waiting on a redraw, it is waiting to be
 * *looked at*. So the decision is cleared and the subject returns to the undecided pile, where the
 * viewer shows the new candidate beside the pose it is meant to replace.
 */
const candidates = new Map();
for (const f of (await readdir(CANON_DIR).catch(() => []))) {
  if (!f.startsWith('prompts') || !f.endsWith('.json')) continue;
  const j = JSON.parse(await readFile(`${CANON_DIR}/${f}`, 'utf8').catch(() => '{}'));
  for (const [id, sub] of Object.entries(j.subjects ?? {}))
    if (sub.status === 'candidate-awaiting-human-greenlight')
      // `mystriosuchus-candidate02.png` → `candidate02`, which is the label the viewer shows it
      // under and therefore the one a decision names.
      candidates.set(id, String(sub.candidate ?? '').replace(/\.[a-z]+$/i, '').replace(`${id}-`, '') || 'candidate');
}
const reopened = [];
for (const [id, label] of candidates) {
  const entry = manifest.subjects[id];
  // A delivered body is not reopened by a new drawing of the animal: the model is the thing under
  // review by then, and the pose it was built from is history.
  if (!entry || entry.canonical === 'delivered' || entry.canonical === 'approved') continue;
  // Nor is one a human has already looked at. Without this the reopen fires on every run and
  // quietly undoes the decision the reviewer just made about that very candidate.
  if (entry.reviewedCandidate === label) continue;
  delete entry.canonical; delete entry.reworkToward; delete entry.reworkNote;
  delete entry.decidedAt; delete entry.greenlitImage; delete entry.note;
  entry.canonical = hasPose(id) ? 'approved' : 'none';
  entry.awaitingReview = 'a regenerated candidate is in the viewer beside the pose it replaces';
  reopened.push(id);
}

/**
 * The write-up is of the repository's whole state, not of this pass. Applying a three-row export
 * used to rewrite review.md from those three rows alone and silently drop the eighteen decisions
 * already in the manifest — the file is meant to be the standing answer to "what is cleared to
 * build", so it is rebuilt from the manifest every time and the export only moves the manifest.
 */
const stateOf = (id) => manifest.subjects[id]?.canonical;
const rows = (want) => [...subjects.keys()].filter((id) => stateOf(id) === want).sort()
  .map((id) => ({ id, subject: subjects.get(id), ...manifest.subjects[id] }));
const greenlit = rows('greenlit'), rework = rows('needs-rework'), delivered = rows('delivered');
const undecided = [...subjects.keys()].filter((id) => !['greenlit', 'needs-rework'].includes(stateOf(id)));

const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
const when = (exported.generated ?? new Date().toISOString()).slice(0, 10);
const lines = [];
lines.push('# Canonical image review', '');
lines.push('**Generated — do not edit by hand.** Written by `node tools/triassic/apply-selections.mjs`');
lines.push('from a selection export made in the [reference viewer](https://games.hoai.net/cambrian/research/triassic/).');
lines.push(`Latest pass: ${when}.`, '');
lines.push('A subject is **greenlit** when a human picked our own generated pose as the image the animal');
lines.push('should be built from. Everything downstream — the four-view modelling sheet, the Tripo');
lines.push('generation, the skeleton and the shipped body — is made from that one image');
lines.push('([04 · The Tripo pipeline](../04-tripo-pipeline.md)). A subject marked **redo** is not cleared:');
lines.push('its pose is regenerated — steered toward a reference that beat it, or simply redrawn where the');
lines.push('reading is accepted and only the picture is wrong — then reviewed again, and only then built.', '');
lines.push('A subject whose model has landed reads **delivered**: the picture is settled and the body is');
lines.push('what is under review now. A regenerated pose clears whatever was decided about the old one and');
lines.push('sends the subject back to the undecided pile, where the viewer shows the candidate beside it.', '');
lines.push('| Delivered | Greenlit | Redo | Not yet reviewed |', '| --- | --- | --- | --- |',
  `| ${delivered.length} | ${greenlit.length} | ${rework.length} | ${undecided.length} |`, '');

lines.push('## Delivered — the model exists', '');
if (delivered.length) {
  lines.push('| Subject | Slot | Built from | Landed |', '| --- | --- | --- | --- |');
  for (const r of delivered)
    lines.push(`| **${esc(r.subject.name)}** \`${r.id}\` | ${esc(r.subject.role)} | ${r.greenlitImage ? `\`${esc(r.greenlitImage)}\`` : 'the greenlit pose'} | ${esc(r.deliveredAt) || '—'} |`);
  lines.push('', 'These keep their preview badge until a human approves the body itself. Where a procedural twin');
  lines.push('shipped with the body, the specimen viewer switches between the two in place.');
} else lines.push('No Triassic model has landed yet.');
lines.push('');

lines.push('## Greenlit — build from the canonical pose', '');
if (greenlit.length) {
  lines.push('| Subject | Slot | Canon image | Note |', '| --- | --- | --- | --- |');
  for (const r of greenlit)
    lines.push(`| **${esc(r.subject.name)}** \`${r.id}\` | ${esc(r.subject.role)} | ${r.greenlitImage ? `\`${esc(r.greenlitImage)}\`` : 'the pose'} | ${esc(r.note) || '—'} |`);
} else lines.push('Nothing greenlit yet.');
lines.push('');

lines.push('## Redo — regenerate the canonical pose', '');
if (rework.length) {
  lines.push('Each row is a generator brief: take the subject\'s current pose in `docs/triassic/canonical/`,');
  lines.push('regenerate it with the steer given here, and put the result back through the viewer. Some steers');
  lines.push('name somebody else\'s artwork — use it as direction, keep its credit with the prompt, and never');
  lines.push('ship it. Others name our own image, which means the reading is accepted and only the picture is');
  lines.push('wrong: there the note is the entire brief.', '');
  for (const r of rework) {
    const im = r.reworkToward ?? {};
    lines.push(`### ${r.subject.name} \`${r.id}\``, '');
    lines.push(`- **Slot:** ${esc(r.subject.role)} · ${esc(r.subject.len)}`);
    if (im.kind === 'web') {
      lines.push(`- **Steer toward:** ${esc(im.title)}`);
      lines.push(`- **Credit:** ${esc(im.artist) || 'unknown'} · ${esc(im.licence) || 'see file page'}`);
      if (im.page) lines.push(`- **File page:** ${im.page}`);
      if (im.full) lines.push(`- **Full size:** ${im.full}`);
      if (im.description) lines.push(`- **Described as:** ${esc(im.description)}`);
    } else {
      // The picture to redraw is the one that was *chosen*, which after a candidate round is the
      // candidate rather than the pose it was drawn against. Naming the wrong file here would send
      // the generator back to the version the reviewer had already moved past.
      const stem = im.label && im.label !== 'canonical' ? `${r.id}-${im.label}` : r.id;
      lines.push(`- **Redraw our own ${im.kind === 'turnaround' ? 'modelling sheet' : 'pose'}:** \`docs/triassic/canonical/${stem}.png\``);
      lines.push('- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.');
    }
    lines.push(`- **Reviewer's note:** ${esc(r.reworkNote) || '—'}`);
    lines.push('');
  }
} else lines.push('Nothing queued for rework.');
lines.push('');

lines.push('## Not yet reviewed', '');
lines.push(undecided.length
  ? undecided.sort().map((id) => `\`${id}\``).join(' · ')
  : 'Every subject has been reviewed.');
lines.push('');

/**
 * The preview badge's reason, in the specimen viewer, is the same fact seen from the game's side:
 * why this animal is still borrowing a body. Where its pose stands is half of that answer, so it
 * is written from the manifest rather than asserted — every entry once claimed its pose was
 * approved, which was true of eighteen of twenty-five.
 */
const BORROWED = 'No Triassic model has been delivered yet: this animal borrows a Devonian body in play until its own '
  + 'Tripo model, rig and clips land through the pipeline in docs/triassic/04-tripo-pipeline.md.';
function refinementReason(id) {
  const e = manifest.subjects[id] ?? {};
  if (e.canonical === 'delivered')
    return 'The Triassic model has landed and the game and the specimen viewer both load it'
      + `${e.deliveredAt ? ` (${e.deliveredAt})` : ''}. It keeps the preview badge until a human approves the body itself: `
      + 'the generated shape, its procedural twin and the clips they share (docs/triassic/04-tripo-pipeline.md).';
  if (e.canonical === 'greenlit')
    return `${BORROWED} Its canonical pose is greenlit${e.greenlitImage ? ` (the \`${e.greenlitImage}\` pose)` : ''} in `
      + 'docs/triassic/canonical/review.md, so the four-view modelling sheet and the Tripo generation are cleared to be made from it.';
  if (e.awaitingReview)
    return `${BORROWED} Its canonical pose is back under review — ${e.awaitingReview} `
      + '(docs/triassic/canonical/review.md) — so nothing downstream may be built from it yet.';
  if (e.canonical === 'needs-rework') {
    const t = e.reworkToward ?? {};
    const steer = t.kind === 'web' ? `a redo steered toward "${t.title}"` : 'a redraw of our own pose';
    return `${BORROWED} The pose is not cleared to build from: the review sent it back for ${steer} `
      + '(docs/triassic/canonical/review.md), so the modelling sheet and the generation wait on the regenerated pose.';
  }
  return `${BORROWED} Its canonical pose has not been through the greenlight review yet `
    + '(docs/triassic/canonical/review.md), so nothing downstream may be built from it.';
}
const refinements = JSON.parse(await readFile(REFINEMENTS, 'utf8'));
const refinementsBefore = JSON.stringify(refinements);
for (const row of refinements) if (row.scope === 'initial-model') row.reason = refinementReason(row.id);
/**
 * A body a human has approved stops carrying the preview badge.
 *
 * `delivered` only says the model landed and the game loads it; the badge stayed on because
 * nobody had looked at the body itself. `bodyApproved` is that look having happened. The entry is
 * then removed rather than reworded: the queue's own rule is that an entry must claim model or
 * clip work, and an approved body claims neither. The bar is the reviewer's — playable, with no
 * outstanding reconstruction request against it — not that the animal is beyond improvement.
 */
const approved = Object.entries(manifest.subjects ?? {})
  .filter(([, e]) => e.canonical === 'delivered' && e.bodyApproved)
  .map(([id]) => id);
for (let i = refinements.length - 1; i >= 0; i--) {
  const row = refinements[i];
  if (row.scope === 'initial-model' && approved.includes(row.id) && !row.clips?.length) refinements.splice(i, 1);
}

if (unknown.length) console.warn(`ignored ${unknown.length} selection(s) for unknown subjects: ${unknown.join(', ')}`);

if (dryRun) {
  console.log(`--dry-run: would leave ${delivered.length} delivered, ${greenlit.length} greenlit, ${rework.length} to redo, ${undecided.length} unreviewed. Nothing written.`);
} else {
  // The manifest is only rewritten when a decision actually moved something: re-serialising it for
  // a pass that changed nothing would reformat the whole file and show up as a diff that says nothing.
  const changed = JSON.stringify(manifest) !== before;
  if (changed) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  const reasonsChanged = JSON.stringify(refinements) !== refinementsBefore;
  if (reasonsChanged) await writeFile(REFINEMENTS, `${JSON.stringify(refinements, null, 2)}\n`);
  await writeFile(REVIEW, `${lines.join('\n')}`);
  console.log(`${applied} decision(s) applied${promoted.length ? `, ${promoted.length} candidate(s) promoted to the pose (${promoted.join(', ')})` : ''}${reopened.length ? `, ${reopened.length} reopened by a fresh candidate (${reopened.join(', ')})` : ''}`);
  console.log(`  the roster now stands at ${delivered.length} delivered, ${greenlit.length} greenlit, ${rework.length} to redo, ${undecided.length} unreviewed`);
  console.log(`wrote ${REVIEW}${changed ? ` and ${MANIFEST}` : `; ${MANIFEST} unchanged`}${reasonsChanged ? ` and ${REFINEMENTS}` : ''}`);
}
