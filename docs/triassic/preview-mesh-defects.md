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

## Cut by hand, with the marking tool

Welded geometry cannot be found automatically — an unwanted fin and a wanted one are the same
surface, and only a human knows which is which. Mark mode says which (`docs/viewer-mark.md`, and
the section at the end of this page): paint the geometry, export a region pinned to the model's
hash, cut exactly that.

| Animal | Region | Cut | Result |
|---|---|---:|---|
| **Askeptosaurus** | the extra belly fin | 628 verts, 5.72% | gone; 13 rim edges left open |
| **Rhaeticosaurus** | the two spare tail blades | 361 verts, 3.26% | both gone, the real tail untouched; 34 rim edges left open |

Both cuts landed exactly where they were marked — drift 0.00000 of an allowed 0.01000 — with the
model hash verified before either ran, and both were checked before and after from side, top and
close up. The cut meshes are now the published previews; the untouched generations remain in
`tools/triassic/creatures/<id>/tripo-raw/`.

**The rims are left open**, and that is inherent rather than a bug to chase: a raw Tripo body is a
soup of unstitched patches, so the rim of a cut is a set of arcs rather than a closed loop and a
fill has nothing to span. The tool stitches the rim, fills what it can and says plainly when it
cannot. A small notch in a disposable preview is a far smaller lie than a spare tail.

## Still welded, not yet cut

Each of these is part of the single connected surface. They can be cut the same way as the two
above, or fixed properly by a **regeneration** (or, where the pose is also wrong, a redraw first).

| Animal | Reported | Status |
|---|---|---|
| **Atopodentatus** | three fins on the underside that should not be there | welded |
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

## What unblocks the welded ones, and how to use it

Automatic detection cannot separate an unwanted fin from a wanted one — both are the same surface,
and only a human knows which is which. What a script *can* do is act precisely on a region a human
points at, and that is now built: **mark mode** in the specimen viewer
(`/viewer/?specimen=<key>&mode=mark`, the *Mark region* button) paints the offending geometry onto
the generated mesh itself and exports the vertex region, and
`tools/triassic/cut-region.py` cuts exactly that and nothing else. Every row in the welded table
goes from "needs a regeneration" to "needs thirty seconds of pointing".

    # paint the fins in the viewer, export <id>-region.json, then:
    /opt/blender/blender --background --factory-startup --python tools/triassic/cut-region.py \
        -- <id>-region.json          # lands in local/triassic/cuts/, with before/after renders

The whole of it — the brush, the file's schema, what the cutter refuses and what it will not
attempt — is `docs/viewer-mark.md`. Two things it deliberately does not do: it never writes into
`public/` at all (the cut lands in the gitignored workbench, because a stray `.glb` in the creature
folder reads to `review-bodies.mjs` as a delivered body), and it does not decide anything. Whether a
cut mesh replaces the preview it came from is a human call, and Helicoprion's row is still a redraw
either way, because its pelvic and anal fins are in the greenlit pose.
