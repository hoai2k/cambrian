/**
 * Collects reference images for every Triassic subject in `subjects.json` from Wikimedia
 * Commons and writes `images.json`, which the viewer reads. Research tooling: the images are
 * hotlinked from upload.wikimedia.org at 900 px, with the artist and licence carried beside each
 * one, so this directory stays a few hundred kilobytes rather than forty megabytes.
 *
 *   node docs/research/triassic/viewer/fetch-images.mjs            # refresh images.json
 *   node docs/research/triassic/viewer/fetch-images.mjs --local    # also download into img/
 *
 * Re-runnable. Nothing here is shipped with the game.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA = 'https://en.wikipedia.org/w/api.php';
const PER_SUBJECT = 8;
const LOCAL = process.argv.includes('--local');

/** curl, because it already honours the sandbox's proxy and CA bundle. */
async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { stdout } = await run('curl', ['-sS', '--max-time', '40', '-H', 'User-Agent: cambrian-triassic-research/1.0', url], { maxBuffer: 64 << 20 });
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
const GOOD = [
  [/(_bw\.|_nt\.|nobu|tamura|restoration|reconstruction|life_|lifestyle|pareidolia|artwork|paleoart|_db\.)/i, 40],
  [/(skeleton|skeletal|mounted|holotype|specimen|fossil|slab)/i, 30],
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
  let s = 0;
  const genus = subject.name.split(/[\s/]/)[0].toLowerCase();
  if (name.toLowerCase().includes(genus)) s += 60;
  else if (name.toLowerCase().includes(subject.id.split('-')[0])) s += 30;
  for (const [re, points] of GOOD) if (re.test(name)) s += points;
  s += Math.min(12, Math.round((info.width ?? 0) / 400));             // prefer larger originals
  return s;
}

const plain = (html) => (html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);

async function candidates(subject) {
  const titles = new Set();
  const search = await api(COMMONS, { action: 'query', list: 'search', srsearch: subject.search, srnamespace: '6', srlimit: '40' });
  for (const hit of search?.query?.search ?? []) titles.add(hit.title);
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
const result = { generated: new Date().toISOString().slice(0, 10), source: 'Wikimedia Commons', groups: [] };
let total = 0, empty = [];

for (const group of subjectsFile.groups) {
  const outGroup = { ...group, subjects: [] };
  for (const subject of group.subjects) {
    let picks = [];
    try {
      const infos = await imageInfo(await candidates(subject));
      picks = infos
        .map((x) => ({ ...x, s: score(x.title, x.info, subject) }))
        .filter((x) => x.s > 0)
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
    if (!picks.length) empty.push(subject.id);
    total += picks.length;
    console.log(`${subject.id.padEnd(24)} ${String(picks.length).padStart(2)} images`);
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
        await run('curl', ['-sS', '--max-time', '60', '-H', 'User-Agent: cambrian-triassic-research/1.0', '-o', join(HERE, 'img', file), im.thumb]);
        im.local = `img/${file}`;
      } catch { /* keep the hotlink */ }
    }
  }
}

await writeFile(join(HERE, 'images.json'), JSON.stringify(result, null, 1));
console.log(`\n${total} images across ${result.groups.reduce((n, g) => n + g.subjects.length, 0)} subjects`);
if (empty.length) console.log(`no images found for: ${empty.join(', ')}`);
