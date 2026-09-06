# Hallucigenia flexible motion

The revised model has a continuous bending body performance, a flexible neck, narrow black slit-shaped eyes, and individual pivots for its fourteen dorsal spines. Three added neck stations blend into the original body weights. All existing mouth and attack socket names and metadata remain available.

Crawl uses a wave of alternating support and recovery steps along seven leg pairs, with a 65% support phase, a 0.28-unit stride and a 0.18-unit foot lift in source coordinates. The body follows an integrated curve with conserved centerline arc length, combining side-to-side movement and vertical bends. The neck lifts for attack preparation and bends forward into contact; feeding tentacles extend and curl. Spine bases follow the curved body while each spine fans and tilts with an offset phase. This is an artistic game performance, including the requested slit eyes and defensive spine motion.

All eighteen full-detail clip names remain, with the revised performance baked into the existing durations. Idle and Crawl close smoothly. The distant model retains Crawl, Idle and Death, with the same rig and eleven attachment sockets. Ground contact is authored for a level surface; this is a baked stepping gait, not a terrain-aware runtime foot solver.

## Verification

Run `node tools/hallucigenia-test.mjs` from the repo root. It loads both exported GLBs with Three.js and checks finite/bounded skinning over every clip, Idle/Crawl loop seams, foot lift and stride ranges, support phases, staggered leg timing, new rig controls and socket preservation. Texture decoding is stubbed for the headless test; the actual material appearance is reviewed separately in Blender renders.

Also run `npm run typecheck`, `npm run build`, `npm run check -- --strict`, and the existing anchor/feeding tests. The LOD command now accepts a specimen filter: `npm run lods -- hallucigenia` regenerates only this creature. LOD pruning preserves nodes carrying attachment metadata.

Original assets, editable Blender source, baking/packaging scripts, validation records and a walking preview are preserved outside the uploaded runtime in the local `cambrian/local/hallucigenia-work/` authoring directory.
