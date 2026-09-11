# The model queue: staging, and which agent tier each stage needs

Twenty-two creatures carry `model: true` — Odaraia in the Cambrian and twenty-one in the
Devonian. This is how to get through them without paying a high-tier rate for work that does not
need one. Tiers here are **High**, **Medium** and **Low**; they map onto the existing
`docs/devonian/agent-workflow.md` roles (High is that document's Astra, Low is its Terra), and the
boundary it draws still holds — an executor may not replace a creative decision with an automated
fix.

## What changed on 11 September

The Blender hand-off is gone. `npm run blender` installs the pinned 5.2.1 into the session
(`tools/blender-setup.sh`), and the shipped Cheirolepis builder rebuilds there to byte-identical
vertex positions across all 98,012 vertices of the full model, with packaging and
`tools/devonian/check.mjs` passing. Sculpt, materials, rig, Cycles renders, export, packaging and
intake now all run in one place.

That removes the reason the old workflow froze every command into a hash-bound handoff: the
executor was on another machine. Keep the hash discipline where it still earns its place — never
overwrite an archived candidate, always verify an input before rebuilding on it — and drop the
ceremony around commands that now run inline in seconds.

It also moves the cost. Running a builder is 22 seconds and a few hundred tokens. **What costs is
looking.** A single 900×420 clay render is around 1.5k tokens and a six-tile comparison sheet is
nearer 10k, so a stage that iterates on images is expensive however small its diff, and a stage
that only runs commands is cheap however long it takes.

## The stages

| # | Stage | Tier | Why |
| --- | --- | --- | --- |
| 0 | Install Blender, rebuild the current model, confirm it reproduces | **Low** | One command each, PASS/FAIL, no judgement |
| 1 | Read the reference against the sources; write the anatomy brief | **High** | Deciding what the picture legitimately dictates and what the sources overrule. Short output, and the whole rest of the creature is downstream of getting it right |
| 2 | Shape study: edit the profile tables and boundaries, render clay, iterate | **High** | The only way to do this is to look at the render and judge it. Budget 2–4 iterations |
| 3 | Numeric constraints — eye seating, seam continuity, bounds, topology | **High to write once, Low to run** | `redesign-study.py`'s `seating()` is the pattern: author the measure at High, then it is a number anyone can read |
| 4 | **Your acceptance of the clay** | you | The real gate. Nothing downstream should start before it |
| 5 | Materials and textures | **Medium**, or skipped | Keeping the current maps or using stand-ins is agreed. Only a sculpt that changes UV layout forces this |
| 6 | Rig and weights | **Medium**, **High** if joints moved | A silhouette change over an unchanged skeleton re-weights mechanically; new structure does not |
| 7 | The eighteen clips | **Medium**, **High** for new structure | They already exist in the builders and mostly survive. Onychodus' jaw and Nahecaris' limbs are the exceptions |
| 8 | Build, package, `check.mjs`, `catalogue --check`, asset sizes, cards, LODs | **Low** | Deterministic, exact, already scripted |
| 9 | Eye audit and general audits | **Low** to run, **Medium** to interpret | |
| 10 | Look at it in the viewer and from the game camera | **High**, briefly | Two or three screenshots and a verdict. Catches what a clay render at orthographic scale hides |
| 11 | Queue JSON, docs, `WORKING_STATE`, merge to `main` | **Low** | |

## The groups

### A — silhouette only, reference in hand (3)

`cheirolepis`, `cladoselache`, `tiktaalik`. Profile tables and fin boundary polygons over an
unchanged skeleton. High for stages 1, 2 and 10; everything else Medium or Low.

Cheirolepis already has stages 1–3 done in `tools/devonian/creatures/cheirolepis/redesign-study.py`
and is waiting at stage 4.

### B — a face, not a body (2)

`gemuendina`, `dunkleosteus`. Both are accepted models with a narrow remainder — LOD creases and
pigmentation on one, reduced-model colour-space polish on the other. Same tier profile as A over a
smaller diff. These are the cheapest entries in the queue and the most likely to be finished in a
single session each.

### C — new structure (3)

`onychodus` (paired lower tusk whorl, mapped dermal cranial bones), `rhinodipterus` (cranial bone
map, fuller cheek), `nahecaris` (curved shell, jointed limbs, proportionate eyes and antennae).
Geometry that does not exist yet rather than geometry with different numbers, so High reaches
further down: stages 1, 2, 6 and 7.

### D — total reworks already in flight (5)

`titanichthys`, `coccosteus`, `doryaspis`, `bothriolepis`, `stethacanthus`. Four have a
`rework-v3/` tree and they stopped at different places — Titanichthys has its eye and oral
components accepted and needs the final assembly authored; Bothriolepis is at clay01 waiting for
six views and a verdict. **The first job on each is one High read of its `WORKING_STATE.md` to
find the resume point**, because starting a stage that is already done is the most expensive
mistake available here. After that they run the full stage list, High-heavy.

### E — Odaraia (1)

The hardest single item, and only partly a modelling problem: a semi-transparent carapace has to
resolve depth sorting and readability *in the game renderer and in the reduced model*, not in
Blender, and the swimming pose is inverted. High throughout, and stage 10 is a real piece of work
rather than a glance.

### F — the eight with no reference (8)

`acanthostega`, `eldredgeops`, `walliserops`, `jaekelopterus`, `furcaster`, `palaeoisopus`,
`manticoceras`, `michelinoceras`. Their queue entries all say the same thing — "initial preview:
individual anatomy, material, attachment and dynamic action refinements documented in source
README/WORKING_STATE" — which is a placeholder, not a finding. Nobody has looked at them since
they landed.

**Triage these first, in one High pass for all eight.** Rebuild or load each, render a small
sheet, and decide per creature: nothing actually wrong (clear the badge), something small (a
Medium fix), or something real (promote it into group A/B/C with a written brief). Eight of
twenty-two entries resolve for the cost of one sitting, and every one that clears is a creature
that never consumes a stage list at all.

## Order

1. **F triage** — one High pass, clears or scopes eight entries.
2. **Cheirolepis stage 4 onward** — it is already at your gate, and taking one creature all the
   way through the stage list proves the costs before committing to the rest.
3. **B**, then the rest of **A** — cheapest, and they build the Medium recipe the others reuse.
4. **D resume reads**, all five in one High pass, then the reworks in whatever order suits you.
5. **C**, then **E**.

## Keeping High out of cheap work

- **Batch by stage, not by creature.** One High session writes briefs for three creatures; one Low
  session builds, packages and checks all three. Interleaving pays the High rate for the commands.
- **Batch what needs your eye too.** Clay sheets are cheap for me and slow for you, so three
  creatures per sheet beats three sheets.
- **Iterate small, present large.** Judge at 900×420 and 24 samples; render the sheet you actually
  send once.
- **Write the measure, then stop looking.** Anything that can become a number — seating, seam
  continuity, triangle budget, bounds — should be a number after the first time it is judged.
  Stage 3 exists so that stage 2 converges.
- **A stage that ends in PASS/FAIL never needs High.** Stages 0, 8, 9 and 11 are the bulk of the
  wall-clock and almost none of the cost.
- **Stop and hand back rather than improvise.** Unchanged from the old workflow: an unexpected
  error, a changed input hash, a visual or anatomical judgement, or any temptation to edit a
  source, threshold or metadata to make a check pass, goes back up a tier with the evidence.
