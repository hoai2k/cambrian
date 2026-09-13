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

const exported = JSON.parse(await readFile(file, 'utf8'));
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

const greenlit = [], rework = [], unknown = [];
for (const row of selections) {
  const subject = subjects.get(row.id);
  if (!subject) { unknown.push(row.id); continue; }
  const entry = (manifest.subjects[row.id] ??= { canonical: hasPose(row.id) ? 'approved' : 'none', turnaround: 'not-started' });
  if (row.verdict === 'greenlit') {
    entry.canonical = 'greenlit';
    delete entry.reworkToward;
    greenlit.push({ ...row, subject });
  } else {
    entry.canonical = 'needs-rework';
    entry.reworkToward = row.image?.kind === 'web'
      ? { kind: 'web', title: row.image.title, page: row.image.page }
      : { kind: row.image?.kind ?? row.chose, label: row.image?.label ?? row.ref };
    if (row.note) entry.reworkNote = row.note; else delete entry.reworkNote;
    rework.push({ ...row, subject });
  }
  entry.decidedAt = row.at ?? exported.generated;
}

// The states this pass did not touch, so the write-up can say what is still unreviewed.
const undecided = [...subjects.keys()].filter((id) => {
  const st = manifest.subjects[id]?.canonical;
  return st !== 'greenlit' && st !== 'needs-rework';
});

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
lines.push('its pose is regenerated with the named picture as the steer, reviewed again, and only then built.', '');
lines.push(`| Greenlit | Redo | Not yet reviewed |`, `| --- | --- | --- |`, `| ${greenlit.length} | ${rework.length} | ${undecided.length} |`, '');

lines.push('## Greenlit — build from the canonical pose', '');
if (greenlit.length) {
  lines.push('| Subject | Slot | Note |', '| --- | --- | --- |');
  for (const r of greenlit.sort((a, b) => a.id.localeCompare(b.id)))
    lines.push(`| **${esc(r.name || r.subject.name)}** \`${r.id}\` | ${esc(r.subject.role)} | ${esc(r.note) || '—'} |`);
} else lines.push('Nothing greenlit yet.');
lines.push('');

lines.push('## Redo — regenerate the canonical pose toward the chosen image', '');
if (rework.length) {
  lines.push('Each row is a generator brief: take the subject\'s current pose in `docs/triassic/canonical/`,');
  lines.push('regenerate it steered by the image named here, and put the result back through the viewer.');
  lines.push('A reference is somebody else\'s artwork — use it as direction, keep its credit with the prompt,');
  lines.push('and never ship it.', '');
  for (const r of rework.sort((a, b) => a.id.localeCompare(b.id))) {
    const im = r.image ?? {};
    lines.push(`### ${r.name || r.subject.name} \`${r.id}\``, '');
    lines.push(`- **Slot:** ${esc(r.subject.role)} · ${esc(r.subject.len)}`);
    if (im.kind === 'web') {
      lines.push(`- **Steer toward:** ${esc(im.title)}`);
      lines.push(`- **Credit:** ${esc(im.artist) || 'unknown'} · ${esc(im.licence) || 'see file page'}`);
      if (im.page) lines.push(`- **File page:** ${im.page}`);
      if (im.full) lines.push(`- **Full size:** ${im.full}`);
      if (im.description) lines.push(`- **Described as:** ${esc(im.description)}`);
    } else {
      lines.push(`- **Steer toward:** our own \`${esc(im.label ?? r.ref)}\`${im.kind === 'turnaround' ? ' (the four-view modelling sheet)' : ''}${im.src ? ` — \`${esc(im.src)}\`` : ''}`);
    }
    lines.push(`- **Reviewer's note:** ${esc(r.note) || '—'}`);
    lines.push('');
  }
} else lines.push('Nothing queued for rework.');
lines.push('');

lines.push('## Not yet reviewed', '');
lines.push(undecided.length
  ? undecided.sort().map((id) => `\`${id}\``).join(' · ')
  : 'Every subject has been reviewed.');
lines.push('');

if (unknown.length) console.warn(`ignored ${unknown.length} selection(s) for unknown subjects: ${unknown.join(', ')}`);

if (dryRun) {
  console.log(`--dry-run: ${greenlit.length} greenlit, ${rework.length} to redo, ${undecided.length} unreviewed. Nothing written.`);
} else {
  // The manifest is only rewritten when a decision actually moved something: re-serialising it for
  // a pass that changed nothing would reformat the whole file and show up as a diff that says nothing.
  const changed = JSON.stringify(manifest) !== before;
  if (changed) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(REVIEW, `${lines.join('\n')}`);
  console.log(`${greenlit.length} greenlit, ${rework.length} queued for rework, ${undecided.length} still unreviewed`);
  console.log(`wrote ${REVIEW}${changed ? ` and ${MANIFEST}` : `; ${MANIFEST} unchanged`}`);
}
