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
| Cheirolepis | **shipped V3** (face pass 4, seated fins) | `build_v3.py` — package PASS, check PASS, eye audit 82.5/82.3 (V2 80.1/79.9). Comparison sheet sent. On yes: point `build.py` at v3, package into public/, regenerate validation.json, viewer look |
| F small fixes (eldredgeops rig, manticoceras umbilicus) | **done — user approved 12 Sep, integrated, badges cleared** | Both Medium (Sonnet) jobs delivered: manticoceras `build.py` INVOL=.85 (umbilicus 30%→9.4%, aperture/anchors unchanged; INVOL=.53 reproduces the shipped shell exactly); eldredgeops `build_v3.py` blends tergite_01's front rows onto the cephalon (gap closed; antenna tips at the rolled peak left open — a choreography redesign, not a value). Both package+check PASS on candidates. Not in public/: integration into shipped assets needs the user's go, and this session's auto-mode blocks writes to public/assets anyway. Candidates rebuild in about a minute from the committed builders; eldredgeops' `validate.py` is hardcoded to v2/candidate and needs its path parameterised before its v3 can go through the normal finish |
| B (gemuendina, dunkleosteus) | **done** | accepted as published; Dunkleosteus LOD builder fix in `build_v2.py` |
| A (acanthostega, jaekelopterus, palaeoisopus, cladoselache, tiktaalik) | **done — all shipped** | Acanthostega V2, Jaekelopterus V2, Palaeoisopus V2, Cladoselache V3, Tiktaalik V3 |
| D (titanichthys, gemuendina, coccosteus, doryaspis, bothriolepis, stethacanthus) | 4 done, 2 blocked | Titanichthys/Gemuendina accepted; **Stethacanthus V3 and Bothriolepis V3 shipped**; Coccosteus and Doryaspis wait on the user |
| C (onychodus, rhinodipterus, nahecaris) | **done — all shipped** | Onychodus V2, Rhinodipterus V3, Nahecaris V2 |
| E (odaraia) | **candidate complete — one blocked step** | rig, 18 clips, LOD, export, validation, renderer fixes all done; `rework-v3/integrate_v3.sh` writes it into `public/assets/creatures/`, which this session's auto mode refuses — needs the user to run it or grant the write |

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

## Cheirolepis face pass and fin roots — 11 September, late

The user judged V3's face against the reference: not there. Blunt deep snout, flat dorsal line,
deep mandible under a descending mouth line with lips, eye high, cheek relief. And they saw fins
floating: measured, every fin root in V2/V3 sits at or outside the trunk (pectoral +0.07, pelvic
+0.31, dorsal trailing edge +0.17, anal trailing edge +0.26 on the section-ellipse metric, where
<0 is inside). Study in the scratchpad `face/study.py` (port into the creature dir when
accepted): `seat()` pulls fin origins and base controls radially inside to −0.18/−0.14; the face
tables are in `FACE`; the eye is placed by the proxy search at (.155,−2.03,.150) r(.058,.092,.085)
= 0.607 (V2 shipped 0.661 ≡ 80% real). Next: user verdict on the face sheet; then port into
`build_v3.py` — also extend `fin()`'s body-bone weight blend to pectoral/pelvic so seated roots
stay attached under tail bends.

## Resume reads for the six reworks — 12 September (Explore agent, verified against the files)

| Creature | Stage reached | Blocker | Remaining |
| --- | --- | --- | --- |
| titanichthys | candidate08 accepted and published as preview (`rework-v3/RELEASE08-ART-VERDICT.md`) | none — user has not yet looked | cosmetic LOD/controller polish; show the user, clear the badge on a yes |
| gemuendina | face-v4 candidate05 accepted and published (`face-v4/TERMINAL_SNOUT_STATE.md`) | none — user has not yet looked | LOD chin/cheek creases, pigment; show the user, clear on a yes |
| coccosteus | candidate07 full/LOD surface PASS, not packaged (`rework-v3/HANDOFF-CANDIDATE07-PAUSE.md`) | paused by user; steps 1–3 (oral/eye sweep recipe → playback/LOD-switch check → package) not run | ~3, mostly Low/Medium |
| doryaspis | clay01 reviewed, **HOLD** (`rework-v3/root-review-clay01.md`) | the user's "mouth below the snout" vs the primary reconstruction's mouth above the pseudorostrum — a creative call the user must make | clay02 → materials → rig → audits → package |
| bothriolepis | **shipped V3** 12 Sep (M05b + `build_v3.py`) | — | flat snout fan reads as a facet under raking light: a clay-stage cap-ring change, if ever |
| stethacanthus | **shipped V3** 12 Sep (`build_v3.py` + `finalize_v3.py`) | — | — |

All handoffs use Mac paths (`/Applications/Blender.app/...`, `/Users/hoai/.../expansion-repo`); rewrite to `/opt/blender/blender` and `/home/user/cambrian`. Every `../devonian-authoring/...` output directory they cite does not exist here and must be re-derived, never assumed. Frozen candidate directories are immutable.

## Cheirolepis face — passes 2–4 sent 12 September, waiting on the user's pick

Study: scratchpad `face/study2.py` (port the chosen `FACE<n>` dict into `build_v3.py`'s HEAD table,
eye, and the `hp()` lip/brow terms). Pass 4 = FACE4: head stations
`[(-2.41,.008,.008,.008,.018),(-2.35,.130,.140,.110,.020),(-2.27,.200,.225,.150,.008),(-2.12,.240,.278,.190,-.012),(-2.00,.250,.280,.205,-.026),(-1.80,.286,.302,.255,-.050),(-1.50,.314,.352,.300,-.062),(-1.16,.320,.400,.330,0)]`,
eye `(.160,-2.03,.150)` r `(.058,.092,.085)` (proxy 0.633; V2 shipped 0.661 ≡ 80% audit), lip ridge
`.055·exp(-(sin a/.20)²)` along the mouth line, brow `.12` on a ledge over `|cos a|∈[.20,.32]…[.78,.90]`
and `y∈[-2.32,-2.16]…[-1.94,-1.76]`, crown flattened `-.045` over `|cos a|<.30` in the same band.
The -2.41 nose station is what closes the mouth; the head shells must stay outer+inner stitched.

## Group A geometry maps — 12 September (Explore agent)

- **acanthostega** `anatomy_v1.py`: trunk+tail are one loft over `SEC` rows `(y,w,h,z)` via `surf(y,a)`;
  the "paddle" is the late `h` spike at y 2.5–4.5. Lever: sustain `h` from y≈1.1 to the tip, keep `w`
  thin, flatten the ventral half in `surf()` (the `s<0` branch), widen `w:h` for the flat belly; add
  `tube()` ray strokes. Limbs: `limbPoint`/`centers`/`widths`/`depths`; palm is a bolt-on `ell()` — loft
  it from the limb's last ring instead. UV.v ≡ y-station (`materials_v1.py:14`): keep the y-range
  -2.2..5.0 or mirror the change there. `check-pose-attachments.py` asserts fin-root centroids buried.
- **jaekelopterus** `build.py`: `segs` table (12 rows y,w,h) + `shellpoint()`; lever: hold w through
  segments 0–5 then step down, strengthen ventral flattening; chelicerae rami are `tube(..., flat=.77)` —
  drop `flat` to ~.35, lengthen, densify denticles. Eyes sample `hp(y,a)` — do not reshape the head.
  Vertex-colour shading keys off world z (`materials.py:24-30`): retune if the body flattens.
- **palaeoisopus** `anatomy_v1.py`: every segment is `shell()` with a `bulge` swelling and `ball()`
  joint spheres (the dark bands); lever: bulge→0, flatter taper, superellipse exponent so sections
  become blades, trunk w:d from 2.4:1 to a plate; drop or re-material the `ball()`s.
  `check-articulation.py` needs bone chains contiguous to 2e-5 — keep `art()` head/tail points.

## 12 September, later — where everything stands

Sent for approval, awaiting the user: Cheirolepis face (passes 2/3/4; pass 4 recommended),
Titanichthys and Gemuendina (published reworks nobody had approved), Acanthostega study (tail
core+web+rays, flat belly, fuller limbs — scratchpad `acan/study.py` NEW2), Palaeoisopus study
(oar blades, knuckles, flat trunk — `pala/study.py` NEW pass 2), Jaekelopterus study (stepped
flattened opisthosoma, blade rami — `jaek/study.py` NEW), Dunkleosteus LOD (builder fix; shipped
asset already fine — `build_v2.py` committed, candidate not needed in public).

Blocked and needs the user: **Coccosteus** (two evidence files exist only on the Mac; simplest
unblock is to drop candidate07's two GLBs into the repo — see
`tools/devonian/creatures/coccosteus/rework-v3/RESUME-CANDIDATE07-BLOCKED.md`); **Doryaspis**
(the mouth position call: the user asked for the mouth below the snout, the primary
reconstruction puts it above the fixed pseudorostrum — `rework-v3/root-review-clay01.md`).

Not started: Stethacanthus rework, Bothriolepis M05, group C (onychodus, rhinodipterus,
nahecaris), Cladoselache and Tiktaalik studies, Odaraia.

Studies live in the session scratchpad and die with it; the parameters that matter are in this
file and the scripts are ~150 lines each following `tools/devonian/creatures/cheirolepis/redesign-study.py`.

## 12 September, evening — the user approved everything for this pass; shipping

Shipped to public and badge cleared: **Cheirolepis V3** (face + seated fins), **Palaeoisopus V2**
(oar blades), **Jaekelopterus V2** (stepped flat opisthosoma, blade rami), **Cladoselache V3**
(fin outlines), plus Manticoceras/Eldredgeops earlier. Badges also cleared on acceptance as shipped:
Titanichthys, Gemuendina, Dunkleosteus (builder fix only).

Ports in flight (Sonnet agents, candidates → `scratchpad/<id>-port/cand/<id>/`, portraits in
`/home/user/devonian-authoring/<id>/<vN>-candidate/`): **Acanthostega** (one hind-limb root pose
to seat, then ship), **Tiktaalik** (oral-tube front width .63→.52 to match the new snout, then
ship), **Onychodus**, **Rhinodipterus**, **Nahecaris** (group C studies approved by the "continue
to the end" instruction; studies in `scratchpad/onyc|rhin|nahe/study.py`).

Integration is `scratchpad/integrate.sh <id> <packaged dir> <portrait dir>` then a README section,
`git add` by path, commit, merge to main. Every builder keeps its previous version reproducible;
the shipped one is the highest version present (build.py runs it for cheirolepis; PAL_ANATOMY
defaults to v2 for palaeoisopus; the others document it in their README).

Still open after these: Stethacanthus rework (not started), Bothriolepis M05, Odaraia; blocked
on the user: Coccosteus (evidence files), Doryaspis (mouth call).

## 12 September, night — groups A and C and Stethacanthus shipped; the two re-derivations

Shipped to public and badge cleared, each with a README section, packaged losslessly, structural
intake and the catalogue/eras/devonian checks passing: **Acanthostega V2** (`anatomy_v2.py`,
`ACA_ANATOMY` defaults to v2; tail fin core+web+rays down the tail, flat belly, fuller limbs;
pose-attachment selector `.10<|x|<.32` so it tests the limb roots rather than the ray cores),
**Tiktaalik V3** (`anatomy_v3.py`/`build_v3.py`/`materials_v3.py`; oral tube front ring reads
`SEC[0][1]` so it follows the new snout), **Onychodus V2** (`build_v2.py`; tooth whorl at
`(±.105,-2.28,.070)`, tusks `[.17,.20,.19,.16]`, eye 73%), **Rhinodipterus V3** (`build-v3.py`,
eye inset .036 — .058 buried the globe — audit 93.4%; `finalize-v3.py` must run before packaging),
**Nahecaris V2** (`build_v2.py`, abdomen a straight overlapping chain that the rig curves;
portraits from `portraits_v2.py`), **Stethacanthus V3** (`build_v3.py`; deeper head and trunk,
pectoral tips at x=±1.27, broad-rooted brush, heterocercal caudal to z=1.00; eye 91.4/91.2;
`finalize_v3.py` then `package.mjs` then `portraits_v3.py`). Twelve model badges cleared this
pass in all; `pending-refinements.json` now carries only Coccosteus, Doryaspis, Bothriolepis
(Devonian) and Odaraia (Cambrian) as `model: true`.

**Blender 5.2.1 exporter artifact, seen three times** (Jaekelopterus, Rhinodipterus, Stethacanthus):
`export_optimize_animation_keep_anim_armature` defaults on and keeps a constant per-bone scale
track that can be one float32 ULP off identity (Stethacanthus `tail_tip` = `(1, 0.99999994, 1)`),
and `check.mjs` refuses it as a non-identity scale. Either export with that option `False` or run
a finalize script that strips identity scale tracks and root channels (the rhinodipterus /
stethacanthus `finalize*` scripts are the pattern). Rebuilding an untouched v2 builder here
reproduces the artifact, so it is the toolchain, not the port. Similarly the EXACT boolean can
leave a branched seam where a cutter grazes a cap; a `remove_doubles` scoped to that band fixes it.

**Odaraia**: clay02 and material02 re-derived on Linux (`rework-v3/*-linux.py` wrappers, frozen
input hashes verified; the clay02 `.blend` SHA differs across machines as expected, but
material02's own geometry hash is bit-identical to the accepted `b4086bbd…`). The re-derived scene
is `/home/user/expansion-authoring/odaraia-rework/material02/odaraia-material02.blend`; review
sheet in the session scratchpad `odar/odaraia-review-sheet.png`. Production (rig ≈406 bones,
18 clips, bakes, LOD, export to `/home/user/expansion-authoring/odaraia-rework/v3-candidate/`) is
running as an agent on `production-plan03.md`; the parent then runs `package-expansion.mjs`,
`add-anchors.mjs`, `docs/creature-intake.md`, and does the renderer work the plan names
(`cambrianFeeding` extras rather than a species case in `FEEDING_PERFORMANCE`; shell
transparency through `settleTranslucency()` in `src/render/translucency.ts`). If the session dies
mid-way, the agent's files are `rework-v3/rig_v3.py`, `evidence_v3.*`, `validate_v3.py`,
`anchors_v3.json`; check which exist and resume from the last one.

**Bothriolepis**: material01–04 re-derived through `rework-v3/build_material0N-linux.py`, copies of
the frozen scripts with the prior-stage `.blend` hash constant replaced and each stage verified by
value (its own invariants) rather than by hash. The M04 close-up diagnostic is running; on its
report the parent judges the forehead/nuchal shading and writes the M05 brief.

Blocked on the user, unchanged: **Coccosteus** (candidate07's two evidence files exist only on the
Mac — drop the two GLBs into the repo to unblock, see `rework-v3/RESUME-CANDIDATE07-BLOCKED.md`),
**Doryaspis** (the mouth-position call in `rework-v3/root-review-clay01.md`).

Comparison sheets from this pass live in the session scratchpad (`*-port/*sheet.png`) and die
with it; the shipped portraits in `public/assets/devonian/creatures/` are the durable record.

## Bothriolepis M04 diagnostic judged — 12 September, night

The diagnostic (`rework-v3/diagnostic_m04_closeup.py`, results under
`/home/user/devonian-authoring/bothriolepis/rework-v3/diagnostic-m04-closeup/`) settled the hold.
The nuchal seam is geometry: stacked relief fields make a faceted notch with a geometric-normal
step of 76.7° at y≈−0.31 on the dorsal midline and 50–53° at y≈−0.35 on the flanks, against a
median of 1.6–7.4° elsewhere. The rostral cap is smooth in the mesh and only lacks the shield atlas
response (slot 7). The forehead microrelief amplitude is .041 (bump .18 × variance .226). M05
brief: resolve the nuchal band into one smooth field (target: no step above 15° on those lines),
give slot 7 a continuous fine response through a valid chart, halve the bump to ≈.08 and break the
row organisation; preserve topology, protected vertices, the M04 oral correction and the
appendages. An agent is running M05 → production `build_v3.py` (28-joint rig, 18 actions, anchors,
full/LOD, finalize, package, eye audit, portraits) → sheet at scratchpad `both/`; the parent
integrates with `integrate.sh`. The full Linux chain clay02 → M01–M04 reproduced every recorded
invariant exactly (oral roundoff bit-identical); only the `.blend` container hashes differ.

## 13 September, small hours — Bothriolepis shipped, Odaraia built and waiting on one write

**Bothriolepis V3** shipped and merged: M05b resolved the whole shield grid (step excess over the
section form 7.4°/9.9°, from 82°/94°; the absolute 15° target was unreachable because the
accepted rear crest itself turns 62.6° in one step, so excess over the form is the enforced
number), the rostral cap takes its fine response from the shared rest-space field, microrelief
halved. `build_v3.py` rigs it with V2's twelve bones and clips; eye audit 96.1/95.3.

**Odaraia V3** is built: `rework-v3/rig_v3.py` … `export_v3.py` (406 bones, 18 clips, 130,184 /
49,878 tris, JOINTS_0 uint16, 267 validation checks), the feeding contract in the scene extras
(`cambrianFeeding` aperture .045, pickup offset .18 — measured under the runtime's own CCD), and
16 sockets in `anchors_v3.json`. Verified in the real renderer (Playwright against a `vite preview`
of `dist/` with the candidate copied in): all clips load, no errors. Two renderer findings, both
fixed in `src/render/translucency.ts`: (1) a BLEND material whose alpha is per vertex (COLOR_0 VEC4)
with material opacity 1 was being flipped to opaque by the "blended but fully opaque" shortcut, so
the shell hid the animal; it now stays translucent when the mesh carries vertex alpha or an alpha
map. (2) The depth pre-pass twin drew at opaque order 0, before the interior; it now draws at
`BODY_ORDER` so the trunk and limbs inside are painted first and the shell blends over them. The
jellies have no opaque part, so nothing changes for them. The bake's alpha floor (.31) reads as
tinted water under a plain alpha blend, so `shell_alpha_v3.py` remaps the shell's vertex alpha
a → a^0.6 (idempotent, recorded in the primitive's extras); the shell reads a little pale-teal in
the game against the olive of the Cycles study — `GAMMA` there is the one number to tune.

The remaining step writes into `public/assets/creatures/`, which the session's auto-mode
classifier refuses ("Modify Shared Resources") twice. Everything it needs is in
`tools/creatures/odaraia/rework-v3/integrate_v3.sh`: backup, copy, anchor manifest swap, package,
add-anchors, select + studio renders (`studio_render_v3.py`), cards, sizes, clear the queue entry,
`check --strict`, eras, typecheck. Run it, look at the viewer, commit the files it names.

Now blocked on the user only: Odaraia (the write), Coccosteus (candidate07's GLBs), Doryaspis
(the mouth call). Everything else in `docs/model-queue-plan.md` is shipped and on `main`.
