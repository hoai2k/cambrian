# Model queue — working state

The resume point for `docs/model-queue-plan.md`. Updated after every meaningful step and merged
to `main`, so a session that runs out can be picked up from here without the conversation.

## Environment

- `npm run blender` installs Blender 5.2.1 at `/opt/blender` (about half a minute). Run it first.
- Shipped GLBs are meshopt-compressed; Blender's importer cannot read them. Decode first:
  `npx @gltf-transform/cli cp in.glb out.glb`.
- Scratch renders go in the session scratchpad, never in the repo. Only decisions are committed.

## Progress

| Step | Status | Where it stands |
| --- | --- | --- |
| F triage (8 no-reference creatures) | **done** | 3 cleared, 2 small, 3 promoted — see below |
| Cheirolepis from stage 4 | waiting on user | study at `tools/devonian/creatures/cheirolepis/redesign-study.py` |
| B (gemuendina, dunkleosteus) | not started | |
| A (cladoselache, tiktaalik) | not started | |
| D resume reads | not started | |
| C (onychodus, rhinodipterus, nahecaris) | not started | |
| E (odaraia) | not started | |

## F triage

Per creature: what the source README/WORKING_STATE says is outstanding, what the render shows,
and the verdict — **clear** (nothing wrong, drop `model: true`), **small** (a Medium fix, scoped
here), or **promote** (a real problem, written brief, joins A/B/C).

| Creature | Source says | Render shows | Verdict |
| --- | --- | --- | --- |
| acanthostega | wrist/palm/web intersections, orbital contour, skull sutures, tail-ray relief deferred | Tail fin is a solid paddle fused on the tail tip rather than a fin running the tail's length above and below; trunk a constant round tube (should be flat-bellied, wider than deep); limbs attach as sticks. Head and eight digits are right | **promote** → group A brief |
| eldredgeops | enrollment coaptation, occipital joint opens in deep flexion, antenna tips outside at curl | Model reads well: cephalon, schizochroal lens arrays, tergites, limbs. The Ability midpoint shows the occipital joint gap the source describes | **small** — re-weight the occipital joint, tuck antennae; rig only |
| walliserops | spine-root sculpt, pigment balance, spine/appendage clearance | Trident, genal and pleural spines, eyes all read; pale but coherent | **clear** — badge dropped, clips still queued |
| jaekelopterus | eye optics, gait articulation, cuticle readability | Opisthosoma a uniform taper of rounded rings (should be flattened, broad preabdomen stepping to narrow postabdomen); chelicerae are rounded tubes (rami were slender and toothed); flat beige material | **promote** → group A brief |
| furcaster | disc/arm-root sculpt, ossicle comparison, arm clearance | Pentagonal disc, five spined arms, curls in Ability; reads as a brittle star | **clear** — badge dropped, clips still queued |
| palaeoisopus | (preview scope only) | Every leg and trunk segment a beaded lozenge with dark joint bands; reads as strung olives. Palaeoisopus' defining feature — flattened, oar-like leg segments — is absent | **promote** → group A brief |
| manticoceras | shell-section fitting, arm-root variation, mantle folds | Umbilicus open to ~⅓ of the diameter with inner whorls showing; the README's own source says narrow discoidal, small umbilicus. Arms and head fine | **small** — raise whorl overlap; parametric |
| michelinoceras | arm-root fusion, arm/arm contact in crossfades | Smooth 7° orthocone, banded, ten arms, compact head; reads correctly | **clear** — badge dropped, clips still queued |

Outcome: three badges cleared (walliserops, furcaster, michelinoceras), two scoped as Medium fixes
(eldredgeops rig, manticoceras shell parameter), three promoted with briefs in their queue `reason`
(acanthostega, jaekelopterus, palaeoisopus — all silhouette work over an unchanged skeleton, so
group A). `model-status.json` mirrors the change; `npm run eras` and `npm run devonian` pass.

Triage renders were 720×450 Cycles, five views each (bind lateral/dorsal/three-quarter/head plus
the Ability midpoint), from the decoded shipped GLBs, via `tools/devonian/triage-render.py`.
The sheets for the three promoted creatures were sent to the user.

## Next

1. User looks at the three promoted sheets and the Cheirolepis study; says which first.
2. Group A is now cheirolepis, cladoselache, tiktaalik, acanthostega, jaekelopterus, palaeoisopus.
3. The two Medium fixes (eldredgeops, manticoceras) can run any time as a Low/Medium batch.
