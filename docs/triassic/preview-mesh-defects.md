# Defects in the raw Tripo preview bodies

What a reviewer sees in the specimen viewer when the *Body* control is on **Generated mesh**: extra
fins, spare tails, a floating flake beside one animal, a sliver beside another's neck, and two
animals missing altogether. This records which of those have been fixed, which cannot be fixed by
script and why, and which are not defects at all.

These are **preview** bodies. Every one of them is discarded the day the animal's real body ships
(`tools/triassic/preview-bodies.mjs` retires the whole entry), so nothing here is a defect in a
delivered asset. It matters because these meshes are what the Tripo generations will be *built
from*, and a body built from a mesh with three fins too many starts with three fins too many.

## The measurement, and the first one that was wrong

`tools/triassic/preview-debris.py` splits each preview into connected components and reports each
one's size and position. The first run said Atopodentatus had **117 components** with the largest
at 5% of the mesh, and every other body looked similarly shattered.

That was the instrument, not the animals. A raw Tripo body is not one welded mesh — it arrives as
dozens of unstitched surface patches, so counting connected components on it measures the
generator's triangulation. Placodus' own builder welds 11,515 vertices to 9,578 for exactly this
reason. Welding first (0.0005 at the roughly-one-unit scale these arrive in) gives the real answer:

**19 of the 21 preview bodies are a single connected piece.** Two are not.

That single fact decides everything below. A separate floating component can be deleted safely
because nothing else touches it. A fin that shares vertices with the body cannot: cutting it out
means deciding where the body ends, which is sculpting, and a script guessing at that would do more
damage than the fin does.

## Fixed

| Animal | What it was | Size |
|---|---|---|
| **Askeptosaurus** | a detached flake floating beside the flank | 94 verts, 0.98% of the mesh |
| **Tanystropheus** | a detached sliver beside the neck | 114 verts, 1.17% of the mesh |

Both were genuinely separate components and are gone. The originals are untouched in
`tools/triassic/creatures/<id>/tripo-raw/<id>.raw.glb`; the cleaned meshes were re-published with
`npm run triassic:previews`, which refreshed their hashes in the manifest. Before/after renders in
side and top view confirm nothing else changed.

## Cannot be fixed here — these are welded into the body

Each of these is part of the single connected surface, so removing it is surgery, not filtering.
The route is a **regeneration** (or, where the pose is also wrong, a redraw first).

| Animal | Reported | Status |
|---|---|---|
| **Atopodentatus** | three fins on the underside that should not be there | welded |
| **Rhaeticosaurus** | two extra tail blades either side of the real tail, in addition to its four correctly placed flippers | welded — and see below |
| **Askeptosaurus** | an extra fin on the belly (separate from the flake, which is fixed) | welded |
| **Phragmoteuthis** | an extra fin on top | welded |
| **Birgeria** | a second dorsal fin, where the research says "single dorsal set far back" | welded |
| **Mixosaurus** | a deeply forked lunate fluke it should not have | welded |
| **Helicoprion** | pelvic and anal fins, against *Fadenia*'s "no pelvic fins" | welded, **and in the greenlit pose** — needs a redraw, not just a regeneration |

**Rhaeticosaurus has two separate problems, not one.** A first pass here guessed that the "two
extra tails" were its over-long flippers read from above. That guess was wrong, and a top-down
render settles it: the animal has **four flippers in their proper places** — a forelimb pair and a
hindlimb pair, spread laterally — and *then*, at the rear, **three tail blades where there should
be one**: a central tail with a further blade either side of it. The extra pair grows from the tail
root, not from the hips, and is nothing to do with the limbs.

So both findings stand independently: the spare tails recorded here, and the flipper proportions
recorded in `docs/triassic/proportion-audit.md` (each flipper 0.36 of a body length clear of the
flank, span 1.00 L, against about 0.25 L for a plesiosaur forelimb). The tails are a generation
defect; the flipper length is drawn that way in the pose, so that one needs a redraw first.

## Not defects

**Mystriosuchus and Aphaneramma are missing because they were never generated.** They are the only
two animals on the roster with a greenlit canonical pose and no Tripo body at all — Nothosaurus and
Shonisaurus also have no preview, but only because they have shipped and their previews retired on
schedule. Nothing is broken; the generations do not exist. They cannot be reviewed, built or
compared until someone makes them, and they are the first thing to ask Tripo for.

## What would unblock the welded ones

Automatic detection cannot separate an unwanted fin from a wanted one — both are the same surface,
and only a human knows which is which. What a script *can* do is act precisely on a region a human
points at. A selection tool in the specimen viewer — circle or paint the offending geometry on the
model, export the vertex region, and let a builder cut exactly that — turns every row in the
welded table from "needs a regeneration" into "needs thirty seconds of pointing". That is the
cheapest way to clear this list, and it reuses the machinery sculpt mode already has.
