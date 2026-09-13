/** Snapshot human approvals and verified input hashes before spending generation credits.
 * Bundle with esbuild --platform=node --format=esm, then run from the repo root.
 * Planning only: this script never submits a Tripo job or changes approval state.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { TRIASSIC_CREATURES } from '../../../src/content/triassic/creatures';

const root = process.cwd();
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const hash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest = read('docs/triassic/canonical/manifest.json');
const shipped = new Set(read('tools/triassic/shipped.json').creatures);
const rows = TRIASSIC_CREATURES.filter(c => !shipped.has(c.id)).map(c => {
  const approval = manifest.subjects[c.id];
  const folder = resolve(root, `docs/triassic/canonical/model-inputs/${c.id}`);
  const metaPath = resolve(folder, 'metadata.json');
  let input: string | null = null;
  let inputSha256: string | null = null;
  let blocked: string | null = approval?.canonical === 'greenlit' ? null : 'canonical is not human-greenlit';
  if (!blocked && !existsSync(metaPath)) blocked = 'approved canonical still needs modeling input';
  if (!blocked) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const source = resolve(folder, meta.canonicalSource);
    const image = resolve(folder, meta.input);
    const variant = approval.greenlitImage;
    const expected = resolve(root, `docs/triassic/canonical/${c.id}${variant && variant !== 'canonical' ? '-' + variant : ''}.png`);
    if (source !== expected) blocked = 'modeling input was not derived from the newly selected canonical';
    else if (!existsSync(source) || hash(source) !== meta.canonicalSha256) blocked = 'canonical changed since modeling input was made';
    else if (!existsSync(image) || hash(image) !== meta.inputSha256) blocked = 'modeling input hash mismatch';
    else {
      input = relative(root, image);
      inputSha256 = hash(image);
    }
  }
  return { id: c.id, name: c.name, priority: c.shore ? 'ambient' : 'playable', approval, input, inputSha256, blocked };
}).sort((a,b) => Number(a.priority === 'ambient') - Number(b.priority === 'ambient'));
console.log(JSON.stringify({ createdAt: new Date().toISOString(), estimatedCreditsPerSubmission: 30,
  ready: rows.filter(r => !r.blocked), blocked: rows.filter(r => r.blocked) }, null, 2));
