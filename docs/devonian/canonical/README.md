# Canonical poses — Devonian

One approved image per Devonian subject, on the same terms as the Triassic's
([`docs/triassic/canonical/README.md`](../../triassic/canonical/README.md)): the **visual
contract** for that animal, and the thing its model is judged against.

The order of work here is the opposite of the Triassic's, and that is the point. The Triassic drew
a pose and generated a body from it. The Devonian's twenty-one bodies are already built and
shipped, so a pose drawn here is a statement of what the animal *should* look like, against which
the model we have is then updated. The reference viewer puts the three side by side —
the built model first, then the canonical pose, then other people's art — so a body that has
drifted from the reading we want is visible in one sweep.

Devonian models are **not** generated from these images the way the Triassic's are. They are built
in Blender from the builders under `tools/devonian/creatures/<id>/`, so a canonical pose here feeds
a builder change, never an image-to-model generation.

Files are named for the subject id in `docs/research/devonian/viewer/subjects.json`:
`dunkleosteus.png`. A subject keeps exactly one image once it is greenlit — the candidates it beat
are deleted, not shelved, because a shelf of the ones that lost is a second answer to what the
animal looks like. Git history holds them.

After adding or replacing a pose here, run `npm run devonian:viewer` so the viewer and its deployed
copy pick it up.
