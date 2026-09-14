# Archelon

**Off the roster on purpose.** Archelon is Late Cretaceous, not Triassic, and where it belongs is
the open question in [`docs/triassic/05-mesozoic-expansion.md`](../../../../docs/triassic/05-mesozoic-expansion.md)
— widen this game, or build a fourth one. Being on `TRIASSIC_CREATURES` is what puts an animal in
the sea, in the population tables and on the pick screen, so it is listed in
`src/content/triassic/expansion.json` instead and appears only in the specimen viewer. The body is
being developed regardless; the era decision does not block it.

## The generation, and what the first attempt taught

The delivered reference (`intake/archelon-3d.jpeg`, added in `24a5996`) is a **six-panel contact
sheet** — frontal, side, dorsal, bottom-up, rear and quarter perspective, each captioned, with grid
lines and borders. Fed to Tripo whole, it produced **six turtles in one GLB**: the generator read
the sheet as a scene containing six animals rather than as six views of one, and gave each about a
sixth of the triangle budget.

That is not a quirk, it is what the pipeline already says. The Tripo input is a *single* view — see
the `inputPrompt` recorded in any `docs/triassic/canonical/model-inputs/<id>/metadata.json`:

> Single clean three-quarter front view from slightly above in a straight neutral symmetric extended
> pose, with paired appendages separated and the entire subject fully framed on flat pale neutral
> studio gray. **No water, scenery, text, labels, borders, cropping, or extra animals.**

The four-view `turnaround.png` that sits beside it is a *human review* artefact and is deliberately
never what Tripo is fed.

So the input here is the sheet's quarter-perspective panel, cropped out on its own, padded back onto
the sheet's own grey (132,132,132) so nothing is cut, and squared to 1024. It is preserved beside the
raw body as `tripo-raw/input.png`. The second generation is one turtle, 11,081 vertices and 19,058
triangles on a single body.

| | first attempt | this one |
|---|---|---|
| input | the whole six-panel sheet | the quarter-perspective panel alone |
| result | six turtles | one |
| triangles | 19,214 across six bodies | 19,058 on one |
| credits | 30 | 30 |

## What it still is

A raw generation: no skeleton, no clips, no anchors, orientation and scale not normalised. The
preview carries an **estimated** yaw of 180, on the same reading as Aphaneramma and Mystriosuchus —
the generation arrives head at −z. That estimate is redone properly when the body is cleaned and
rigged.

Under the 40,000-triangle preview limit already, so `<id>.preview.glb` is the raw body re-exported
rather than a decimation. 49 connected components before welding, which is ordinary Tripo patch soup
rather than debris (see `docs/triassic/preview-mesh-defects.md`).

## Reproducing it

    node tools/triassic/tripo/run-image-to-model.mjs --name archelon \
        --image tools/triassic/creatures/archelon/tripo-raw/input.png \
        --out local/triassic-authoring/archelon/tripo-single --submit

Generation is not deterministic, so this produces *a* body rather than *this* body; the one that
shipped is preserved unchanged in `tripo-raw/archelon.raw.glb` with its sanitized metadata beside it.
