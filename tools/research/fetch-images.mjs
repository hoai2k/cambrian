/**
 * Collects reference images for every subject in an era's `subjects.json` from Wikimedia Commons
 * and writes that era's `images.json`, which the viewer reads. Research tooling: the images are
 * hotlinked from upload.wikimedia.org at 900 px, with the artist and licence carried beside each
 * one, so the directory stays a few hundred kilobytes rather than forty megabytes.
 *
 *   node tools/research/fetch-images.mjs triassic            # refresh that era's images.json
 *   node tools/research/fetch-images.mjs devonian --local    # also download into img/
 *
 * Re-runnable, and careful about it: a refresh never deletes a subject's pictures (see `previous`
 * below) and never re-adds one a reviewer has rejected (see `rejected`). Nothing here ships.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eraFromArgv } from './eras.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const era = eraFromArgv(process.argv.slice(2), 'tools/research/fetch-images.mjs');
const HERE = join(ROOT, era.data);
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA = 'https://en.wikipedia.org/w/api.php';
const PER_SUBJECT = 8;
const LOCAL = process.argv.includes('--local');

/** curl, because it already honours the sandbox's proxy and CA bundle. */
/**
 * Commons rate-limits, and it answers a burst with an HTML "You are making too many requests"
 * page rather than JSON — which parses as an error, fails the subject, and empties its images.
 * Asking for reconstructions as well as the plain name tripled the call count and tripped exactly
 * that, so every call now waits its turn.
 */
let nextCall = 0;
const THROTTLE_MS = 350;
async function api(base, params) {
  const wait = nextCall - Date.now();
  nextCall = Math.max(Date.now(), nextCall) + THROTTLE_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { stdout } = await run('curl', ['-sS', '--max-time', '40', '-H', 'User-Agent: cambrian-research/1.0', url], { maxBuffer: 64 << 20 });
      return JSON.parse(stdout);
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
}

/** Filenames that are never a picture of the animal. */
const REJECT = /(locator|location|map|cladogram|phylogen|stratigraph|timeline|chart|logo|icon|barnstar|wikispecies|commons-|disambig|question_book|edit-|ambox|crystal|nuvola|flag_of|coat_of_arms|signature|portal|spoken)/i;
/** Diagrams worth keeping despite being drawings rather than photographs. */
const SIZE_PLATE = /(size|scale|comparison|chart_of|silhouette)/i;
// What this page is actually for is somebody's picture of the LIVING animal or plant. Fossils are
// evidence and worth having, but they are not the thing a canonical pose is drawn from, and for the
// plants and the invertebrates Commons is overwhelmingly fossils — so a bare slab used to outrank a
// restoration on filename length alone and the reference column filled up with rock. Restorations
// now lead by a wide margin, and a specimen that is *only* a specimen is scored below them.
const GOOD = [
  [/(_bw\.|_nt\.|nobu|tamura|restoration|reconstruction|life_|lifestyle|pareidolia|artwork|paleoart|_db\.)/i, 70],
  // The rest of the palaeoart vocabulary: illustrators' own naming, and the words used for plant
  // and invertebrate reconstructions, which the list above was built for vertebrates and missed.
  // No "impression" here: on Commons that word is far more often a *fossil* impression in rock
  // than an artist's impression, and it pulled slabs to the top of the plant subjects.
  [/(restored|reconstr|artist|illustration|painting|drawing|render|in_life|alive|living|habitus|diorama|mural|model_of|museum_model|sculpture|animatronic)/i, 55],
  [/(ecosystem|environment|habitat|seascape|landscape|scene|fauna_of|flora_of|biota)/i, 30],
  [/(skeleton|skeletal|mounted|holotype|specimen|fossil|slab)/i, 12],
  [/(skull|jaw|tooth|teeth|dentition|whorl|carapace|shell|limb|flipper|neck)/i, 22],
  [/(museum|naturkunde|naturhistor|senckenberg|nhm|smithsonian|paleontolog)/i, 14],
  [SIZE_PLATE, 18],
];

function score(title, info, subject) {
  const name = title.replace(/^File:/, '');
  if (REJECT.test(name)) return -1;
  const ext = name.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp', 'svg', 'tif', 'tiff'].includes(ext)) return -1;
  if (ext === 'svg' && !SIZE_PLATE.test(name)) return -1;             // svg is usually a diagram
  if ((info.width ?? 0) < 380 && ext !== 'svg') return -1;
  // The picture has to be OF this subject. Without this a restoration of some other plant scored
  // above a correctly identified fossil of this one — "Reconstruction of Cycadeoidea life.jpg" led
  // the dasyclad alga — because the restoration bonus outweighed the name match. Precision matters
  // more than volume on a reference board: a wrong animal is worse than one picture fewer.
  let s = 0;
  const genus = subject.name.split(/[\s/]/)[0].toLowerCase();
  const lower = name.toLowerCase();
  if (lower.includes(genus)) s += 60;
  else if (lower.includes(subject.id.split('-')[0])) s += 30;
  else return -1;
  for (const [re, points] of GOOD) if (re.test(name)) s += points;
  s += Math.min(12, Math.round((info.width ?? 0) / 400));             // prefer larger originals
  return s;
}

const plain = (html) => (html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);

async function candidates(subject) {
  const titles = new Set();
  // Three searches, not one. The plain name returns what Commons has most of, which for these
  // subjects is fossils; the other two ask for the picture we actually want by name, so a
  // restoration that exists is found even where rock outnumbers it twenty to one.
  for (const q of [subject.search, `${subject.search} reconstruction`, `${subject.search} life restoration`]) {
    try {
      const search = await api(COMMONS, { action: 'query', list: 'search', srsearch: q, srnamespace: '6', srlimit: '40' });
      for (const hit of search?.query?.search ?? []) titles.add(hit.title);
    } catch (err) {
      console.error(`  ~ ${subject.id}: search "${q}" failed (${err.message}); keeping the rest`);
    }
  }
  if (subject.wiki) {
    const page = await api(WIKIPEDIA, { action: 'query', prop: 'images', titles: subject.wiki, imlimit: '60' });
    for (const p of page?.query?.pages ?? []) for (const im of p.images ?? []) titles.add(im.title);
  }
  return [...titles];
}

async function imageInfo(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const res = await api(COMMONS, {
      action: 'query', titles: batch.join('|'), prop: 'imageinfo',
      iiprop: 'url|size|extmetadata', iiurlwidth: '900',
    });
    for (const p of res?.query?.pages ?? []) {
      const info = p.imageinfo?.[0];
      if (info) out.push({ title: p.title, info });
    }
  }
  return out;
}

const subjectsFile = JSON.parse(await readFile(join(HERE, 'subjects.json'), 'utf8'));
/**
 * What we already have, by subject id. A refresh that comes back empty for a subject — throttled,
 * offline, a search that changed under us — keeps the previous pictures rather than deleting them:
 * this file is reviewed art direction, and losing it to a transient network answer is worse than
 * having it a week stale.
 */
/**
 * Pictures a reviewer has thrown out, by subject. They are not offered again: the slot goes to the
 * next candidate down, so each round is a better board than the last rather than the same one
 * reshuffled. Written by tools/research/apply-rejections.mjs from a viewer export.
 */
let rejected = new Map();
try {
  const raw = JSON.parse(await readFile(join(HERE, 'rejected.json'), 'utf8'));
  rejected = new Map(Object.entries(raw).map(([id, titles]) => [id, new Set(titles)]));
} catch { /* nothing rejected yet */ }

const previous = new Map();
try {
  const old = JSON.parse(await readFile(join(HERE, 'images.json'), 'utf8'));
  for (const g of old.groups ?? []) for (const s of g.subjects ?? []) if (s.images?.length) previous.set(s.id, s.images);
} catch { /* first run */ }
const result = { generated: new Date().toISOString().slice(0, 10), source: 'Wikimedia Commons', groups: [] };
let total = 0, empty = [];

for (const group of subjectsFile.groups) {
  const outGroup = { ...group, subjects: [] };
  for (const subject of group.subjects) {
    let picks = [];
    try {
      const infos = await imageInfo(await candidates(subject));
      const no = rejected.get(subject.id);
      picks = infos
        .map((x) => ({ ...x, s: score(x.title, x.info, subject) }))
        .filter((x) => x.s > 0)
        // A rejected title is treated as though Commons did not hold it.
        .filter((x) => !no?.has(x.title.replace(/^File:/, '').replace(/_/g, ' ')))
        .sort((a, b) => b.s - a.s)
        .slice(0, PER_SUBJECT)
        .map(({ title, info, s }) => {
          const meta = info.extmetadata ?? {};
          return {
            title: title.replace(/^File:/, '').replace(/_/g, ' '),
            thumb: info.thumburl ?? info.url,
            full: info.url,
            page: info.descriptionurl,
            width: info.width, height: info.height,
            artist: plain(meta.Artist?.value) || 'unknown',
            licence: plain(meta.LicenseShortName?.value) || 'see file page',
            description: plain(meta.ImageDescription?.value),
            rank: s,
          };
        });
    } catch (err) {
      console.error(`  ! ${subject.id}: ${err.message}`);
    }
    // Keep what we had rather than write an empty list over it (see `previous` above).
    let kept = false;
    if (!picks.length && previous.has(subject.id)) { picks = previous.get(subject.id); kept = true; }
    if (!picks.length) empty.push(subject.id);
    total += picks.length;
    const dropped = rejected.get(subject.id)?.size ?? 0;
    console.log(`${subject.id.padEnd(24)} ${String(picks.length).padStart(2)} images${kept ? ' (kept, refresh found none)' : ''}${dropped ? ` · ${dropped} rejected` : ''}`);
    outGroup.subjects.push({ ...subject, images: picks });
  }
  result.groups.push(outGroup);
}

if (LOCAL) {
  await mkdir(join(HERE, 'img'), { recursive: true });
  for (const g of result.groups) for (const s of g.subjects) {
    for (const [i, im] of s.images.entries()) {
      const file = `${s.id}-${i}.jpg`;
      try {
        await run('curl', ['-sS', '--max-time', '60', '-H', 'User-Agent: cambrian-research/1.0', '-o', join(HERE, 'img', file), im.thumb]);
        im.local = `img/${file}`;
      } catch { /* keep the hotlink */ }
    }
  }
}

await writeFile(join(HERE, 'images.json'), JSON.stringify(result, null, 1));
console.log(`\n${total} images across ${result.groups.reduce((n, g) => n + g.subjects.length, 0)} subjects`);
if (empty.length) console.log(`no images found for: ${empty.join(', ')}`);
