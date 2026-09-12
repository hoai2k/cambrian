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
| Cheirolepis | **V3 fins/face reopened** — see Face pass below | `build_v3.py` — package PASS, check PASS, eye audit 82.5/82.3 (V2 80.1/79.9). Comparison sheet sent. On yes: point `build.py` at v3, package into public/, regenerate validation.json, viewer look |
| F small fixes (eldredgeops rig, manticoceras umbilicus) | **done — user approved 12 Sep, integrated, badges cleared** | Both Medium (Sonnet) jobs delivered: manticoceras `build.py` INVOL=.85 (umbilicus 30%→9.4%, aperture/anchors unchanged; INVOL=.53 reproduces the shipped shell exactly); eldredgeops `build_v3.py` blends tergite_01's front rows onto the cephalon (gap closed; antenna tips at the rolled peak left open — a choreography redesign, not a value). Both package+check PASS on candidates. Not in public/: integration into shipped assets needs the user's go, and this session's auto-mode blocks writes to public/assets anyway. Candidates rebuild in about a minute from the committed builders; eldredgeops' `validate.py` is hardcoded to v2/candidate and needs its path parameterised before its v3 can go through the normal finish |
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
| bothriolepis | material04: oral fix accepted, appearance HOLD (`rework-v3/review-material04-and-next-direction.md`) | forehead/nuchal shading defect; next is a read-only close-up diagnostic on the M04 blend, then M05 | diagnostic → M05 → rig/actions → audits → package |
| stethacanthus | not started (no rework-v3) | — | brief → clay → material → rig → audits → package |

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
