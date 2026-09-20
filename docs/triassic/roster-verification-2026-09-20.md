# Triassic roster verification — 20 September 2026 (T3D-17)

A verification sweep over the shipped GLBs in `public/assets/triassic/creatures/` — the 27 bodies in
`tools/triassic/shipped.json`, Archelon and Mosasaurus among them — after T3D-12 and T3D-14. Every
row is a number measured off the packaged file or a render of it, never a README's claim; where a
figure is a builder's own record it says so. The measuring scripts live in the gitignored workbench
(`local/verify/`: `measure.mjs`, `joints.mjs`, `blades.mjs`, `attacks.mjs`, `eyes.mjs`,
`gape-run.mjs`, `views.py`) and are reproducible from the description of each column; the renders
they rest on are under [`verification/`](verification/).

Verdicts: **OK**, **fixed here**, or **recorded as T3D-nn** (a pending, unclaimed ledger row in
[`3d-work-status.md`](3d-work-status.md)). Body length `L` is the packaged body's longest bounding
extent (the game normalises by it); "%" of `L` means a fraction of that. Phases are fractions of the
clip's duration.

## Part A — the owner's 15 September viewer list

| # | Animal | What was seen | Measurement | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Keichousaurus | Swim read as swimming in reverse | **Wave direction**: lateral signal of each spine joint cross-correlated with the joint ahead of it over `Swim` (33 phases): `tail_02..tail_06` lag +3, +3, +3, +3, +2 phases behind the joint ahead (amplitudes 2.0 → 7.5 % of L), `Sprint` +2/+3/+3/+3/+3/+2 — the wave travels head → tail on every tail joint. **Paddle push**: the fore-paddle tips move *backward* while extended (forward travel while beyond mean extension: `Swim` −0.13 / −0.18 L, `Sprint` −0.08 / −0.23 L; covariance of forward velocity with extension negative on both) — the stroke pushes water backward relative to travel. Hind paddles hold (0.00 / +0.01). Stills: [Swim top 0.00](verification/keichousaurus-Swim-0.00-top.jpg), [0.25](verification/keichousaurus-Swim-0.25-top.jpg). | OK |
| 2 | Cartorhynchus | One front fin mushed rather than moving as a whole | Kabsch rigid fit per frame over the vertices each fore-blade bone dominates, RMS residual over L, worst phase of `Sprint`: L `upper` 3.06 % / `mid` 3.70 % / `tip` 4.20 %; R 3.22 % / 3.93 % / 5.15 %. Whole chain: L 2.21 %, R 3.18 % (`Swim` 1.72 / 2.59 %). Rest shape is mirror-symmetric (mirrored-L→R nearest vertex mean 0.50 % L, max 1.24 %), swept angles identical L/R (537° per `Sprint` cycle), but the R chain carries 18 % more weight (1358 vs 1150) and blends 232 of it into `chest` against 60 on the L — the right blade is pulled by the trunk more than the left. Both blades deform more than any other fore limb in the roster (next highest whole-chain: Odontochelys 1.79 %, Archelon 1.69 %). Stills: [Sprint 0.84 front](verification/cartorhynchus-Sprint-0.84-front.jpg), [top](verification/cartorhynchus-Sprint-0.84-top.jpg), [0.63 three-quarter](verification/cartorhynchus-Sprint-0.63-threequarter.jpg). | recorded as **T3D-18** (with the gape leak in Part B) |
| 3 | Ceratites, Phragmoteuthis | Attacks read as rearing back / retreating | Mean arm-tip position along the forward axis, relative to rest, over L. **Ceratites** `Attack`: −2.4 % at phase 0.16 then **+7.8 % at 0.50**, back to 0; `Bite` −1.6 % → +5.9 %; `Grab` −2.2 % → +7.4 %; the attack anchor (`arm_02_04`) reaches 14.4 % L forward on `Attack`, 10.7 % on `Bite`. `Heavy` is −22.1 % and never forward — that clip is the builder's *Withdraw* (`build.py`: "this animal's move is literally called Withdraw") and reads as a retreat because it is one. **Phragmoteuthis** `Attack` −2.2 % at 0.125 then +4.3 % at 0.53; `Bite` −1.9 → +4.5 %; `Heavy` −2.6 → +4.4 %; `Grab` −2.2 → +4.5 %; the attack anchor (`arm_04_06`) reaches 2.9–4.3 % L forward, 15–18 % total displacement (the arm curls rather than extends). Net forward on every attack, with a short rear-back first; Phragmoteuthis' reach is a twentieth of a body — a grab, not a hit, but a short one. Stills: [Ceratites Attack 0.15](verification/ceratites-Attack-0.15-side.jpg) / [0.50](verification/ceratites-Attack-0.50-side.jpg) / [Heavy 0.50](verification/ceratites-Heavy-0.50-side.jpg); [Phragmoteuthis Attack 0.12](verification/phragmoteuthis-Attack-0.12-side.jpg) / [0.53](verification/phragmoteuthis-Attack-0.53-side.jpg). | OK (Ceratites; `Heavy` is by design). Phragmoteuthis' 4 % reach recorded as **T3D-23** |
| 4 | Helicoprion | Idle/Guard shut, Eat opens then closes fully, whorl inside when shut | The generation arrived gaping and the bind pose carries it: the shut pose is 23.49° of jaw rotation from the bind (`validation.json` `restingGape`), and every opening below is measured *from that shut pose*, signed about the opening axis. `Idle` max 1.15°, `Guard` 1.15° — shut. `Eat` starts 0.00°, opens to 58.8° at phase 0.40, ends 0.00° — opens and closes fully. `Bite` 51.8°, `Attack` 46.3°, `Heavy` 53.2°; `Swim` holds 24.9° (the builder's ram-feeding verdict). `Bite` begins at 23.5° open rather than shut (its first frame is the bind gape). Whorl: the builder's record is 0.952 of 709 whorl vertices under the palate at the shut pose, worst protrusion 0.0089 raw — and that shut pose is *defined* as the largest rotation that keeps 0.95 of the whorl under the palate, so the mouth does not close to the lip: the renders at [Idle](verification/helicoprion-Idle-0.00-head.jpg) and at the end of [Eat](verification/helicoprion-Eat-1.00-head.jpg) (identical) show the front of the mouth still open with the whorl's crowns standing out below the snout, and [Eat 0.40](verification/helicoprion-Eat-0.40-head.jpg) the full gape. "Mostly inside" is true of the vertices (95 %) and not of the picture: what shows is the part that is not. Strict-cull gape at all six opening shots: 0 px. | jaw angles OK; the whorl showing through the shut mouth's front gap recorded as **T3D-23** (with `Bite`'s open first frame) |
| 5 | Aphaneramma | A leg left behind; swim a waddle | **Lag** (mean travel of the skin within 0.75 of the lower-limb length around each foot joint, over the joint's own travel, summed over 33 phases): `Swim` fore L 1.03 / R 1.13, hind L 1.05 / R 1.08; `Sprint` 1.03 / 1.13 / 1.04 / 1.08; `Crawl` 1.04 / 1.05 / 1.05 / 1.09. Every foot travels with its joint (the fault was 0.45 on `fore_foot_R`). **Stroke**: limb-root swept angle per `Sprint` cycle fore 539°, hind 581° (`Swim` 446° / 482°); tips travel 0.11–0.15 L fore-aft against 0.08–0.13 L across, so it is a reach-and-pull rather than a sideways waddle; the body wave is small (tail_07 11.7 % of L at the tip, ≤2 % on the trunk) and travels tailward (+1 on `tail_01..02`, 0 lag beyond, i.e. the tail beats as one). Stills: [Sprint 0.25 top](verification/aphaneramma-Sprint-0.25-top.jpg), [0.75 top](verification/aphaneramma-Sprint-0.75-top.jpg), [side](verification/aphaneramma-Sprint-0.25-side.jpg). | OK |
| 6 | Mystriosuchus, Tanystropheus | Feet skinned | Lag ratios: Mystriosuchus `Swim` hind 0.99 / 1.04, fore 1.02 / 1.00; `Sprint` 0.99 / 1.04 / 1.04 / 1.05; `Crawl` 0.98 / 1.04 / 1.05 / 1.09. Tanystropheus `Swim` fore 1.02 / 1.02, hind 1.00 / 1.00; `Sprint` 1.03 / 1.03 / 1.00 / 1.00; `Crawl` 1.02 / 0.98 / 1.00 / 1.00. Stills: [Mystriosuchus Sprint top](verification/mystriosuchus-Sprint-0.25-top.jpg), [Tanystropheus Sprint top](verification/tanystropheus-Sprint-0.25-top.jpg). | OK |
| 7 | Archelon | Shell rigid | Rigid-fit RMS residual of the 2,746 `shell`-dominated vertices over every one of 22 clips: worst 0.21 % of L (`Dodge`), 0.10–0.15 % on the swims and attacks — rigid. (Ceratites' coil, for comparison, 0.21 % worst at `Guard`.) Stills: [Sprint top](verification/archelon-Sprint-0.50-top.jpg), [Dodge side](verification/archelon-Dodge-0.50-side.jpg). | OK |
| 8 | Hybodus, Saurichthys | Look like their generations | Both builders *unbend* the generation before binding (Hybodus 1.185× longer after straightening, 33° of measured dorsal drift; Saurichthys 1.068×, 15°), so a silhouette IoU against the raw file measures the straightening as much as the likeness: PCA-aligned side/top IoU Hybodus 0.63 / 0.61, Saurichthys 0.77 / 0.75 (Nothosaurus, whose flippers are posed out in the raw, 0.59 / 0.84). The likeness is judged on the renders instead: [Hybodus rest side](verification/hybodus-rest-side.jpg) / [top](verification/hybodus-rest-top.jpg) against [raw side](verification/hybodus-raw-side.jpg) / [top](verification/hybodus-raw-top.jpg); [Saurichthys rest side](verification/saurichthys-rest-side.jpg) / [top](verification/saurichthys-rest-top.jpg) against [raw side](verification/saurichthys-raw-side.jpg) / [top](verification/saurichthys-raw-top.jpg). The pale hinge spike and bloated shoulder of the 15 September bodies are gone (T3D-12A's cut caps replaced the plug; Part C lists no plug on either). Saurichthys' right pectoral chain sits off its fin, see Part B3. | OK on likeness; Saurichthys' right pectoral recorded as **T3D-21** |
| 9 | Askeptosaurus | Unwound; backup selectable | Shipped body is straight (`Swim` skull yaw −0.6 ± 0.4°, tail wave +1 lag at every joint `tail_03..11`). Stations along the forward axis over the body's own length: `tail_00` at 0.632 → **tail 0.632** of length (builder records 0.632); skull joint 0.935, `neck_00` 0.840, `chest` 0.817 → head + neck 0.16–0.18. The canonical (`canonical/askeptosaurus.png`, measured with `pose-proportions.py`, 1581 px long): hind-flipper root at 0.38 of the horizontal extent and the tail drawn rising diagonally, so tail ≈ 0.62–0.63 of the animal's own path and head + neck ≈ 0.19 (fore-flipper root at 0.19). Model and canonical agree to a hundredth on the tail and within 0.03 on the neck. Backup: `src/content/triassic/backup-models.json` lists `assets/triassic/creatures/askeptosaurus.backup.glb` (present, 1 file) and `catalogue.ts` puts it on the *Model* control as **Backup Model**. Stills: [rest side](verification/askeptosaurus-rest-side.jpg), [top](verification/askeptosaurus-rest-top.jpg). | OK |
| 10 | Every body | Model portraits published; roster shows them | `node tools/triassic/publish-portraits.mjs --check`: "27 shipped bodies' portraits published and current". `<id>.card.png`, `.select.png`, `.thumb.png` exist for all 27 ids (Archelon and Mosasaurus included); the game's `assets.defaultPortraits` is that folder, so the roster draws the published renders and never the canonical painting. Placodus' set re-rendered here after its rebuild. | OK |
| 11 | Shonisaurus | Eyes forward / up | Re-measured from the shipped GLB against its own 2048² albedo: painted eye = darkness-weighted centroid of the darkest 8 % of head-flank vertices within three globe radii of each globe, above the jaw line. L: painted − globe = −0.29 % of head length forward, −1.70 % up, 2.1 % apart (0.56 globe radii); R: +0.49 % forward, −0.83 % up, 1.6 % apart (0.43 radii). Globe centres 0.0125 units (0.21 % L) inside the nearest skin; 79 % / 86 % of the globe surface under the skin (T3D-14 recorded 77 % / 81 % by its own method, 0.0022 raw inside — the same seat). Still: [head](verification/shonisaurus-head-side.jpg). | OK |
| 12 | Nothosaurus | Head straight | Yaw of the snout tip about the skull joint against the trunk axis (`chest` → `tail_00`) at rest: **−0.24°** (T3D-14 recorded −0.29°); pitch −1.4°; `Swim` holds the head at −2.95 ± 0.01° yaw (the clip's steady head, unmoving). For the same instrument across the roster: Askeptosaurus −0.6°, Helicoprion −0.5°, Shonisaurus +0.1°, Hupehsuchus +1.1°; Keichousaurus +12.5°, Macrocnemus +15.3°, Hybodus −10.4°, Cartorhynchus −10.1°, Birgeria +11.3° — these five read off an asymmetric snout-tip vertex and are not head turns until measured better (a PCA head axis was tried and is meaningless on short deep heads). Still: [rest top](verification/nothosaurus-rest-top.jpg). | OK |

## Part B — the four measurable checks, every body

### B1 — mouth interior at full gape (`tools/triassic/gape-solid.py`, strict cull)

Every opening clip of every jawed body, each at its own measured peak opening (phase of maximum
signed jaw rotation from the shut pose, 33 phases); backdrop test `r > .90, g < .20, b > .90`;
tolerance 12 px seen *through* the body. Cells are `through / opened-by-culling / backdrop-in-both`.
The two cephalopods have no opening clip and no mouth drawn: `gape-solid.py` and `gape-crown.py` are
moot on them (measured and recorded so by T3D-02a / T3D-12B).

| Body | Shots (clip@s: through/opened/honest) | Worst | Verdict |
| --- | --- | ---: | --- |
| Aphaneramma | Ability@0.35 0/0/0 · Attack@0.42 0/1/1 · Bite@0.10 0/0/0 · Eat@0.38 0/0/0 · Grab@0.10 0/0/0 · Heavy@0.55 0/0/1 | 0 | OK |
| Archelon | Attack@0.47 1/43/2165 · Bite@0.11 0/48/1 · Eat@0.40 0/49/2 · Grab@0.10 0/40/0 · Heavy@0.60 2/47/0 | 2 | OK |
| Askeptosaurus | Attack@0.27 0/4/0 · Bite@0.15 0/2/0 · Eat@0.40 0/1/0 · Grab@0.28 0/0/0 | 0 | OK |
| Atopodentatus | Ability@0.63 0/3/0 · Attack@0.52 0/0/464 · Bite@0.10 0/2/0 · Eat@0.45 0/2/0 · Grab@0.10 0/6/0 · Heavy@0.41 0/0/0 | 0 | OK |
| Birgeria | Ability@0.47 0/122/0 · Attack@0.42 0/9/0 · Bite@0.13 1/159/0 · Eat@0.38 0/107/0 · Grab@0.10 0/10/1 · Heavy@0.55 0/78/1 | 1 | OK |
| Cartorhynchus | Ability@0.15 **29**/42/0 · Attack@0.38 **30**/41/0 · Bite@0.10 **47**/59/0 · Eat@0.35 **51**/61/0 · Grab@0.09 1/7/0 · Heavy@0.47 0/52/0 | 51 | **FAIL** — a sliver at the corner of the mouth on four clips ([Eat marked](verification/cartorhynchus-Eat-0.35-gape-opened.png)); recorded as **T3D-18** |
| Ceratites | — | — | moot (no mouth drawn) |
| Coelophysis | Ability@0.53 0/5/1 · Attack@0.13 0/5/1 · Bite@0.20 0/5/1 · Eat@0.35 0/0/1 · Grab@0.63 0/5/0 · Heavy@0.14 0/4/0 · SnapLeft@0.17 0/9/0 · SnapRight@0.17 0/6/0 | 0 | OK |
| Cymbospondylus | Ability@0.38 0/94/0 · Attack@0.47 13/110/0 · Bite@0.16 0/126/0 · Eat@0.45 10/135/0 · Grab@0.10 0/0/1 · Heavy@0.61 **15**/169/0 | 15 | **FAIL by 3 px** — slivers at the hinge corner ([Heavy marked](verification/cymbospondylus-Heavy-0.61-gape-opened.png)); recorded as **T3D-19** |
| Dinocephalosaurus | Ability@0.44 0/6/80 · Attack@0.47 1/11/56 · Bite@0.19 0/8/35 · Eat@0.27 0/9/2 · Grab@0.28 0/9/68 · Heavy@0.64 2/10/102 · NeckStrike@0.74 2/9/112 | 2 | OK |
| Helicoprion | Ability@0.13 0/0/94 · Attack@0.13 0/0/99 · Bite@0.23 0/0/99 · Eat@0.40 0/0/99 · Grab@0.83 0/0/111 · Heavy@0.14 0/0/96 | 0 | OK ([Eat culled](verification/helicoprion-Eat-0.40-gape-culled.png): a closed generation with the whorl in the open mouth) |
| Henodus | Ability@0.14 **35**/35/0 · Attack@0.13 **53**/114/187 · Bite@0.23 **64**/107/1 · Eat@0.40 **37**/37/1 · Heavy@0.14 **66**/143/658 | 66 | **FAIL** — the pixels lie along the hanging upper denticle fringe's own tooth edges (one-sided sheets of the generation, [Heavy marked](verification/henodus-Heavy-0.14-gape-opened.png)), not a hole through the head; not traced ray by ray here; recorded as **T3D-19** |
| Hupehsuchus | Ability@0.53 0/173/0 · Attack@0.47 0/0/0 · Bite@0.14 0/71/0 · Eat@0.40 0/10/0 · Grab@0.10 0/0/1 · Gulp@0.57 0/152/0 · Heavy@0.60 0/0/0 | 0 | OK |
| Hybodus | Ability@0.50 76/349/22 · Attack@0.44 **517**/517/129 · Bite@0.17 6/6610/164 · Eat@0.40 180/3033/30 · Grab@0.83 81/2070/25 · Heavy@0.53 **525**/525/135 | 525 | over tolerance on the recorded generation defect: T3D-12A traced `Attack`/`Heavy`'s 497/343 px to the opercular slit behind the corner of the mouth; `Bite`, the mouth's own verdict, is 6. `Eat`/`Grab`/`Ability` (180/81/76) were not shot before and are in the same strip ([Attack marked](verification/hybodus-Attack-0.44-gape-opened.png)) | OK on the mouth; defect stands as recorded |
| Keichousaurus | Ability@0.14 0/54/0 · Attack@0.13 0/57/0 · Bite@0.23 0/62/0 · Eat@0.40 0/61/2 · Heavy@0.14 0/67/0 | 0 | OK |
| Macrocnemus | Ability@0.53 0/26/2 · Attack@0.13 3/46/0 · Bite@0.20 0/79/0 · Eat@0.35 4/56/0 · Grab@0.63 0/21/2 · Heavy@0.14 4/56/0 · Snatch@0.24 0/140/1 | 4 | OK |
| Mixosaurus | Ability@0.28 0/70/0 · Attack@0.33 0/76/3 · Bite@0.09 0/72/0 · Eat@0.30 0/77/0 · Grab@0.09 3/44/0 · Heavy@0.45 0/70/1 | 3 | OK |
| Mosasaurus | Ability@0.28 0/0/0 · Attack@0.44 0/0/1 · Bite@0.11 0/4/0 · Eat@1.35 0/0/0 · Grab@0.83 0/0/0 · Heavy@0.56 0/0/0 | 0 | OK |
| Mystriosuchus | Ability@0.52 0/0/1 · Attack@0.42 0/0/2 · Bite@0.10 0/0/0 · Eat@0.38 0/0/0 · Grab@0.10 0/0/0 · Heavy@0.56 0/0/0 · SnapLeft@0.28 0/0/0 · SnapRight@0.28 0/0/0 | 0 | OK |
| Nothosaurus | Ability@0.13 0/198/0 · Attack@0.13 0/207/2 · Bite@0.23 0/230/0 · Eat@0.40 0/184/0 · Heavy@0.14 0/494/0 | 0 | OK |
| Odontochelys | Attack@0.47 0/32/0 · Bite@0.11 4/196/0 · Eat@0.43 1/131/0 · Grab@0.10 1/28/2 · Heavy@0.55 1/43/0 | 4 | OK |
| Phragmoteuthis | — | — | moot (no mouth drawn) |
| Placodus (rebuilt here) | Ability@0.14 7/7/148 · Attack@0.13 11/11/731 · Bite@0.23 6/9/5 · CrushBite@0.26 10/10/418 · Eat@0.40 **19**/19/179 · Heavy@0.14 0/12/2 · Pry@1.93 0/0/0 | 19 | **FAIL by 7 px on `Eat`** — the same mandible-front-cap silhouette T3D-12A recorded at 10 on `CrushBite`/`Bite`, at a clip it did not shoot; geometry byte-identical to the previous file (30 of 30 mesh and clip hashes equal, only the renamed teeth differ) so this is pre-existing ([Eat marked](verification/placodus-Eat-0.40-gape-opened.png)); recorded as **T3D-19** |
| Rhaeticosaurus | Ability@0.24 0/174/0 · Attack@0.47 0/177/0 · Bite@0.11 0/175/0 · Eat@0.40 0/176/0 · Grab@0.10 0/176/1 · Heavy@0.60 0/0/18956 | 0 | OK (`Heavy`'s 18,956 honest px is the head turned away with the gape open to the backdrop in both passes) |
| Saurichthys | Ability@0.38 0/5/20 · Attack@0.34 0/4/14 · Bite@0.16 1/116/3 · Eat@0.38 4/114/19 · Grab@0.83 4/115/33 · Heavy@0.41 0/2/13 | 4 | OK (T3D-12A: 1/1/2) |
| Shonisaurus | Attack@0.25 **22**/1201/12 · Bite@0.15 11/733/53 · Eat@0.60 9/13/2 · Heavy@0.33 6/1863/28 | 22 | over by 10 px at `Attack`'s measured peak (T3D-14 shot `Attack@0.5` and saw 0): the marked pixels run along the upper tooth row at the commissure ([Attack marked](verification/shonisaurus-Attack-0.25-gape-opened.png)), the class T3D-14 recorded as the generation's own tooth-crown slivers and chose not to author over; not ray-traced here, so it is listed in **T3D-19** for the trace rather than passed on the record |
| Tanystropheus | Ability@0.47 0/4/12 · Attack@0.16 1/6/25 · Bite@0.23 5/12/14 · Eat@0.45 0/3/1 · Grab@0.69 0/5/170 · Heavy@0.15 1/9/17 · SnapLeft@0.21 0/13/30 · SnapRight@0.21 5/12/30 | 5 | OK |

### B2 — mouth cut against the lip contour

These are the builders' own records (`validation.json`, `mouth.method` / `mouthCutDeviation` /
`mouthCut`), harvested rather than re-measured: re-reading a lip line needs the intake surface and
albedo the builder had, and the question this table answers is *which feature each method found*.
Deviations are raw units (the generation is 1.0 long), so raw ≈ fraction of body length.

| Body | Feature the cut follows (method) | Cut vs measured line | Note |
| --- | --- | --- | --- |
| Aphaneramma | painted line, continuous curve under a jump penalty (no slit modelled) | 0.0010 raw (a straight cut would be 0.0028, 9 % of local radius) | OK |
| Archelon | modelled cavity: head-vertex normals cast back (25 hits, restricted to the head; the front-third default finds the paddle-to-plastron gap) | a straight cut would deviate 0.0003 | OK |
| Askeptosaurus | modelled lip (T3D-01 record: per-station left/right disagreement 0.0002–0.0019) | not recorded as one figure | OK (0 px gape) |
| Atopodentatus | modelled cavity (634 vertices at a 0.020 gap), mid height per station | 0.0041 raw (straight: 0.0075, 18 % of local radius) | OK |
| Birgeria | modelled cavity (79 rostrum vertices), cross-checked against the painted line | 0.0 (straight: 0.0161) | OK |
| Cartorhynchus | modelled cavity, a shallow groove of 26 snout vertices | 0.00017 raw | OK |
| Ceratites, Phragmoteuthis | authored on the crown axis; no cut | — | OK |
| Coelophysis | **albedo per station, then a flat cut at the median** (shore kit) | **0.0617 raw = 6.3 % of L** at the worst station; per-station readings range 0.15–0.78 of the section height | the readings disagree with each other by half a head, so the median cut is a guess through them; recorded as **T3D-20** |
| Cymbospondylus | modelled cavity (normals cast 0.030 raw) | 0.0 (straight: 0.0007) | OK |
| Dinocephalosaurus | painted lip on a closed snout (no cavity; the albedo method) | not recorded as a figure | OK (T3D-12B, 0–3 px gape with no lining at all) |
| Helicoprion | modelled cavity of a gaping generation, closed by 23.49° | not recorded as a figure | OK |
| Henodus | modelled cavity (normals cast 0.020 raw), cut follows the inner mandible | not recorded as a figure | OK (T3D-02c) |
| Hupehsuchus | albedo light/dark boundary (no cavity; 6 rostrum hits) | 0.0039 raw (straight: 0.0023) | OK |
| Hybodus | modelled cavity; head sheared onto the measured curve so the cut lands on it | 0.0 by construction (curve vs straight 0.0015) | OK |
| Keichousaurus | **the darkest row within the pale zone** (the countershading trap, avoided) | seam unchanged from T3D-12B's record | OK |
| Macrocnemus | albedo per station, flat median cut (shore kit) | **0.0304 raw = 3.1 % of L**; readings 0.?–0.66 | recorded as **T3D-20** |
| Mixosaurus | albedo boundary (1 rostrum hit geometrically) | 0.0014 raw (straight: 0.0017) | OK |
| Mosasaurus | geometric crossing count (four crossings = jaws apart); no pigment read | a straight cut would deviate 0.0103 (15 % of local radius) | OK |
| Mystriosuchus | painted line, continuous curve | 0.0007 raw (straight: 0.0022, 19 % of local radius) | OK |
| Nothosaurus | plane fitted to the modelled slit on both flanks (T3D-14) | residual mean ±0.0009 per flank, RMS 0.012 | OK |
| Odontochelys | modelled cavity (106 vertices at a 0.012 gap) | 0.0038 raw (straight: 0.0020) | OK |
| Placodus | modelled cavity (193 vertices, normals cast 0.030 raw), seam at mid height | shipped seam error −0.0022…+0.0060 raw per station | OK |
| Rhaeticosaurus | painted line as a continuous curve (3 geometric hits) | 0.0012 raw (straight: 0.0019) | OK |
| Saurichthys | modelled cavity, head sheared onto the measured curve | 0.0 by construction (curve vs straight 0.0021) | OK |
| Shonisaurus | modelled gape of a closed generation; no oral geometry | not recorded as a figure | OK (T3D-14) |
| Tanystropheus | albedo per station, flat median cut (shore kit) | 0.0116 raw = 0.9 % of L | OK-ish; same instrument as **T3D-20** |

### B3 — dash and swim limb motion

Total swept angle per cycle at each limb root (sum of successive local-rotation deltas over 33
phases, closed loop), from the packaged clip; the lag ratio (B-A5) alongside for every foot; the
rigid residual of each fore blade. "Paddler" is any reptile or amphibian whose limbs are its stroke.

| Body | `Sprint` sweep fore / hind (°) | `Swim` | Foot lag `Sprint` (fore L/R, hind L/R) | Verdict |
| --- | --- | --- | --- | --- |
| Aphaneramma | 539 / 581 | 446 / 482 | 1.03 1.13 1.04 1.08 | paddles |
| Archelon | 421 / 247 | 341 / 199 | 1.04 1.02 1.06 1.04 | paddles (fore) |
| Askeptosaurus | 61 / 36 | 37 / 22 | 1.00 0.98 0.99 0.99 | tail swimmer: tail tip 12.0 % of L, wave +1 at every joint |
| Atopodentatus | 557 / 516 | 428 / 395 | 1.04 1.04 1.03 1.05 | paddles |
| Birgeria | pectoral 72 | 49 | pec 0.93 0.96 | fish; tail 14.6 % |
| Cartorhynchus | 537 / 333 | 436 / 271 | 0.92 0.98 0.98 1.02 | paddles (see A2) |
| Coelophysis | 49 / 142 | 37 / 105 | 1.07 1.00 1.02 1.12 | shore runner; swim is a tail beat (46 % at `tail_09`) |
| Cymbospondylus | 121 / 71 | 57 / 33 | 0.93 0.94 0.96 0.99 | ichthyosaur; tail 22 % |
| Dinocephalosaurus | 138 / 138 | 92 / 92 | 1.02 0.99 1.00 1.05 | paddles moderately; tail 20 % |
| Helicoprion | pectoral 38, pelvic 50 | 25 / 32 | pec 1.03 0.99 | fish |
| Henodus | 131 / 131 | 110 / 110 | 1.03 1.02 1.02 1.05 | paddles |
| Hupehsuchus | 81 / 47 | 56 / 33 | 1.00 0.95 1.01 1.10 | tail 21 % |
| Hybodus | pectoral 39, pelvic 51 | 25 / 32 | pec 0.81 0.96 | fish |
| Keichousaurus | 219 / 120 | 163 / 89 | 0.99 1.00 1.02 1.00 | paddles (see A1) |
| Macrocnemus | 68 / 129 | 50 / 96 | 1.06 1.06 **0.88** 1.04 | shore runner; `hind_foot_L` lags its joint by 12 % where every other foot is 1.0 |
| Mixosaurus | 79 / 46 | 55 / 33 | 0.94 0.94 0.98 0.99 | ichthyosaur; tail 15 % |
| Mosasaurus | 241 / 189 | 189 / 147 | 1.06 1.04 1.05 1.00 | paddles + tail 19 % |
| Mystriosuchus | 252 / 277 | 166 / 182 | 1.04 1.05 0.99 1.04 | paddles; tail 19 % |
| Nothosaurus | 91 / 41 | 63 / 29 | 1.07 1.17 1.07 1.07 | fore-paddle rower, tail 22 % |
| Odontochelys | 468 / 444 | 365 / 346 | 1.08 1.15 1.09 1.10 | paddles |
| **Placodus** | **35 / 34** | 24 / 23 | 1.03 1.01 1.06 1.05 | the limbs barely move (a tenth of Henodus', a fifteenth of Aphaneramma's); the tail does the work (30.7 % of L at `tail_06` in `Sprint`). Recorded as **T3D-22** |
| Rhaeticosaurus | 499 / 431 | 383 / 330 | 1.01 1.01 1.01 1.02 | paddles |
| Saurichthys | pectoral 32, pelvic 38 | 12 / 14 | pec L 1.23, **R: no skin within reach** (see below) | fish |
| Shonisaurus | pectoral 11, pelvic 6 | 7 / 4 | 1.08 1.03 0.96 0.93 | ichthyosaur; tail 16 % |
| Tanystropheus | 80 / 226 | 57 / 162 | 1.03 1.03 1.00 1.00 | hind-paddled, tail 18 % |
| Ceratites, Phragmoteuthis | — (fins 155° / 35°) | — | — | jet and fins |

**Joint seating** (`joints.mjs`: for every joint, the nearest vertex it dominates and the nearest of any).
Saurichthys' right pectoral chain sits off its fin: `pec_tip_R` is 3.58 % of L from the nearest skin
vertex at all (`pec_tip_L` 1.67 %), `pec_mid_R` 2.32 % (L 1.11 %), and the R chain dominates 126
vertices against the L's 247 — which is why the lag radius around `pec_tip_R` found no skin. Odontochelys'
`hind_upper_L/R` dominate no vertex and `hind_mid_L/R` 38 / 16 at 8.2 % of L from the nearest they own
(its hind paddles are carried by `hind_outer`/`hind_tip`). Coelophysis `neck_02/03/06`, Macrocnemus
`neck_05`, Cartorhynchus and Hybodus `caudal_upper`, Hupehsuchus both caudals, Saurichthys `caudal_lower`,
Ceratites `funnel`, Phragmoteuthis `arm_02_00`/`arm_08_00` dominate no vertex either — every one of them
still carries weight (`idle-bones --all`: every joint owns skin), so these are blend-only joints, noted
and not judged.

### B4 — attacks and anchors

Anchors read off the packaged nodes (`survey.mjs`). Travel is `anchor_attack_primary`'s world position
against its rest position over 41 phases: forward reach (+z), rear-back (−z), lateral and total, over L.
`tools/creatures/motion/pose-check.mjs` cannot be used here: it reads a `performances/<id>.mjs` and
none of the Triassic performance files (Birgeria, Cartorhynchus, Helicoprion, Hybodus, Macrocnemus,
Nothosaurus, Saurichthys, Tanystropheus) defines an `Attack` (they are the shore gaits), so the
measurement is taken from the shipped clips directly.

| Body | mouth | mouth_inside | attack_primary | `Attack` reach / rear | `Heavy` reach / rear | Others | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aphaneramma | jaw | skull | skull | 8.4 % / −2.9 % | 11.5 % / **−18.0 %** (lat 18 %) | Ability 9.8 / −24.9 % | Heavy and Ability pull the head back further than they reach; **T3D-23** |
| Archelon | jaw | skull | skull | 5.1 / −3.5 | 5.2 / −3.4 | Ability 20.3 | OK |
| Askeptosaurus | jaw | skull | skull | 3.6 / −0.9 | 0.0 / 0.0 (disp 0.9 %) | TailWhip: anchor on the skull does not move (0.9 %) — the whip is the tail's | OK; TailWhip's weapon is unanchored, noted in **T3D-23** |
| Atopodentatus | jaw | skull | skull | 6.7 / −2.4 | 7.1 / **−33.8 %** at 0.55, then forward at 0.70 | Ability −6.2 / −11.5 | Heavy rears a third of a body back first; **T3D-23** |
| Birgeria | jaw | skull | skull | 10.1 / −2.7 | 10.1 / −2.8 | Ability 23.9 | OK |
| Cartorhynchus | jaw | skull | skull | 13.7 / −4.0 | 13.7 / −4.1 | | OK |
| Ceratites | jaw | skull | **arm_02_04** (chain) | 14.4 / −4.0 | 0 / −25.0 (Withdraw) | Bite 10.7, grasp on `arm_12_04` | OK |
| Coelophysis | jaw | skull | skull | 4.1 / −0.6 (disp 10.5) | 5.7 / −7.7 | Snaps: disp 37–39 %, lateral | OK |
| Cymbospondylus | jaw | skull | skull | 7.3 / −2.9 | 7.3 / −2.8 | | OK |
| Dinocephalosaurus | jaw | skull | skull | 1.4 / −26.8 (lat 36 %, up 25 %) | 1.3 / −37.4 (lat 41 %) | NeckStrike 0.8 / −32.0, lat 42 %, up 34 %, disp 53 % | the strikes are lateral-and-back sweeps of a neck already straight at rest: never forward of rest. Whether a sideways sweep reads as a strike or a recoil is the owner's call; **T3D-23**. Anchor on the skull is right for a neck that strikes with its head |
| Helicoprion | jaw | skull | skull | 6.4 / −1.8 | 5.7 / −3.0 | | OK |
| Henodus | jaw | skull | skull | 6.4 / −1.9 | 5.2 / −3.3 | | OK |
| Hupehsuchus | jaw | skull | **jaw** | 10.2 / −3.8 | 9.7 / −4.0 | Gulp 12.6 | OK — the pouch gulp is the mandible's |
| Hybodus | jaw | skull | skull | 8.3 / −2.6 | 10.6 / −3.2 | | OK |
| Keichousaurus | jaw | skull | skull | 8.8 / −3.8 | 7.0 / −5.2 | | OK |
| Macrocnemus | jaw | skull | skull | 6.7 / 0.0 | 9.9 / −6.4 | Snatch 6.6 | OK |
| Mixosaurus | jaw | skull | skull | 11.2 / −3.9 | 11.3 / −3.9 | | OK |
| Mosasaurus | jaw | skull | skull | 10.0 / −3.0 | 13.5 / −3.0 | Ability 25.0 | OK |
| Mystriosuchus | jaw | skull | skull | 6.4 / −2.4 | 14.2 / −2.5 | Snaps lateral 28–30 %, −20 % | OK |
| Nothosaurus | jaw | skull | skull | 5.2 / −0.9 | 4.1 / −3.9 | | OK |
| Odontochelys | jaw | skull | skull | 5.3 / −1.4 | 7.3 / −1.7 | | OK |
| Phragmoteuthis | jaw | skull | **arm_04_06** (chain) | 2.9 / −6.0 (disp 15.6) | 4.0 / −8.9 | Bite 4.3, grasp on `arm_03_06` | reach is 3–4 % of L; **T3D-23** |
| Placodus | jaw | skull | skull | 5.8 / −1.6 | 4.6 / −3.1 | CrushBite disp 11.6, Pry 22.4 | OK |
| Rhaeticosaurus | jaw | skull | skull | 2.1 / −4.2 (lat 19 %) | 1.0 / **−14.4 %** (lat 21 %) | Ability 19.8 | Heavy pulls back and never reaches; **T3D-23** |
| Saurichthys | jaw | skull | skull | 6.9 / −5.0 | 9.3 / −6.0 | | OK |
| Shonisaurus | jaw | **jaw** | skull | 4.2 / −1.0 | 6.2 / −1.5 | | `anchor_mouth_inside` is on the jaw, not the skull — the one body in the roster; the sim reads it as a point, so it works, but it swings with the mandible. Noted in **T3D-23** |
| Tanystropheus | jaw | skull | skull | 0.8 / −1.8 (disp 20.9, lat 17 %) | 0.2 / −11.6 (lat 34 %) | Snaps: −47.5 %, lat 44 %, disp 70 % | as Dinocephalosaurus: lateral sweeps of a straight neck; **T3D-23** |

## Part C — the oral classifier and the skin table

### Every mesh `ORAL_GEOMETRY` hides (`node tools/triassic/hidden-parts.mjs`)

120 hidden meshes across the 27 bodies' authored, twin and LOD files. On the authored bodies:

| Body | Hidden (node [material], vertices) | Oral fill? |
| --- | --- | --- |
| Aphaneramma, Archelon, Atopodentatus, Birgeria, Cartorhynchus, Cymbospondylus, Henodus, Hupehsuchus, Keichousaurus, Mixosaurus, Mosasaurus, Mystriosuchus, Odontochelys, Rhaeticosaurus | `Oral cavity lining` [`<Animal> mouth interior`] (200–816 v) + `Seated jaw hinge tissue` [`<Animal> jaw hinge body`] (207 v) | yes — palate/floor shells and the hinge plug |
| Coelophysis, Macrocnemus, Tanystropheus | `Oral cavity lining` [mouth interior] (200 / 280 / 240 v) + `Seated jaw hinge tissue` [`<Animal> body pigmentation`] (86 v) | yes — the shore kit's plug wears the body material and is hidden by its name |
| Askeptosaurus | `Oral cavity lining` (288 v) | yes |
| Dinocephalosaurus | `Seated jaw hinge tissue` (207 v) only | yes (no lining by verdict) |
| Hybodus, Saurichthys | `Mouth lining` [`<Animal> mouth lining`] (336 v) | yes — the palate/floor shells of T3D-12A |
| Nothosaurus | `Nothosaurus oral lining` [mouth interior \| jaw hinge body] (722 v) | yes — shells and the two rigid hinge halves in one mesh |
| Placodus | `Oral cavity lining` (308 v) — **and, before this sweep, `Palate crushing teeth` [`Placodus crushing teeth`] (210 v)** | the teeth were **not** fill: `palate` matched the name and the game drew the lower crushing plates without the upper ones |
| Ceratites, Phragmoteuthis, Helicoprion, Shonisaurus | nothing | — |

Drawn on every body: the authored body, its lower jaw, and the tooth rows / fangs / eyes where a
builder authored them (Coelophysis, Macrocnemus, Tanystropheus, Dinocephalosaurus, Placodus,
Shonisaurus' six eye parts). **Fixed here**: Placodus' upper teeth are renamed `Upper crushing teeth`
in `build.py` and the triplet rebuilt — geometry, weights and every clip byte-identical to the shipped
file (30 of 30 hashes), the one mesh renamed; `audit.mjs --package --decode` (paired audit exact),
`oral-shell-audit.mjs placodus` (separate closed rigid shells), fresh review renders, contact sheets,
delivery record, portraits and asset sizes; `hidden-parts.mjs --check` refuses the previously shipped
file ("Palate crushing teeth is hidden by the oral classifier but is named as anatomy") and passes the
new one, and it now runs inside `npm run triassic` so the next such name fails the gate.

### Skin table (`skin-tears.mjs`, 17 phases, every clip; worst skin edge ratio, and the clip it is in)

| Body | Skin | Clip / bone | Clips >2× | Against CLAUDE.md's last table |
| --- | ---: | --- | ---: | --- |
| Askeptosaurus | 1.10× | — | 0 / 24 | new body (T3D-01) |
| Shonisaurus | 1.44× | — | 0 / 21 | same |
| Keichousaurus | 2.34× | | 2 / 23 | same |
| Cymbospondylus | 2.48× | | 1 / 23 | same |
| Mosasaurus | 2.54× | | 4 / 22 | same |
| Rhaeticosaurus | 2.81× | | 6 / 23 | same |
| Nothosaurus | 2.99× | | 4 / 22 | 2.98× (T3D-14 recorded 2.99× with `Walk`) |
| Tanystropheus | 3.00× | | 2 / 29 | same |
| Macrocnemus | 3.41× | | 9 / 27 | was 2.94× (T3D-09c's separate shells) |
| Birgeria | 3.46× | | 10 / 24 | same |
| Hupehsuchus | 3.47× | | 4 / 23 | was 5.79× (T3D-02b) |
| Saurichthys | 3.61× | | 5 / 24 | same |
| Mixosaurus | 3.62× | | 4 / 23 | same |
| Cartorhynchus | 3.72× | | 12 / 24 | same |
| Archelon | 3.86× | | 19 / 22 | same |
| Atopodentatus | 3.90× | | 5 / 23 | not in the table |
| Aphaneramma | 4.43× | | 16 / 23 | 4.45× |
| Mystriosuchus | 4.48× | | 18 / 27 | same |
| Henodus | 4.81× | | 14 / 24 | same |
| Odontochelys | 5.12× | `Sprint` / `tail_00` | 20 / 23 | not in the table |
| Phragmoteuthis | 5.37× | `Guard` funnel | 16 / 21 | as T3D-12B |
| Hybodus | 5.93× | | 10 / 24 | same |
| Dinocephalosaurus | 7.00× | `Sprint` / `chest` | 14 / 24 | same |
| Ceratites | 7.73× | `Guard` / `arm_09_04` | 16 / 21 | not in the table |
| Coelophysis | 7.74× | `SnapRight` / `skull` (2,426 edges) | 22 / 29 | was 4.46× — the hard snaps stretch the skull–neck skin (T3D-09b's record; T3D-15's business) |
| Placodus | 12.36× | `Pry` / `fore_paddle_L` | 19 / 25 | same |
| Helicoprion | **14.33×** | `Flop` / `pec_upper_R` | 18 / 22 | was 11.68× (`Parry`); `Flop` is the shore gait `gaits.mjs` added after that table and tears the pectoral root harder |

Nothing in this sweep changed a skin figure but Placodus' (unchanged at 12.36×, the rebuild being
byte-identical). `idle-bones.mjs --all`: 34 bodies, every joint owns skin.

## What this sweep does not claim

A count of pixels at one side-on camera per clip is what `gape-solid.py` measures; it does not see a
mouth that merely reads badly, and the cephalopods are outside it. The lag, sweep and rigid-fit
numbers are on the packaged clips as the game plays them; whether a motion *reads* right is the
renders' job and the owner's. B2 is the builders' own records. Nothing here was measured on a
builder's intent.
