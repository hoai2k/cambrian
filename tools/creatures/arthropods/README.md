# Original animated arthropods

`build.py` creates the Odaraia, Sidneyia, Leanchoilia and Isoxys meshes, UVs,
vertex pigmentation, anatomical armatures, all required animations, cards,
inspection renders and editable Blender sources. `lod.py` creates genuine
approximately 43–46% triangle-count distant models while preserving skinning and every clip.

Run in Blender 5.2 with 4 worker threads:

```sh
blender -b -t 4 --python tools/creatures/arthropods/build.py
blender -b -t 4 --python tools/creatures/arthropods/lod.py
```

The authoring directory defaults to sibling `../expansion-authoring/arthropods`
and can be changed using `CAMBRIAN_AUTHORING`. Output goes to
`public/assets/creatures`. Every run writes per-animal JSON containing
triangle counts, frame counts, timing, finite skinning checks, sampled pose
bounds and endpoint seam measurements. Sources are Z-up/-Y-forward, exports
Y-up/+Z-forward. Root remains fixed; only rotations and body translation are
animated. There is no animated scaling. Game movement supplies travel.

Surface detail combines species vertex pigments, ImageGen cuticle albedo in
`../textures/chitin-albedo.png`, existing project's cuticle normal map
(copied here to make the authoring reproducible), and modeled ridges,
setae, joint collars and fine eye facets. UV shells remain separate per
material during GLB export to preserve Blender 5's vertex color output.

## Anatomy and animation intent

These are fossil-informed original meshes, not museum meshes. Color and
combat behavior are artistic reconstructions. The body plans follow ROM's
current species descriptions:

- [Odaraia alata](https://burgess-shale.rom.on.ca/fossils/odaraia-alata/):
  open tubular bivalved shell, 47 fine segments/limb pairs, enormous eyes,
  three small median eye spots, **three** tail fins. The hypothesized
  inverted swimming orientation places filtering limbs upwards and the
  dorsal tail blade downwards. `Ability` increases internal filtering beats
  and steers with the tail; attacks are feeding surges, never invented claws.
- [Sidneyia inexpectans](https://burgess-shale.rom.on.ca/fossils/sidneyia-inexpectans/):
  broad head and nine broad thoracic plates, three narrow abdominal rings,
  gnathobases on nine walking limb pairs, posterior five fringed swimming
  exopods, paired tail flaps and central telson. `Crawl` and `Swim` are both
  present. `Heavy`, `Eat` and `Ability` bring the front limb bases inward
  with offset crushing beats; the feet retain visible articulation.
- [Leanchoilia superlata](https://burgess-shale.rom.on.ca/fossils/leanchoilia-superlata/):
  11 serrated trunk plates with paired dorsal ridges, four eyes, jointed
  great appendages each bearing three claws and independent articulated
  sensory flagella, fringed exopods and lanceolate tail. `Ability` sweeps
  its sensory array; attacks fold the graspers towards its feeding groove,
  with delayed motion traveling through each whip.
- [Isoxys acutangulus](https://burgess-shale.rom.on.ca/fossils/isoxys-acutangulus/):
  equal rounded valves, prominent anterior/posterior cardinal spines,
  lateral eyes, five-part frontal raptors with stout endites and 13 paired
  biramous swimming limbs. `Ability` holds an interception posture with
  active paddling and raptor movements; `Heavy` has a visible wind-up
  followed by an inward grasp.

All four have Idle, Swim, Attack, Hit, Death, TurnLeft, TurnRight, Dive, Rise,
Bite (15 frames), Heavy (33), Guard (30), Parry (10), Dodge (12), Eat (24),
Stagger (36), Ability (36) and Moult (45). Sidneyia adds Crawl (60).
Idle/Swim/Crawl/Guard/Eat/Ability/Moult loop. All one-shots except Death return
to neutral endpoints; Death progressively banks, curls and relaxes limbs.
All abilities are 1.2-second held loops; the game owns effect duration.

Validation: run `python3 tools/creatures/arthropods/verify.py` before optional
meshopt compression. This checks actual encoded skin weights, root/scale
samples, endpoint seams, embedded textures and every animation name.
LOD review welds sphere poles before QEM reduction to avoid collapsing
volumes at disconnected coincident vertices. The resulting LODs were
reimported and rendered separately for visual verification.

## Game packaging

After authoring validation, run the consolidated
`node tools/creatures/package-expansion.mjs odaraia sidneyia leanchoilia isoxys`.
It applies lossless meshopt buffer compression to the detailed files, keeping
all actions and textures. Shipping LODs retain only Idle/Swim/Crawl/Death and
vertex pigments; their existing reduced geometry is unchanged. The authoring
`.blend` and uncompressed LOD backups still contain every clip and texture.
The packager validates exact decoded attribute, topology, skin, graph and
animation data before replacing each file, and checks original-roster hashes.
Reports are saved under `../expansion-authoring/packaging/packaging.json`.

## Anatomical anchor source contract

`anchors.json` is the authoritative append-only socket manifest for these four
specimens. It contains source **Blender world bind-pose** points, not bone-local
positions: X is lateral, Z is up and -Y is anterior. The anchor packager converts
`[x,y,z]` to glTF `[x,z,-y]`, transforms into the named parent's bind-local space,
and adds sockets to both full and LOD files without changing meshes or rigs.
`anchor_mouth_inside` has role `swallow`; other roles are mouth/attack/grasp.
The generic primary strike aliases the creature's left contact, while paired
attack sockets permit concurrent independently animated contacts.

Mouth sockets lie on the anatomical ventral feeding surface, with swallow
sockets just inside the same head/body tissue. They are deliberately separate
from frontal eyes, antenna tips, cardinal spines and grasping extremities:

- **Odaraia:** because the animal swims inverted, the ventral mouth lies on the
  upward-facing head surface at `(0,-1.57,0.205)`. Swallow proceeds inward/down
  to `(0,-1.54,0.11)`. Attack sockets follow the tips of the first left/right
  filter limbs; the grasp-role socket marks the central particle-retention
  corridor. These filter contacts have **no CCD chain**: they are not invented
  grasping jaws. Existing filter animations move their sockets naturally.
- **Sidneyia:** the mouth lies under the cephalon at `(0,-1.52,-0.168)`.
  Attack sockets sit at actual inward-pointing gnathobase tooth tips on the
  first thoracic limb pair, using only each proximal coxa bone as the solver.
  Grasp sockets sit on the actual terminal claws of those anterior legs, with
  three-bone chains `leg_{side}_00_0` through `_2`. These are dual-purpose
  walking/food-handling limbs: only their first pair is exposed for grasp IK;
  posterior walking legs and the swimming system remain independent.
- **Leanchoilia:** the mouth lies underneath the head shield at
  `(0,-1.32,-0.176)`. Strike sockets lie on the terminal rigid middle claw,
  before its sensory whip, with `great_base_{side}`, `great_hand_{side}`,
  `claw_{side}_1_00`, `claw_{side}_1_01` as the base-to-tip CCD chain.
  Grasp sockets use the preceding rigid claw joint (`claw_{side}_1_00`) where
  prey can be held. Long flagella remain sensory follow-through and are never
  treated as prehensile bones or included in either IK chain.
- **Isoxys:** the mouth lies ventrally under the anterior body at
  `(0,-1.29,-0.221)`, attached to `segment_00`, whose mesh forms that tissue.
  Five-joint `raptor_{side}_0` through `_4` chains drive terminal strike tips.
  Grasp sockets sit on the inward-facing second endite at
  `(±0.298,-1.9315,-0.234)` and use only `_0` through `_2` to reach that contact.
  Neither the shell's cardinal spine nor its eyes are feeding sockets.

For every CCD record the ordered chain contains **feeding appendage bones
only**; `root`, `body` and all `segment_*` locomotor trunk bones are excluded.
The socket's parent matches `effectorBone`, the final chain member. Anchors
without chains may use body/segment parents to track their anatomical tissue.
