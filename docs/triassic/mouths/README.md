# Aimed mouth cuts

Mouth files exported from the viewer's mouth editor (`docs/viewer-mouth.md`), one per body, aimed
by hand on the **built** Triassic model each one names. They are hand-offs: a builder may read the
hinge and the plane straight off the file instead of measuring, or read the numbers as a review —
*the hinge belongs this far back, the line rises this much*. Nothing in the game reads them, and
until 22 September 2026 no build did either — **Cartorhynchus' builder is the first that does**.

These are accepted by the consumer against the body each names — **except the one a builder has
since read**, which is Cartorhynchus and is the first of them:

```
npm run triassic:mouth -- docs/triassic/mouths/<id>-mouth.json
```

The check hashes the GLB on disk and re-counts the mandible over the real mesh, so a file whose
body has since changed is refused rather than silently applied to a different animal. A refusal
here is not a mistake in the file — it means the body was rebuilt after the cut was aimed. Usually
that means the cut wants aiming again on the new one; **on a cut a builder has taken in it means
the opposite**. `tools/triassic/creatures/cartorhynchus/build.py` reads its file and cuts on it, so
rebuilding the body is what *consuming* the cut looks like, and the hash the file carries is of the
body it was aimed on rather than of the body it made. The builder asserts the frame instead, against
the bounding box the document measured on that file: worst disagreement 6e-08 units on a body three
units long. The row below keeps the numbers it was aimed with and says where the cut went.

| Body | Hinge depth | Back from the nose | Pitch | Yaw | Roll | Mandible | Aimed on sha256 | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aphaneramma | 1.1917 | 23.8% | +15.4° | −16.8° | −10.8° | 1,177 of 13,446 (8.8%) | `ed7d40d7ed85…` | accepted |
| Atopodentatus | 0.6932 | 13.9% | −6.2° | 0° | 0° | 3,102 of 14,865 (20.9%) | `eacc9ccda3f5…` | accepted |
| Birgeria | 0.4926 | 9.8% | +25.4° | −0.1° | −12.7° | 788 of 13,287 (5.9%) | `b8bcf8e90d58…` | accepted |
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

Two others are worth a word, because they are the cases the straight-cut builders get wrong.
**Aphaneramma** is aimed with all three angles turned (−16.8° of yaw and −10.8° of roll on a
+15.4° line): that snout is long and its generation stands with the right forelimb tucked forward
under it, which is the body whose band cut put an arm into the lower-jaw shell (CLAUDE.md, a part
cut onto another bone's shell). **Birgeria** takes only 5.9% of its vertices onto the mandible on a
+25.4° line — a fish's mouth is the easy case and the steep line is the animal, not a slip.

The mandible count is the editor's own, over every vertex of every mesh in the file. It is what
`npm run triassic:mouth` re-counts, so the two agreeing is the file proving it describes the body.
