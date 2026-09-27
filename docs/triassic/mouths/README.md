# Aimed mouth cuts

Mouth files exported from the viewer's mouth editor (`docs/viewer-mouth.md`), one per body, aimed
by hand on the **built** Triassic model each one names. They are hand-offs: a builder may read the
hinge and the plane straight off the file instead of measuring, or read the numbers as a review —
*the hinge belongs this far back, the line rises this much*. Nothing in the game reads them, and
until 22 September 2026 no build did either — **Cartorhynchus' builder was the first that does**,
and Birgeria's and Aphaneramma's followed it (T3D-38, 27 September 2026), and Hybodus' (T3D-39, the
same day).

These are accepted by the consumer against the body each names — **except the four a builder has
since read**, Cartorhynchus, Birgeria, Aphaneramma and Hybodus:

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
the bounding box the document measured on that file: worst disagreement 6e-08 units on
Cartorhynchus' body three units long, 1.2e-07 on Birgeria's, 1.5e-08 on Aphaneramma's and 5.3e-08 on
Hybodus', five units long. The rows keep the numbers each was aimed with and say where the cut went; the consumer now
refuses Birgeria's (body `070441275bbb…`) and Aphaneramma's (`ff9138761391…`) on the hash, as it does
Cartorhynchus', and now Hybodus' (body `d00d0baa5039…`), and that refusal is the record of the cut
having been taken.

| Body | Hinge depth | Back from the nose | Pitch | Yaw | Roll | Mandible | Aimed on sha256 | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aphaneramma | 1.2445 | 24.9% | +16.2° | −17.5° | −10.5° | 1,240 of 13,446 (9.2%) | `ad7ebb007e3c…` | **built on** |
| Atopodentatus | 0.6932 | 13.9% | −6.2° | 0° | 0° | 3,102 of 14,865 (20.9%) | `eacc9ccda3f5…` | accepted |
| Birgeria | 0.4974 | 9.9% | +32.1° | +2.8° | −11.1° | 731 of 13,287 (5.5%) | `134d7f01fd21…` | **built on** |
| Cartorhynchus | 0.2647 | 8.8% | +15.4° | −1.0° | −1.0° | 220 of 12,188 (1.8%) | `da116683099b…` | **built on** |
| Hybodus | 0.5504 | 11.0% | +19.3° | −0.5° | −2.0° | 314 of 13,223 (2.4%) | `ba434d91d347…` | **built on** |
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

**Birgeria's and Aphaneramma's rows replaced earlier aims too** (Birgeria 0.4926 back, +25.4°,
−0.1° yaw, −12.7° roll, 788 mandible vertices; Aphaneramma 1.1917 back, +15.4°, −16.8° yaw,
−10.8° roll, 1,177), both re-aimed on the bodies they were then shipping, and both builders now cut
on them exactly as Cartorhynchus' does: the plane and the hinge read straight off the file, the frame
asserted against the document's bounding box, the mouth line read on the body's own measured
centreline `cx`, the jaw joint seated on the aimed hinge line at that centreline, and the mouth
closed by the cut's own rim (`T.cap_cut` over the hinge wall, then `T.cap_mouth` along the mouth
line, each half domed into itself). The oral lining and the hinge envelope both bodies carried are
retired with the cut they were fitted to. Two things about them are worth knowing:

- **Birgeria**'s reviewer seated the hinge 0.0006 of a body off the builder's measured centreline,
  while the head's own bounding-box middle, which the file also records, stands 0.016 from both —
  the head is not centred on its box. The aimed line runs up to 0.026 of a body *under* the
  generation's modelled slit at the back of the mouth and 0.004 over it at the snout, and the hinge
  sits 0.0075 behind where the slit peters out.
- **Aphaneramma** is aimed with all three angles turned, and the yaw is the point: the snout is long
  and turned, and the old cut was a curve of y that could not carry a term in x at all. Its
  generation stands with the right forelimb tucked forward under the snout, which the two
  half-spaces take in — the editor's own stated limit — so the builder keeps its limb guard on top
  of the document's rule, and bounds the mandible to the head as well, because a hinge wall yawed
  17.5° leans back across one cheek as far as the shoulder.
- Both hinge axes carry the plane's roll (and on Aphaneramma its yaw): 9.9° and 22.6° off the
  frame's x. The jaw still turns about x, as every rig in the era does — the audits read the gape
  as the jaw's own local rotation and a jaw bone rolled onto the aimed axis reads its own rest
  offset as a gape — so the pivot is the reviewer's and the axis is the era's, and the difference is
  recorded in each `validation.json`.

**Hybodus** is the fourth, and the first whose builder also re-weights the whole head round the
cut (T3D-39): the owner asked that the geometry not break at the jaw, so the jaw's weight is one
function of position in this document's own frame (`T.jaw_field_aimed`), continuous everywhere but
across the plane ahead of the hinge wall — the cut — where the caps close it. Two things about the
file: the plane runs *under* the generation's modelled slit the whole way (0.0035 raw at the snout,
0.0141 at the back), and the hinge handle stands 0.0206 raw to one side of the head's measured
centre, which the file's own `head.lateralMid` agrees with to 0.001 raw — this head sits 0.02 raw
off the trunk's line after the builder's unbend — so the joint is on the aimed hinge line at the
head's centre. The plane crosses two of the generation's teeth near the front of the mouth; the
rim is one closed loop per half plus those two small loops, and does not pinch.

`tools/triassic/lag.mjs` reads the hinge wall of any file a builder has consumed: a yawed or pitched
wall is not "at or behind the hinge's own station", so on these four bodies the cut is the pairs on
the document's own wall plane.

The mandible count is the editor's own, over every vertex of every mesh in the file. It is what
`npm run triassic:mouth` re-counts, so the two agreeing is the file proving it describes the body.
