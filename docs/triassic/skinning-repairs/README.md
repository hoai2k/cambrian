# Eight skinning and geometry repairs, before and after

Each plate is **before on the left, after on the right**, rendered from the decoded packaged GLB
with CYCLES on the CPU, framed identically for both so the difference is the body and not the
camera. They are here rather than in `public/` because they are a review record, not an asset.

| Plate | The fault, and the number that says so |
| --- | --- |
| [hybodus-side](hybodus-side.png) | A `Seated_jaw_hinge_tissue` plug whose along-body radius took the large factor — 1.97 units of radius on a five-unit animal — and whose containment test was built on `np.interp`, which clamps outside its own table rather than refusing. It reported a clearance of **+0.004** with **126 of its 207 vertices outside the animal**, standing 1.29 units clear of the nose. Nothing else was wrong with this shark: hiding one mesh gives the generation back exactly. |
| [saurichthys-threequarter](saurichthys-threequarter.png) | The same plug, from the same two lines, on the same intake code. The pale slab over the gills is it. |
| [aphaneramma-swim](aphaneramma-swim.png) | The right forelimb was **cut into the lower-jaw shell** — 411 of the 637 vertices round `fore_foot_R`, rigid on `jaw` at weight 1 and out of reach of any weighting. That foot's skin travelled **0.45** of the distance its own joint did in `Swim`, where every other foot on the animal is 1.04 to 1.11. After: 1.17. |
| [mystriosuchus-swim-from-below](mystriosuchus-swim-from-below.png) | The same cut on the same line: 317 of 693 vertices, `fore_foot_R` following at **0.58**, now 0.98. |
| [tanystropheus-feet-in-swim](tanystropheus-feet-in-swim.png) | The third shore animal, and the only one neither repair ever reached: no `K.measure_radii`, and `K.bind` left at its default four relaxation passes where Coelophysis and Macrocnemus were taken to fourteen. The toes draw out into needles as the foot swings. Worst skin **6.09x → 3.00x**, edges torn past 2x in `Sprint` **1,252 → 28**. |
| [cartorhynchus-forefin-in-sprint](cartorhynchus-forefin-in-sprint.png) | A paddle that is the animal's *engine* skinned with the marine kit's defaults for a fin that only steers: the 55th-percentile inner radius, a constant inter-joint blend wider than the whole tip segment, and a seat covering the proximal 0.42 of the chain. Worst skin **5.17x → 3.72x**, torn edges **2,411 → 419**; the blade stops ballooning at the elbow. |
| [archelon-shell-in-a-turn](archelon-shell-in-a-turn.png) | 456 of 2,665 shell-dominant vertices carried limb weight and 48.6 % of the shell band carried limb, neck, tail or chest weight. The exactly-rigid core is now 2,307 vertices rather than 1,662 and measures **0.000 %** departure from one rigid body. **This plate is the honest one**: the two frames differ by 172 pixels of 880,000, because the carapace was already close to rigid in practice. The contamination was real; it was not what a viewer was seeing. |
| [mosasaurus-belly-stud](mosasaurus-belly-stud.png) | A conical stud of the generation's standing off the ventral flank between the flippers, 0.063 units proud where the body's own median local high-pass is 0.003. Collapsed rather than cut — `smooth-region.py`'s constrained Laplacian, in the builder — to a 20 % residual. |

## Reproducing a plate

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/<id>/build.py
node tools/triassic/creatures/<id>/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/<id>/render.py -- --portraits
```

The "before" halves are the bodies as they stood at `7fcf720`.
