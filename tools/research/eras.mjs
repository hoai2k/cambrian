/**
 * The eras that have a reference viewer, and where each one keeps its parts.
 *
 * The viewer began as a Triassic page with the era's paths written through it. It is the same
 * review for any era — our picture of an animal beside other people's, and a human choosing — so
 * the page, the bundler and the image fetcher now take the era as an argument and this is the one
 * place that knows what that means.
 *
 * `canon` may not exist yet: an era earns a canonical directory when its first pose is drawn, and
 * the bundler is happy to find nothing there. `models` is how the viewer shows the body we have
 * actually built, in front of the pose it was built from.
 */
export const ERAS = {
  triassic: {
    id: 'triassic',
    name: 'Triassic',
    /** Where the greenlit poses live, relative to the repository root. */
    canon: 'docs/triassic/canonical',
    /** The viewer's own directory: subjects, fetched references, generated page. */
    data: 'docs/research/triassic/viewer',
    /** The deployed copy, which Vite ships into dist/. */
    deploy: 'public/research/triassic',
    /** Rebuild and apply-decisions commands, quoted back to the reviewer by the page. */
    viewerCmd: 'npm run triassic:viewer',
    applyCmd: 'node tools/triassic/apply-selections.mjs <this file>',
    /** Model-rendered portraits, so a delivered body can sit beside its canonical pose. */
    models: { dir: 'public/assets/triassic/creatures', shipped: 'tools/triassic/shipped.json' },
  },
  devonian: {
    id: 'devonian',
    name: 'Devonian',
    canon: 'docs/devonian/canonical',
    data: 'docs/research/devonian/viewer',
    deploy: 'public/research/devonian',
    viewerCmd: 'npm run devonian:viewer',
    // The Devonian's bodies are already built and its poses are being drawn to update them
    // against, so there is nothing to apply yet. The export still carries its era, so the day an
    // applier exists it can refuse a file from the wrong one.
    applyCmd: 'node tools/devonian/apply-selections.mjs <this file>',
    models: { dir: 'public/assets/devonian/creatures', shipped: 'tools/devonian/shipped.json' },
  },
};

/** Resolve the era named on the command line, with a usage error that lists the real choices. */
export function eraFromArgv(argv, script) {
  const id = argv.find((a) => !a.startsWith('-'));
  if (!id || !ERAS[id]) {
    console.error(`usage: node ${script} <${Object.keys(ERAS).join('|')}> [options]`);
    process.exit(2);
  }
  return ERAS[id];
}
