# Aimed mouth cuts

Mouth files exported from the viewer's mouth editor (`docs/viewer-mouth.md`), one per body, aimed
by hand on the **built** Triassic model each one names. They are hand-offs: a builder may read the
hinge and the plane straight off the file instead of measuring, or read the numbers as a review —
*the hinge belongs this far back, the line rises this much*. Nothing in the game reads them, and
until 22 September 2026 no build did either — **Cartorhynchus' builder is the first that cuts on
one**, and Birgeria's and Aphaneramma's are the first that read one *as a review*.

These are accepted by the consumer against the body each names — **except where the body has been
rebuilt since**, which is Cartorhynchus (because its builder consumed its file), and Birgeria and
Aphaneramma (because their oral shells were re-seated):

```
npm run triassic:mouth -- docs/triassic/mouths/<id>-mouth.json
```

The check hashes the GLB on disk and re-counts the mandible over the real mesh, so a file whose
body has since changed is refused rather than silently applied to a different animal. A refusal
here is not a mistake in the file — it means the body was rebuilt after the cut was aimed. Usually
that means the cut wants aiming again on the new one; **on a cut a builder has taken in it means
the opposite**. `tools/triassic/creatures/cartorhynchus/build.py` reads its file and cuts on it, so
rebuilding the body is what *consuming* the cut looks like, and the hash the file carries is of the
body it was aimed on rather than of the body it made. **Birgeria's and Aphaneramma's builders read
their files too, and deliberately do not cut on them** — see the note below. Either way the builder
asserts the *frame* rather than the hash, against the bounding box the document measured on that
file: worst disagreement 6e-08 units on Cartorhynchus, 1.2e-07 on Birgeria and 1.5e-08 on
Aphaneramma, on bodies three and five units long. The rows below keep the numbers each was aimed
with and say where the cut went.

| Body | Hinge depth | Back from the nose | Pitch | Yaw | Roll | Mandible | Aimed on sha256 | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aphaneramma | 1.2445 | 24.9% | +16.2° | −17.5° | −10.5° | 1,240 of 13,446 (9.2%) | `ad7ebb007e3c…` | **read as a review** |
| Atopodentatus | 0.6932 | 13.9% | −6.2° | 0° | 0° | 3,102 of 14,865 (20.9%) | `eacc9ccda3f5…` | accepted |
| Birgeria | 0.4974 | 9.9% | +32.1° | +2.8° | −11.1° | 731 of 13,287 (5.5%) | `134d7f01fd21…` | **read as a review** |
| Cartorhynchus | 0.2647 | 8.8% | +15.4° | −1.0° | −1.0° | 220 of 12,188 (1.8%) | `da116683099b…` | **built on** |
| Mixosaurus | 0.7575 | 18.9% | +6.8° | 0° | 0° | 722 of 11,917 (6.1%) | `c2cade2c239b…` | accepted |
| Odontochelys | 0.4237 | 8.5% | +19.8° | +1.7° | 0° | 419 of 13,050 (3.2%) | `c455d132ba32…` | accepted |
| Shonisaurus | 1.0927 | 18.2% | +10.5° | 0° | 0° | 1,830 of 61,731 (3.0%) | `c3ce5d29967c…` | accepted |

Depths are in model units in the file's own root frame, unscaled; the share is of that body's
length. Angles compose yaw, then pitch, then roll — each reads as its own view's angle when the
other two are zero — and every file also carries the basis vectors, so a consumer never recomposes
them.

**Cartorhynchus' row replaced an earlier aim** (0.2631 back, +13.0° pitch, −1.8° yaw, hinge at
x −0.0754, 271 mandible vertices), and the interesting part of the move is the lateral one: the
reviewer brought the hinge from x −0.0754 onto x +0.0055. That is checkable, because a mouth's
lateral centre is something the body itself can be asked (CLAUDE.md's `cx`, which the two fish
ports paid for), and **the two agree**: the builder's own measured centreline stands at +0.0159 in
the file's frame at that station, so the new seat is 0.0104 off it — **0.35 % of a body length and
4 % of the head's half width** — where the seat it replaced was 0.0905 off, 3.0 % of a body. The
builder reads the file for the plane and seats the mouth line on `cx` regardless; what the
agreement buys is that nobody has to choose between them.

**Birgeria's and Aphaneramma's rows both replaced an earlier aim** (22 September 2026), and both
builders now **read** their file, fit the frame to it and record what they disagree with it about in
`validation.json`'s `aimedCut` — and both deliberately keep cutting on their own measured line.
That is a measurement rather than a preference, and it is the same measurement on both animals:
a lining fitted to one mouth line does not close an aperture cut on another. Cut on the aimed
planes, `gape-solid.py` reads **2,130 px of `opened by culling`** at Birgeria's full gape against
**417** on its own slit's line, and **4,229** at Aphaneramma's against **0** on its painted line's.
Building the shells about the generation's own reading while cutting on the plane recovered about
half of Birgeria's (3,511 → 2,130) and no more.

What closes a mouth cut where a human aimed it is the cut's **own rim** — `T.cap_cut` and
`T.cap_mouth`, which is why Cartorhynchus was ported to the cap on the day it took its aimed cut.
Neither of these two has been ported, and until they are the aimed file is the *other* use this
page names for these documents: a review. The port is T3D-32's rollout; `oral-verdicts.md` already
carries Birgeria as its remaining work.

**Aphaneramma** is aimed with all three angles turned (−17.5° of yaw and −10.5° of roll on a
+16.2° line), and the yaw is the whole point of the file: that snout is long and *turned*, the
builder's own reading was a painted line taken as one height per station across a head that is not
square to the frame, and a term in x is a thing no curve of y can carry — `T.bisect_on_curve`
shears the head by −seam(y), so the old cut could not express the yaw even in principle. It is also
the body whose band cut put an arm into the lower-jaw shell (CLAUDE.md, a part cut onto another
bone's shell); that guard is unchanged and sits on top of the document's own rule, which is
exactly the editor's own stated limit — a paddle tucked forward under the snout falls inside the
two half-spaces. **Birgeria** takes only 5.5% of its vertices onto the mandible on a +32.1° line —
a fish's mouth is the easy case and the steep line is the animal, not a slip; the reviewer's line
runs up to 0.026 raw under the generation's own modelled slit at the back of the mouth (0.34 of the
head's local half depth) and 0.004 over it at the snout, and puts the hinge 0.0075 of a body behind
where the slit peters out, which is the difference between the lip the generation drew and the
joint the jaw turns about.

The mandible count is the editor's own, over every vertex of every mesh in the file. It is what
`npm run triassic:mouth` re-counts, so the two agreeing is the file proving it describes the body.
