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
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('-'));
if (!file) {
  console.error('usage: node tools/triassic/apply-selections.mjs <selections.json> [--dry-run]');
  process.exit(2);
}

const MANIFEST = 'docs/triassic/canonical/manifest.json';
const REVIEW = 'docs/triassic/canonical/review.md';
const SUBJECTS = 'docs/research/triassic/viewer/subjects.json';
const REFINEMENTS = 'src/content/triassic/pending-refinements.json';

const exported = JSON.parse(await readFile(file, 'utf8'));
let applied = 0;
if (exported.schema !== 'triassic-canonical-selections/1') {
  console.error(`${file} is not a viewer selection export (schema: ${exported.schema ?? 'none'})`);
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

const unknown = [];
for (const row of selections) {
  const subject = subjects.get(row.id);
  if (!subject) { unknown.push(row.id); continue; }
  const entry = (manifest.subjects[row.id] ??= { canonical: hasPose(row.id) ? 'approved' : 'none', turnaround: 'not-started' });
  if (row.verdict === 'greenlit') {
    entry.canonical = 'greenlit';
    // Which of our images is the canon, where a subject has more than one — the male Keichousaurus
    // rather than the female, a modelling sheet rather than the pose beside it. A plain pose leaves
    // this off, because there is nothing to disambiguate.
    if (row.ref && row.ref !== 'canonical') entry.greenlitImage = row.ref; else delete entry.greenlitImage;
    // A greenlit subject can carry a note too — a caveat the build should know about — and it has
    // to survive the round trip, or the viewer reloads without it and the reviewer retypes it.
    if (row.note) entry.note = row.note; else delete entry.note;
    delete entry.reworkToward; delete entry.reworkNote;
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
 * The write-up is of the repository's whole state, not of this pass. Applying a three-row export
 * used to rewrite review.md from those three rows alone and silently drop the eighteen decisions
 * already in the manifest — the file is meant to be the standing answer to "what is cleared to
 * build", so it is rebuilt from the manifest every time and the export only moves the manifest.
 */
const stateOf = (id) => manifest.subjects[id]?.canonical;
const rows = (want) => [...subjects.keys()].filter((id) => stateOf(id) === want).sort()
  .map((id) => ({ id, subject: subjects.get(id), ...manifest.subjects[id] }));
const greenlit = rows('greenlit'), rework = rows('needs-rework');
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
lines.push(`| Greenlit | Redo | Not yet reviewed |`, `| --- | --- | --- |`, `| ${greenlit.length} | ${rework.length} | ${undecided.length} |`, '');

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
      lines.push(`- **Redraw our own ${im.kind === 'turnaround' ? 'modelling sheet' : 'pose'}:** \`docs/triassic/canonical/${r.id}.png\``);
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
  if (e.canonical === 'greenlit')
    return `${BORROWED} Its canonical pose is greenlit${e.greenlitImage ? ` (the \`${e.greenlitImage}\` pose)` : ''} in `
      + 'docs/triassic/canonical/review.md, so the four-view modelling sheet and the Tripo generation are cleared to be made from it.';
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

if (unknown.length) console.warn(`ignored ${unknown.length} selection(s) for unknown subjects: ${unknown.join(', ')}`);

if (dryRun) {
  console.log(`--dry-run: ${applied} decision(s) from this file would leave ${greenlit.length} greenlit, ${rework.length} to redo, ${undecided.length} unreviewed. Nothing written.`);
} else {
  // The manifest is only rewritten when a decision actually moved something: re-serialising it for
  // a pass that changed nothing would reformat the whole file and show up as a diff that says nothing.
  const changed = JSON.stringify(manifest) !== before;
  if (changed) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  const reasonsChanged = JSON.stringify(refinements) !== refinementsBefore;
  if (reasonsChanged) await writeFile(REFINEMENTS, `${JSON.stringify(refinements, null, 2)}\n`);
  await writeFile(REVIEW, `${lines.join('\n')}`);
  console.log(`${applied} decision(s) applied — the roster now stands at ${greenlit.length} greenlit, ${rework.length} to redo, ${undecided.length} unreviewed`);
  console.log(`wrote ${REVIEW}${changed ? ` and ${MANIFEST}` : `; ${MANIFEST} unchanged`}${reasonsChanged ? ` and ${REFINEMENTS}` : ''}`);
}
