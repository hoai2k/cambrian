import { readFile, writeFile, mkdir, copyFile, rename, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const canon = resolve(here, '..');
const root = resolve(canon, '../../..');
const intake = join(root, 'intake/triassic-props-2026-09-19');
const provenance = JSON.parse(await readFile(join(here, 'provenance.json'), 'utf8'));
const reviews = JSON.parse(await readFile(join(here, 'reviews.json'), 'utf8'));
const hash = async p => createHash('sha256').update(await readFile(p)).digest('hex');
await mkdir(join(here, 'native'), { recursive: true });
await mkdir(intake, { recursive: true });
for (const [id, subject] of Object.entries(provenance.subjects)) {
  for (const [i, attempt] of subject.attempts.entries()) {
    const nativeRel = `native/${id}-attempt${i + 1}.png`;
    const native = join(here, nativeRel);
    // Preserve selected and rejected native generations, without touching their originals.
    if (!(await access(native).then(() => true, () => false))) await copyFile(attempt.generatedSource, native);
    const meta = await sharp(native).metadata();
    Object.assign(attempt, { native: nativeRel, sha256: await hash(native), dimensions: [meta.width, meta.height] });
  }
  const selected = subject.attempts[subject.selectedAttempt - 1];
  const inputDir = join(canon, `model-inputs/${id}`);
  await mkdir(inputDir, { recursive: true });
  const staged = join(intake, `${id}-input.png`);
  await sharp(join(here, selected.native)).resize(2048, 2048, { kernel: 'lanczos3' }).png().toFile(staged);
  await rename(staged, join(inputDir, 'input.png'));
  const corrected = !['bjuvia', 'pleuromeia'].includes(id);
  if (corrected) await copyFile(join(inputDir, 'input.png'), join(canon, subject.canonical));
  await copyFile(join(canon, subject.canonical), join(inputDir, 'canonical.png'));
  const original = join(canon, subject.original);
  const inputHash = await hash(join(inputDir, 'input.png'));
  subject.inputSha256 = inputHash;
  subject.originalSha256 = await hash(original);
  const metadata = {
    schemaVersion: 1, createdAt: provenance.createdAt, task: 'T3D-10A',
    canonicalStatus: corrected ? 'agent-reviewed-candidate' : 'approved-design-ground-free-derivative',
    humanApprovalClaimed: false,
    canonical: 'canonical.png', canonicalSource: `../../${subject.canonical}`,
    canonicalSha256: await hash(join(inputDir, 'canonical.png')),
    input: 'input.png', inputSha256: inputHash, dimensions: [2048, 2048],
    nativeInput: `../../prop-inputs-2026-09-19/${selected.native}`,
    nativeDimensions: selected.dimensions,
    resolutionProcessing: 'Lanczos3 resampling from the native 1254-square ImageGen output; not native 2048 detail.',
    original: `../../${subject.original}`, originalSha256: subject.originalSha256,
    generator: provenance.tool, inputPrompt: selected.prompt,
    provenance: '../../prop-inputs-2026-09-19/provenance.json',
    review: reviews[id], tripoSubmitted: false,
    ...(provenance.downstreamApproval ? { downstreamApproval: provenance.downstreamApproval } : {}),
  };
  await writeFile(join(inputDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
}
await writeFile(join(here, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log('Packaged seven 2048-square inputs, five corrected candidates, native attempts and provenance.');
